import base64
import json
import os
import time
from urllib.parse import quote
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from discovery.central import create_app
from discovery.config import Settings
from discovery.security import signature


@pytest.fixture
def system(tmp_path):
    secret = "test-only-" + str(uuid4())
    database_url = os.environ.get("DISCOVERY_TEST_DATABASE_URL", f"sqlite:///{tmp_path / 'central.db'}")
    schema = "discovery_test_" + uuid4().hex
    postgres = None
    if database_url.startswith("postgresql"):
        if make_url(database_url).database != "secp_discovery_test":
            raise ValueError("Testes PostgreSQL exigem banco exclusivo secp_discovery_test")
        postgres = create_engine(database_url)
        with postgres.begin() as db:
            db.execute(text(f'CREATE SCHEMA "{schema}"'))
        database_url += ("&" if "?" in database_url else "?") + "options=" + quote("-csearch_path=" + schema)
    settings = Settings(database_url=database_url, gateway_secret=secret, allow_loopback=True)
    app = create_app(settings, initialize=True)
    with TestClient(app) as client:
        orgao = str(uuid4())
        user = str(uuid4())

        def headers(
            method, path, payload=None, *, orgaos=None, excluded_units=None, write=True, timestamp=None, nonce=None
        ):
            body = json.dumps(payload).encode() if payload is not None else b""
            claims = (
                base64.urlsafe_b64encode(
                    json.dumps(
                        {
                            "user_id": user,
                            "orgao_ids": orgaos if orgaos is not None else [orgao],
                            "excluded_unit_ids": excluded_units or [],
                            "write": write,
                        }
                    ).encode()
                )
                .decode()
                .rstrip("=")
            )
            timestamp, nonce = str(timestamp or int(time.time())), nonce or str(uuid4())
            return {
                "Content-Type": "application/json",
                "x-discovery-timestamp": timestamp,
                "x-discovery-nonce": nonce,
                "x-discovery-claims": claims,
                "x-discovery-signature": signature(secret, method, path, timestamp, nonce, claims, body),
            }, body

        def admin(method, path, payload=None, **kwargs):
            signed, body = headers(method, path, payload, **kwargs)
            return client.request(method, path, content=body, headers=signed)

        class System:
            pass

        result = System()
        result.app, result.client, result.admin, result.headers = app, client, admin, headers
        result.orgao, result.settings, result.user, result.tmp_path = orgao, settings, user, tmp_path
        yield result
    if postgres:
        with postgres.begin() as db:
            db.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        postgres.dispose()


@pytest.fixture
def enrolled(system):
    network = system.admin(
        "POST",
        "/api/v1/networks",
        {
            "orgao_id": system.orgao,
            "name": "TEST ONLY",
            "cidr": "127.0.0.1/32",
            "ports": [8080],
            "methods": ["tcp"],
            "max_hosts": 1,
        },
    ).json()
    enrollment = system.admin(
        "POST",
        "/api/v1/agents/enrollments",
        {"name": "TEST ONLY", "orgao_id": system.orgao, "network_ids": [network["id"]]},
    ).json()
    agent = system.client.post(
        "/agent/v1/enroll",
        json={"bootstrap_token": enrollment["bootstrap_token"], "version": "1.0.0", "platform": "TEST"},
    ).json()
    system.admin("POST", f"/api/v1/agents/{agent['agent_id']}/approve")
    system.client.post(
        "/agent/v1/heartbeat", json={"version": "1.0.0"}, headers={"Authorization": "Bearer " + agent["token"]}
    )
    return {
        "system": system,
        "network": network,
        "agent": agent,
        "headers": {"Authorization": "Bearer " + agent["token"]},
    }


def new_job(enrolled, **kwargs):
    system = enrolled["system"]
    payload = {
        "orgao_id": system.orgao,
        "network_id": enrolled["network"]["id"],
        "agent_id": enrolled["agent"]["agent_id"],
        "idempotency_key": str(uuid4()),
        **kwargs,
    }
    response = system.admin("POST", "/api/v1/jobs", payload)
    assert response.status_code == 202, response.text
    return response.json()["jobs"][0]
