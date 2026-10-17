import os
import time
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest

from .conftest import new_job


def test_parallel_signed_snapshot_does_not_block_event_loop(system):
    started = time.monotonic()
    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(
            pool.map(
                lambda path: system.admin("GET", path),
                ["/api/v1/agents", "/api/v1/networks", "/api/v1/jobs", "/api/v1/devices"],
            )
        )
    assert all(response.status_code == 200 for response in responses)
    assert time.monotonic() - started < 5


def test_concurrent_creation_respects_agent_queue_limit(enrolled):
    system = enrolled["system"]

    def create(_):
        return system.admin(
            "POST",
            "/api/v1/jobs",
            {
                "orgao_id": system.orgao,
                "network_id": enrolled["network"]["id"],
                "agent_id": enrolled["agent"]["agent_id"],
                "idempotency_key": str(uuid4()),
            },
        ).status_code

    with ThreadPoolExecutor(max_workers=5) as pool:
        statuses = list(pool.map(create, range(5)))
    assert sorted(statuses) == [202, 202, 202, 409, 409]


@pytest.mark.skipif(
    not os.environ.get("DISCOVERY_TEST_DATABASE_URL", "").startswith("postgresql"),
    reason="Validação de concorrência requer PostgreSQL isolado",
)
def test_postgres_claim_and_report_are_serialized(enrolled):
    system = enrolled["system"]
    job = new_job(enrolled)

    def claim(_):
        response = system.client.post("/agent/v1/claim", json={}, headers=enrolled["headers"])
        assert response.status_code == 200, response.text
        return response.json()["job"]

    with ThreadPoolExecutor(max_workers=2) as pool:
        claims = list(pool.map(claim, range(2)))
    assert sum(value is not None for value in claims) == 1
    claimed = next(value for value in claims if value)

    def report(_):
        response = system.client.post(
            f"/agent/v1/jobs/{job['id']}/report",
            headers=enrolled["headers"],
            json={
                "batch_id": str(uuid4()),
                "lease": claimed["lease"],
                "results": [{"ip": "127.0.0.1", "observation": {"ip": "127.0.0.1", "open_ports": [8080]}}],
            },
        )
        assert response.status_code == 200, response.text

    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(report, range(2)))
    stored = system.admin("GET", f"/api/v1/jobs/{job['id']}").json()
    assert stored["processed"] == stored["found"] == 1
