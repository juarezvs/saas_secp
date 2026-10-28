"""Simulador exclusivo de testes: nenhum equipamento físico é usado neste arquivo."""

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import httpx
import pytest

from discovery.agent import AgentRunner, Outbox, read_secret, write_secret

from .conftest import new_job


@pytest.fixture
def control_id_simulator():
    paths = []

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def do_GET(self):
            paths.append(self.path)
            content = b"<html><title>iDFace TEST SIMULATOR</title></html>"
            self.send_response(200)
            self.end_headers()
            self.wfile.write(content)

        def do_POST(self):
            paths.append(self.path.split("?")[0])
            payload = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            if self.path == "/login.fcgi":
                assert payload == {"login": "simulator-user", "password": "simulator-secret"}
                result = {"session": "SIMULATOR_SESSION"}
            elif self.path == "/system_information.fcgi?session=SIMULATOR_SESSION":
                result = {"serial": "SIMULATOR-001", "version": "TEST-1", "network": {"mac": "02:00:00:00:00:01"}}
            else:
                raise AssertionError("Operação não autorizada no simulador: " + self.path)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

    server = ThreadingHTTPServer(("127.0.0.1", 8080), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield paths
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)


@pytest.mark.asyncio
async def test_actual_tcp_probe_agent_central_persistence_and_reconnect(enrolled, control_id_simulator):
    system = enrolled["system"]
    job = new_job(enrolled)
    claimed = system.client.post("/agent/v1/claim", json={}, headers=enrolled["headers"]).json()["job"]

    class LostAcknowledgement(httpx.AsyncBaseTransport):
        def __init__(self):
            self.inner = httpx.ASGITransport(app=system.app)
            self.failed = False

        async def handle_async_request(self, request):
            response = await self.inner.handle_async_request(request)
            if request.url.path.endswith("/report") and not self.failed:
                self.failed = True
                raise httpx.ReadError("SIMULATED lost acknowledgement after commit", request=request)
            return response

    config = {
        "central_url": "http://testserver",
        "allow_insecure_transport": True,
        "state_dir": str(system.tmp_path / "agent"),
        "networks": ["127.0.0.1/32"],
        "allow_loopback": True,
        "methods": ["tcp"],
        "ports": [8080],
        "rate": 20,
        "credentials": {
            "127.0.0.1": {
                "username": "simulator-user",
                "password": "simulator-secret",
                "port": 8080,
                "protocol": "CONTROL_ID_FACE_ID",
            }
        },
    }
    agent = AgentRunner(config)
    agent.credential = enrolled["agent"]
    write_secret(agent.token_file, agent.credential)
    assert read_secret(agent.token_file) == agent.credential
    async with httpx.AsyncClient(transport=LostAcknowledgement()) as client:
        agent.client = client
        await agent.execute(claimed)
        assert len(agent.outbox.pending()) == 1  # confirmação perdida; preservada em disco
        agent.outbox.db.close()
        agent.outbox = Outbox(agent.state_dir / "outbox.sqlite")
        await agent.flush()  # reconexão/reenvio idempotente após reinicialização da outbox
        assert agent.outbox.pending() == []
    stored = system.admin("GET", f"/api/v1/jobs/{job['id']}").json()
    assert stored["state"] == "COMPLETED" and stored["found"] == stored["processed"] == 1
    devices = system.admin("GET", f"/api/v1/devices?job_id={job['id']}").json()
    assert devices["total"] == 1
    result = devices["items"][0]["payload"]
    assert result["confidence"] == "CONFIRMED" and result["serial"] == "SIMULATOR-001"
    assert set(control_id_simulator) == {"/", "/login.fcgi", "/system_information.fcgi"}
    assert "simulator-secret" not in json.dumps(devices)
    agent.outbox.db.close()


@pytest.mark.asyncio
async def test_agent_cooperates_with_cancellation_before_probe(enrolled):
    system = enrolled["system"]
    job = new_job(enrolled)
    claimed = system.client.post("/agent/v1/claim", json={}, headers=enrolled["headers"]).json()["job"]
    system.admin("POST", f"/api/v1/jobs/{job['id']}/cancel")
    agent = AgentRunner(
        {
            "central_url": "http://testserver",
            "allow_insecure_transport": True,
            "state_dir": str(system.tmp_path / "cancel-agent"),
            "networks": ["127.0.0.1/32"],
            "allow_loopback": True,
            "methods": ["tcp"],
            "ports": [8080],
        }
    )
    agent.credential = enrolled["agent"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=system.app)) as client:
        agent.client = client
        await agent.execute(claimed)
    assert system.admin("GET", f"/api/v1/jobs/{job['id']}").json()["state"] == "CANCELLED"
    agent.outbox.db.close()
