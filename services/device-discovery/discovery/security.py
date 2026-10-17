import base64
import hashlib
import hmac
import json
import secrets
import time
from collections import defaultdict, deque
from threading import Lock
from uuid import UUID

from fastapi import HTTPException, Request
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError

from .db import Agent, Nonce


def digest(value: str):
    return hashlib.sha256(value.encode()).hexdigest()


def new_token():
    return secrets.token_urlsafe(48)


def signature(secret, method, path, timestamp, nonce, claims, body):
    canonical = "\n".join([method, path, timestamp, nonce, claims, hashlib.sha256(body).hexdigest()])
    return hmac.new(secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()


def authenticate_admin(request: Request, db, settings, body: bytes):
    try:
        timestamp = request.headers["x-discovery-timestamp"]
        nonce = request.headers["x-discovery-nonce"]
        claims_text = request.headers["x-discovery-claims"]
        received = request.headers["x-discovery-signature"]
        if abs(time.time() - int(timestamp)) > 60 or len(nonce) > 64 or len(claims_text) > 64000:
            raise ValueError()
        UUID(nonce)
        path = request.url.path + ("?" + request.url.query if request.url.query else "")
        expected = signature(settings.gateway_secret, request.method, path, timestamp, nonce, claims_text, body)
        if not hmac.compare_digest(expected, received):
            raise ValueError()
        claims = json.loads(base64.urlsafe_b64decode(claims_text + "=" * (-len(claims_text) % 4)))
        UUID(claims["user_id"])
        if not isinstance(claims["orgao_ids"], list) or len(claims["orgao_ids"]) > 256:
            raise ValueError()
        for orgao in claims["orgao_ids"]:
            UUID(orgao)
        excluded = claims.get("excluded_unit_ids", [])
        if not isinstance(excluded, list) or len(excluded) > 1000:
            raise ValueError()
        for unit in excluded:
            UUID(unit)
        if request.method != "GET" and claims.get("write") is not True:
            raise HTTPException(403, "Permissão de escrita necessária")
        db.add(Nonce(id=nonce, expires=time.time() + 120))
        db.flush()
        return claims
    except HTTPException:
        raise
    except (ValueError, KeyError, TypeError, IntegrityError):
        db.rollback()
        raise HTTPException(401, "Assinatura inválida, expirada ou reutilizada") from None


def authenticate_agent(request: Request, db):
    token = request.headers.get("authorization", "").removeprefix("Bearer ")
    if len(token) < 32 or len(token) > 200:
        raise HTTPException(401, "Credencial de agente inválida")
    hashed, now = digest(token), time.time()
    agent = db.scalar(select(Agent).where(or_(Agent.token_hash == hashed, Agent.previous_hash == hashed)))
    if not agent or agent.status in {"REVOKED", "ENROLLING"}:
        raise HTTPException(401, "Agente revogado ou não inscrito")
    expires = agent.token_expires if agent.token_hash == hashed else agent.previous_expires
    if expires <= now:
        raise HTTPException(401, "Credencial expirada; solicite nova inscrição")
    return agent


class RateLimiter:
    def __init__(self):
        self.requests = defaultdict(deque)
        self.lock = Lock()

    def check(self, key: str, maximum: int):
        now = time.monotonic()
        with self.lock:
            queue = self.requests[key]
            while queue and queue[0] < now - 60:
                queue.popleft()
            if len(queue) >= maximum:
                raise HTTPException(429, "Limite de solicitações atingido", headers={"Retry-After": "10"})
            queue.append(now)
            if len(self.requests) > 10000:
                self.requests = defaultdict(deque, {k: v for k, v in self.requests.items() if v and v[-1] > now - 60})
