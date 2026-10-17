import argparse
import asyncio
import ctypes
import json
import logging
import os
import platform
import random
import signal
import sqlite3
import stat
import time
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

import httpx

from . import VERSION
from .local_network import interfaces
from .scanner import scan

log = logging.getLogger("secp.discovery.agent")


def protected_bytes(data, decrypt=False):
    if os.name != "nt":
        return data

    class Blob(ctypes.Structure):
        _fields_ = [("size", ctypes.c_ulong), ("data", ctypes.POINTER(ctypes.c_byte))]

    buffer = ctypes.create_string_buffer(data)
    source = Blob(len(data), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_byte)))
    target = Blob()
    crypt = ctypes.windll.crypt32
    if decrypt:
        ok = crypt.CryptUnprotectData(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(target))
    else:
        ok = crypt.CryptProtectData(
            ctypes.byref(source), "SECP discovery agent", None, None, None, 1, ctypes.byref(target)
        )
    if not ok:
        raise OSError("DPAPI indisponível para a conta do serviço")
    try:
        return ctypes.string_at(target.data, target.size)
    finally:
        ctypes.windll.kernel32.LocalFree(target.data)


def write_secret(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(payload).encode()
    if os.name == "nt":
        data = b"DPAPI\0" + protected_bytes(data)
    temporary = path.with_name(path.name + "." + str(uuid4()) + ".tmp")
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "wb") as target:
        target.write(data)
        target.flush()
        os.fsync(target.fileno())
    os.replace(temporary, path)


def read_secret(path: Path):
    if os.name != "nt" and stat.S_IMODE(path.stat().st_mode) & 0o077:
        raise PermissionError("Arquivo de credenciais precisa de modo 0600")
    data = path.read_bytes()
    if data.startswith(b"DPAPI\0"):
        if os.name != "nt":
            raise ValueError("Arquivo DPAPI exige a conta Windows original")
        data = protected_bytes(data[6:], decrypt=True)
    return json.loads(data)


class Outbox:
    def __init__(self, path):
        self.db = sqlite3.connect(path)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS reports (batch_id TEXT PRIMARY KEY, job_id TEXT NOT NULL, payload TEXT NOT NULL, created REAL NOT NULL)"
        )

    def put(self, job_id, payload):
        self.db.execute(
            "INSERT OR IGNORE INTO reports VALUES (?, ?, ?, ?)",
            (payload["batch_id"], job_id, json.dumps(payload), time.time()),
        )
        self.db.commit()

    def pending(self):
        return self.db.execute("SELECT batch_id, job_id, payload FROM reports ORDER BY created LIMIT 128").fetchall()

    def ack(self, identifier):
        self.db.execute("DELETE FROM reports WHERE batch_id = ?", (identifier,))
        self.db.commit()


class AgentRunner:
    def __init__(self, config, *, client_factory=httpx.AsyncClient):
        self.config = config
        self.client_factory = client_factory
        self.url = config["central_url"].rstrip("/")
        parsed = urlsplit(self.url)
        if parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in {"", "/"}:
            raise ValueError("URL central deve conter somente esquema, host e porta")
        if parsed.scheme != "https" and not (
            config.get("allow_insecure_transport") is True and parsed.scheme == "http"
        ):
            raise ValueError("A comunicação central exige HTTPS")
        if config.get("verify_tls", True) is False:
            raise ValueError("Não é permitido desabilitar validação TLS do serviço central")
        self.state_dir = Path(config.get("state_dir", "/data/agent"))
        self.state_dir.mkdir(parents=True, exist_ok=True)
        if os.name != "nt":
            self.state_dir.chmod(0o700)
        self.token_file = self.state_dir / "credential.json"
        self.outbox = Outbox(self.state_dir / "outbox.sqlite")
        self.credential = read_secret(self.token_file) if self.token_file.exists() else None
        self.stop = asyncio.Event()
        self.busy = False
        self.client = None

    async def request(self, path, payload=None, authenticated=True):
        headers = {"Authorization": "Bearer " + self.credential["token"]} if authenticated and self.credential else {}
        response = await self.client.post(self.url + path, json=payload or {}, headers=headers)
        response.raise_for_status()
        return response.json()

    async def flush(self):
        for identifier, job_id, raw in self.outbox.pending():
            try:
                await self.request(f"/agent/v1/jobs/{job_id}/report", json.loads(raw))
                self.outbox.ack(identifier)
            except httpx.HTTPStatusError as error:
                if error.response.status_code == 409:
                    # O lease expirou; o central redescobrirá hosts ainda não confirmados.
                    self.outbox.ack(identifier)
                    log.warning(json.dumps({"event": "outbox_lease_expired", "job_id": job_id}))
                else:
                    raise

    async def heartbeat(self):
        return await self.request(
            "/agent/v1/heartbeat",
            {
                "version": VERSION,
                "health": "DISCOVERING" if self.busy else "ONLINE",
                "interfaces": interfaces(),
                "capabilities": self.config.get("methods", ["tcp", "arp"]),
            },
        )

    async def execute(self, job):
        cancel = asyncio.Event()
        last_contact = time.monotonic()
        self.busy = True

        async def renew():
            nonlocal last_contact
            while not cancel.is_set() and not self.stop.is_set():
                try:
                    state = await self.request(f"/agent/v1/jobs/{job['id']}/lease", {"lease": job["lease"]})
                    await self.heartbeat()
                    last_contact = time.monotonic()
                    if state["cancel"]:
                        cancel.set()
                        return
                except httpx.HTTPStatusError as error:
                    if error.response.status_code in {401, 403, 409}:
                        cancel.set()
                        return
                except httpx.HTTPError:
                    if time.monotonic() - last_contact > 80:
                        cancel.set()
                        return
                try:
                    await asyncio.wait_for(cancel.wait(), 10)
                except TimeoutError:
                    pass

        watcher = asyncio.create_task(renew())
        results = []
        try:
            async for result in scan(job, self.config, cancel):
                results.append(result.model_dump(mode="json"))
                if len(results) >= 16:
                    self.outbox.put(
                        job["id"],
                        {"lease": job["lease"], "batch_id": str(uuid4()), "results": results, "finished": False},
                    )
                    results = []
                    try:
                        await self.flush()
                    except httpx.HTTPError:
                        pass
                if self.stop.is_set():
                    cancel.set()
                    break
        except ValueError:
            log.warning(json.dumps({"event": "local_policy_rejected", "job_id": job["id"]}))
        finally:
            watcher.cancel()
            await asyncio.gather(watcher, return_exceptions=True)
            self.outbox.put(
                job["id"], {"lease": job["lease"], "batch_id": str(uuid4()), "results": results, "finished": True}
            )
            self.busy = False
            try:
                await self.flush()
            except httpx.HTTPError:
                pass

    async def run(self):
        verify = self.config.get("ca_file") or True
        async with self.client_factory(
            timeout=10, verify=verify, trust_env=False, follow_redirects=False
        ) as self.client:
            failures = 0
            while not self.stop.is_set():
                try:
                    if not self.credential:
                        bootstrap = os.environ.get("DISCOVERY_AGENT_BOOTSTRAP_TOKEN")
                        if not bootstrap:
                            raise ValueError("Informe DISCOVERY_AGENT_BOOTSTRAP_TOKEN para a primeira inscrição")
                        self.credential = await self.request(
                            "/agent/v1/enroll",
                            {"bootstrap_token": bootstrap, "version": VERSION, "platform": platform.system()},
                            authenticated=False,
                        )
                        write_secret(self.token_file, self.credential)
                        os.environ.pop("DISCOVERY_AGENT_BOOTSTRAP_TOKEN", None)
                    await self.flush()
                    heartbeat = await self.heartbeat()
                    if heartbeat["token_expires"] < time.time() + 7 * 86400:
                        rotated = await self.request("/agent/v1/rotate")
                        self.credential.update(rotated)
                        write_secret(self.token_file, self.credential)
                    if heartbeat["status"] == "APPROVED":
                        claimed = await self.request("/agent/v1/claim")
                        if claimed["job"]:
                            await self.execute(claimed["job"])
                    failures = 0
                    delay = 5
                except (httpx.HTTPError, OSError, ValueError) as error:
                    failures += 1
                    delay = min(60, 2 ** min(failures, 5)) + random.uniform(0, 2)
                    status = error.response.status_code if isinstance(error, httpx.HTTPStatusError) else None
                    log.warning(
                        json.dumps(
                            {
                                "event": "central_communication_error",
                                "error_type": type(error).__name__,
                                "status": status,
                                "retry_seconds": round(delay),
                            }
                        )
                    )
                try:
                    await asyncio.wait_for(self.stop.wait(), delay)
                except TimeoutError:
                    pass
        self.outbox.db.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--protect-config", action="store_true")
    args = parser.parse_args()
    if args.protect_config:
        config = json.loads(Path(args.config).read_text())
        write_secret(Path(args.config), config)
        return
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    config = read_secret(Path(args.config))
    if "credentials_file" in config:
        config["credentials"] = read_secret(Path(config["credentials_file"]))
    if os.name != "nt":
        os.umask(0o077)
    runner = AgentRunner(config)

    async def start():
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, runner.stop.set)
            except NotImplementedError:
                signal.signal(sig, lambda *_: loop.call_soon_threadsafe(runner.stop.set))
        await runner.run()

    asyncio.run(start())


if __name__ == "__main__":
    main()
