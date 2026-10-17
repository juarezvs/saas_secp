import time
from uuid import uuid4

from sqlalchemy import select

from discovery.central import maintain
from discovery.db import Agent, Audit, Job, Network, ObservationRow

from .conftest import new_job


def test_signed_scope_replay_and_permissions(system):
    path = "/api/v1/networks"
    assert system.client.get(path).status_code == 401
    headers, body = system.headers("GET", path)
    assert system.client.get(path, headers=headers).status_code == 200
    assert system.client.get(path, headers=headers).status_code == 401
    assert system.admin("GET", path, timestamp=int(time.time()) - 120).status_code == 401
    assert (
        system.admin(
            "POST", path, {"orgao_id": system.orgao, "name": "TEST", "cidr": "172.19.5.0/24"}, write=False
        ).status_code
        == 403
    )
    assert (
        system.admin("POST", path, {"orgao_id": str(uuid4()), "name": "TEST", "cidr": "172.19.5.0/24"}).status_code
        == 404
    )
    assert (
        system.admin("POST", path, {"orgao_id": system.orgao, "name": "TEST", "cidr": "169.254.169.254/32"}).status_code
        == 422
    )


def test_enrollment_approval_and_reuse(system):
    network = system.admin(
        "POST", "/api/v1/networks", {"orgao_id": system.orgao, "name": "TEST", "cidr": "172.19.5.0/24"}
    ).json()
    enrollment = system.admin(
        "POST", "/api/v1/agents/enrollments", {"name": "TEST", "orgao_id": system.orgao, "network_ids": [network["id"]]}
    ).json()
    payload = {"bootstrap_token": enrollment["bootstrap_token"], "version": "1.0.0", "platform": "TEST"}
    agent = system.client.post("/agent/v1/enroll", json=payload).json()
    assert agent["status"] == "PENDING"
    assert system.client.post("/agent/v1/enroll", json=payload).status_code == 401
    headers = {"Authorization": "Bearer " + agent["token"]}
    assert system.client.post("/agent/v1/claim", json={}, headers=headers).json() == {"job": None}
    assert system.admin("POST", f"/api/v1/agents/{agent['agent_id']}/approve").status_code == 200
    rows = system.admin("GET", "/api/v1/agents").text
    assert agent["token"] not in rows and "token_hash" not in rows and enrollment["bootstrap_token"] not in rows


def test_job_report_idempotency_and_history(enrolled):
    system = enrolled["system"]
    job = new_job(enrolled)
    claimed = system.client.post("/agent/v1/claim", json={}, headers=enrolled["headers"]).json()["job"]
    assert claimed["targets"] == ["127.0.0.1"]
    report = {
        "lease": claimed["lease"],
        "batch_id": str(uuid4()),
        "finished": True,
        "results": [{"ip": "127.0.0.1", "observation": {"ip": "127.0.0.1", "open_ports": [8080]}}],
    }
    path = f"/agent/v1/jobs/{job['id']}/report"
    first = system.client.post(path, json=report, headers=enrolled["headers"])
    assert first.status_code == 200, first.text
    assert system.client.post(path, json=report, headers=enrolled["headers"]).json()["duplicate"] is True
    stored = system.admin("GET", f"/api/v1/jobs/{job['id']}").json()
    assert stored["state"] == "COMPLETED" and stored["processed"] == stored["found"] == 1
    rows = system.admin("GET", f"/api/v1/devices?job_id={job['id']}").json()
    assert rows["total"] == 1
    assert system.admin("GET", f"/api/v1/devices/{rows['items'][0]['id']}").status_code == 200
    with system.app.state.sessions() as db:
        assert len(db.scalars(select(ObservationRow)).all()) == 1
        assert len(db.scalars(select(Audit)).all()) >= 3


def test_confirmed_identity_is_one_device_with_multiple_historical_observations(enrolled):
    system = enrolled["system"]
    for _ in range(2):
        job = new_job(enrolled)
        claimed = system.client.post("/agent/v1/claim", json={}, headers=enrolled["headers"]).json()["job"]
        observation = {
            "ip": "127.0.0.1",
            "open_ports": [8080],
            "manufacturer": "CONTROL_ID",
            "serial": "TEST-STABLE-001",
            "confidence": "CONFIRMED",
            "evidence": [
                {"method": "CONTROL_ID_API", "field": "serial", "value": "TEST-STABLE-001", "source": "DECLARED"}
            ],
        }
        response = system.client.post(
            f"/agent/v1/jobs/{job['id']}/report",
            json={
                "lease": claimed["lease"],
                "batch_id": str(uuid4()),
                "finished": True,
                "results": [{"ip": "127.0.0.1", "observation": observation}],
            },
            headers=enrolled["headers"],
        )
        assert response.status_code == 200
    devices = system.admin("GET", "/api/v1/devices").json()
    assert devices["total"] == 1
    detail = system.admin("GET", f"/api/v1/devices/{devices['items'][0]['id']}").json()
    assert len(detail["history"]) == 2
    assert system.admin("GET", f"/api/v1/devices?job_id={job['id']}").json()["total"] == 1


def test_agent_cannot_report_another_network(enrolled):
    system = enrolled["system"]
    job = new_job(enrolled)
    claimed = system.client.post("/agent/v1/claim", json={}, headers=enrolled["headers"]).json()["job"]
    report = {"lease": claimed["lease"], "batch_id": str(uuid4()), "results": [{"ip": "172.19.5.29"}]}
    assert (
        system.client.post(f"/agent/v1/jobs/{job['id']}/report", json=report, headers=enrolled["headers"]).status_code
        == 422
    )


def test_cancellation_and_revocation(enrolled):
    system = enrolled["system"]
    job = new_job(enrolled)
    claimed = system.client.post("/agent/v1/claim", json={}, headers=enrolled["headers"]).json()["job"]
    assert system.admin("POST", f"/api/v1/jobs/{job['id']}/cancel").json()["state"] == "CANCELLING"
    path = f"/agent/v1/jobs/{job['id']}/lease"
    assert (
        system.client.post(path, json={"lease": claimed["lease"]}, headers=enrolled["headers"]).json()["cancel"] is True
    )
    system.admin("POST", f"/api/v1/agents/{enrolled['agent']['agent_id']}/revoke")
    assert system.client.post(path, json={"lease": claimed["lease"]}, headers=enrolled["headers"]).status_code == 401
    with system.app.state.sessions.begin() as db:
        db.get(Job, job["id"]).lease_expires = time.time() - 1
        db.flush()
        maintain(db, system.settings)
    assert system.admin("GET", f"/api/v1/jobs/{job['id']}").json()["state"] == "CANCELLED"


def test_rotation_has_bounded_grace(enrolled):
    system = enrolled["system"]
    rotated = system.client.post("/agent/v1/rotate", json={}, headers=enrolled["headers"]).json()
    assert rotated["token"] != enrolled["agent"]["token"]
    assert (
        system.client.post("/agent/v1/heartbeat", json={"version": "1.0.0"}, headers=enrolled["headers"]).status_code
        == 200
    )
    with system.app.state.sessions.begin() as db:
        db.get(Agent, enrolled["agent"]["agent_id"]).previous_expires = 0
    assert (
        system.client.post("/agent/v1/heartbeat", json={"version": "1.0.0"}, headers=enrolled["headers"]).status_code
        == 401
    )
    assert (
        system.client.post(
            "/agent/v1/heartbeat", json={"version": "1.0.0"}, headers={"Authorization": "Bearer " + rotated["token"]}
        ).status_code
        == 200
    )


def test_job_deadlines_and_recovery(enrolled):
    system = enrolled["system"]
    job = new_job(enrolled)
    system.client.post("/agent/v1/claim", json={}, headers=enrolled["headers"])
    with system.app.state.sessions.begin() as db:
        row = db.get(Job, job["id"])
        row.lease_expires = time.time() - 1
        db.flush()
        maintain(db, system.settings)
    assert system.admin("GET", f"/api/v1/jobs/{job['id']}").json()["state"] == "QUEUED"
    with system.app.state.sessions.begin() as db:
        db.get(Job, job["id"]).deadline = time.time() - 1
        db.flush()
        maintain(db, system.settings)
    assert system.admin("GET", f"/api/v1/jobs/{job['id']}").json()["state"] == "TIMED_OUT"


def test_job_creation_idempotency_and_scope(enrolled):
    system = enrolled["system"]
    key = str(uuid4())
    first = new_job(enrolled, idempotency_key=key)
    second = new_job(enrolled, idempotency_key=key)
    assert first["id"] == second["id"]
    assert system.admin("GET", f"/api/v1/jobs/{first['id']}", orgaos=[str(uuid4())]).status_code == 404
    wrong = {
        "orgao_id": system.orgao,
        "network_id": enrolled["network"]["id"],
        "target": "127.0.0.2",
        "idempotency_key": str(uuid4()),
    }
    assert system.admin("POST", "/api/v1/jobs", wrong).status_code == 422


def test_idempotency_key_cannot_change_request(enrolled):
    key = str(uuid4())
    new_job(enrolled, idempotency_key=key)
    system = enrolled["system"]
    changed = {
        "orgao_id": system.orgao,
        "network_id": enrolled["network"]["id"],
        "agent_id": enrolled["agent"]["agent_id"],
        "idempotency_key": key,
        "target": "127.0.0.1",
    }
    assert system.admin("POST", "/api/v1/jobs", changed).status_code == 409


def test_agent_network_edit_rejects_active_jobs_and_cross_scope(enrolled):
    system, agent = enrolled["system"], enrolled["agent"]
    path = f"/api/v1/agents/{agent['agent_id']}/networks"
    payload = {"orgao_id": system.orgao, "name": "Edited test agent", "network_ids": [enrolled["network"]["id"]]}
    assert system.admin("POST", path, payload).status_code == 200
    new_job(enrolled)
    assert system.admin("POST", path, payload).status_code == 409


def test_validation_errors_never_echo_secrets(system):
    response = system.client.post(
        "/agent/v1/enroll", json={"bootstrap_token": "SECRET_TOO_SHORT", "version": "1.0.0", "platform": "TEST"}
    )
    assert response.status_code == 422 and "SECRET_TOO_SHORT" not in response.text


def test_polling_does_not_consume_mutation_rate_budget(system):
    for _ in range(32):
        assert system.admin("GET", "/api/v1/networks").status_code == 200
    response = system.admin(
        "POST", "/api/v1/networks", {"orgao_id": system.orgao, "name": "Budget test", "cidr": "172.19.5.29/32"}
    )
    assert response.status_code == 201


def test_inactive_unit_hidden_from_lists_details_and_jobs(enrolled):
    system = enrolled["system"]
    job = new_job(enrolled)
    unit = str(uuid4())
    with system.app.state.sessions.begin() as db:
        db.get(Job, job["id"]).unidade_id = unit
        db.get(Agent, enrolled["agent"]["agent_id"]).unidade_id = unit
        db.get(Network, enrolled["network"]["id"]).unidade_id = unit
    for path in ["/api/v1/jobs", "/api/v1/agents", "/api/v1/networks"]:
        response = system.admin("GET", path, excluded_units=[unit])
        assert response.status_code == 200 and response.json()["items"] == []
    assert system.admin("GET", f"/api/v1/jobs/{job['id']}", excluded_units=[unit]).status_code == 404
    assert (
        system.admin("GET", f"/api/v1/agents/{enrolled['agent']['agent_id']}", excluded_units=[unit]).status_code == 404
    )
