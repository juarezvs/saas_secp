import hashlib
import json
import logging
import time
from contextlib import asynccontextmanager
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy import delete, func, or_, select, text, update
from sqlalchemy.exc import IntegrityError
from starlette.concurrency import run_in_threadpool

from . import VERSION
from .config import Settings
from .contracts import TERMINAL, EnrollmentInput, EnrollRequest, Heartbeat, JobInput, LeaseRequest, NetworkInput, Report
from .db import Agent, Audit, Device, Job, Network, Nonce, ObservationRow, Receipt, Target, database
from .networks import authorized_network, bounded_hosts, require_ip_in_network, target_network
from .security import RateLimiter, authenticate_admin, authenticate_agent, digest, new_token

log = logging.getLogger("secp.discovery")


def json_row(row):
    return {
        column.name: getattr(row, column.name)
        for column in row.__table__.columns
        if column.name not in {"token_hash", "previous_hash", "bootstrap_hash", "lease_hash"}
    }


def create_app(settings=None, *, initialize=False):
    settings = settings or Settings.load()
    engine, sessions = database(settings.database_url)

    @asynccontextmanager
    async def lifespan(_):
        # Produção usa Alembic explicitamente; create_all é apenas para testes isolados.
        if initialize:
            from .db import Base

            Base.metadata.create_all(engine)
        yield
        engine.dispose()

    app = FastAPI(title="SECP Device Discovery", version=VERSION, lifespan=lifespan)
    app.state.sessions, app.state.settings = sessions, settings
    limiter = RateLimiter()

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request.state.correlation_id = str(uuid4())
        if request.method in {"POST", "PUT", "PATCH"}:
            length = request.headers.get("content-length")
            if length is None:
                return JSONResponse({"detail": "Content-Length obrigatório"}, status_code=411)
            if not length.isdigit() or int(length) > 524288:
                return JSONResponse({"detail": "Requisição excede 512 KiB"}, status_code=413)
        started = time.monotonic()
        response = await call_next(request)
        response.headers["X-Correlation-ID"] = request.state.correlation_id
        response.headers["Cache-Control"] = "no-store"
        log.info(
            json.dumps(
                {
                    "event": "http",
                    "correlation_id": request.state.correlation_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "duration_ms": round((time.monotonic() - started) * 1000),
                }
            )
        )
        return response

    @app.exception_handler(IntegrityError)
    async def conflict(_request, _error):
        return JSONResponse({"detail": "Conflito concorrente; consulte o recurso antes de reenviar"}, status_code=409)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(_request, error):
        # O formato padrão inclui o input, que pode ser uma credencial de inscrição.
        return JSONResponse(
            {
                "detail": "Campos inválidos",
                "fields": [{"path": list(item["loc"]), "type": item["type"]} for item in error.errors()],
            },
            status_code=422,
        )

    def session():
        with sessions() as db:
            try:
                yield db
                db.commit()
            except Exception:
                db.rollback()
                raise

    async def admin(request: Request):
        body = await request.body()

        def verify():
            # Nonce em transação curta independente. Escrita síncrona nunca bloqueia
            # o event loop enquanto outro handler aguarda seu fechamento de sessão.
            with sessions.begin() as nonce_db:
                return authenticate_admin(request, nonce_db, settings, body)

        claims = await run_in_threadpool(verify)
        read = request.method == "GET"
        limiter.check("admin:" + claims["user_id"] + (":read" if read else ":write"), 120 if read else 30)
        return claims

    def agent_auth(request: Request, db=Depends(session)):
        agent = authenticate_agent(request, db)
        limiter.check("agent:" + agent.id, 120)
        return agent

    def scoped(claims, orgao_id, unidade_id=None):
        if str(orgao_id) not in claims["orgao_ids"] or (
            unidade_id and str(unidade_id) in claims.get("excluded_unit_ids", [])
        ):
            raise HTTPException(404, "Recurso não disponível neste escopo")

    def resource(db, model, identifier, claims):
        row = db.get(model, str(identifier))
        if not row:
            raise HTTPException(404, "Recurso não encontrado")
        unit = db.get(Job, row.job_id).unidade_id if model is ObservationRow else getattr(row, "unidade_id", None)
        scoped(claims, row.orgao_id, unit)
        return row

    def audit(db, request, orgao, actor, action, identifier):
        db.add(
            Audit(
                orgao_id=str(orgao),
                actor=actor,
                action=action,
                resource_id=str(identifier),
                correlation_id=request.state.correlation_id,
            )
        )

    def agent_view(agent):
        row = json_row(agent)
        row.pop("previous_expires", None)
        row.pop("bootstrap_expires", None)
        row["state"] = agent.status
        if agent.status == "APPROVED":
            row["state"] = (
                "OFFLINE"
                if agent.heartbeat < time.time() - settings.offline_seconds
                else (
                    "UPDATE_REQUIRED"
                    if agent.version.split(".")[0] != VERSION.split(".")[0]
                    else agent.health.get("health", "ONLINE")
                )
            )
        return row

    def scoped_query(db, model, claims, orgao_id=None):
        if orgao_id:
            scoped(claims, orgao_id)
        query = select(model).where(model.orgao_id.in_([str(orgao_id)] if orgao_id else claims["orgao_ids"]))
        excluded = claims.get("excluded_unit_ids", [])
        if excluded and hasattr(model, "unidade_id"):
            query = query.where(or_(model.unidade_id.is_(None), model.unidade_id.not_in(excluded)))
        elif excluded and model is ObservationRow:
            query = query.where(
                model.job_id.in_(select(Job.id).where(or_(Job.unidade_id.is_(None), Job.unidade_id.not_in(excluded))))
            )
        return query

    @app.get("/health/live")
    def live():
        return {"ok": True, "version": VERSION}

    @app.get("/health/ready")
    def ready(db=Depends(session)):
        try:
            db.execute(text("SELECT id FROM discovery_agents LIMIT 1"))
            return {"ok": True, "database": "ready"}
        except Exception:
            raise HTTPException(503, "Banco ou migrations indisponíveis") from None

    @app.get("/api/v1/networks")
    def networks(orgao_id: UUID | None = None, claims=Depends(admin), db=Depends(session)):
        return {"items": [json_row(n) for n in db.scalars(scoped_query(db, Network, claims, orgao_id)).all()]}

    @app.post("/api/v1/networks", status_code=201)
    def create_network(data: NetworkInput, request: Request, claims=Depends(admin), db=Depends(session)):
        scoped(claims, data.orgao_id, data.unidade_id)
        try:
            authorized_network(data.cidr, allow_loopback=settings.allow_loopback)
        except ValueError as error:
            raise HTTPException(422, str(error)) from None
        network = Network(
            orgao_id=str(data.orgao_id),
            unidade_id=str(data.unidade_id) if data.unidade_id else None,
            name=data.name,
            cidr=data.cidr,
            config=data.model_dump(mode="json"),
        )
        db.add(network)
        db.flush()
        audit(db, request, network.orgao_id, claims["user_id"], "NETWORK_AUTHORIZED", network.id)
        return json_row(network)

    @app.post("/api/v1/networks/{identifier}/disable")
    def disable_network(identifier: UUID, request: Request, claims=Depends(admin), db=Depends(session)):
        network = resource(db, Network, identifier, claims)
        network.enabled = False
        for job in db.scalars(select(Job).where(Job.network_id == network.id, Job.state.not_in(TERMINAL))):
            job.state = "CANCELLING" if job.state == "RUNNING" else "CANCELLED"
            if job.state == "CANCELLED":
                job.finished = time.time()
        audit(db, request, network.orgao_id, claims["user_id"], "NETWORK_DISABLED", network.id)
        return {"ok": True}

    def validate_networks(db, data, claims):
        for identifier in data.network_ids:
            network = db.get(Network, str(identifier))
            if not network or not network.enabled or network.orgao_id != str(data.orgao_id):
                raise HTTPException(422, "Rede ausente, inativa ou de outra seccional")
            scoped(claims, network.orgao_id, network.unidade_id)
            if data.unidade_id and network.unidade_id and network.unidade_id != str(data.unidade_id):
                raise HTTPException(422, "Rede vinculada a outra unidade")

    @app.get("/api/v1/agents")
    def agents(orgao_id: UUID | None = None, claims=Depends(admin), db=Depends(session)):
        return {"items": [agent_view(a) for a in db.scalars(scoped_query(db, Agent, claims, orgao_id)).all()]}

    @app.post("/api/v1/agents/enrollments", status_code=201)
    def enrollment(data: EnrollmentInput, request: Request, claims=Depends(admin), db=Depends(session)):
        scoped(claims, data.orgao_id, data.unidade_id)
        validate_networks(db, data, claims)
        token = new_token()
        agent = Agent(
            name=data.name,
            orgao_id=str(data.orgao_id),
            unidade_id=str(data.unidade_id) if data.unidade_id else None,
            network_ids=[str(n) for n in data.network_ids],
            bootstrap_hash=digest(token),
            bootstrap_expires=time.time() + 900,
        )
        db.add(agent)
        db.flush()
        audit(db, request, agent.orgao_id, claims["user_id"], "AGENT_ENROLLMENT_CREATED", agent.id)
        return {"agent": agent_view(agent), "bootstrap_token": token, "expires_in": 900}

    @app.get("/api/v1/agents/{identifier}")
    def agent_detail(identifier: UUID, claims=Depends(admin), db=Depends(session)):
        row = resource(db, Agent, identifier, claims)
        return {
            "agent": agent_view(row),
            "jobs": [
                json_row(j)
                for j in db.scalars(select(Job).where(Job.agent_id == row.id).order_by(Job.created.desc()).limit(20))
            ],
        }

    @app.post("/api/v1/agents/{identifier}/approve")
    def approve(identifier: UUID, request: Request, claims=Depends(admin), db=Depends(session)):
        agent = resource(db, Agent, identifier, claims)
        if agent.status != "PENDING":
            raise HTTPException(409, "A aprovação exige inscrição já realizada pelo agente")
        agent.status = "APPROVED"
        audit(db, request, agent.orgao_id, claims["user_id"], "AGENT_APPROVED", agent.id)
        return agent_view(agent)

    @app.post("/api/v1/agents/{identifier}/revoke")
    def revoke(identifier: UUID, request: Request, claims=Depends(admin), db=Depends(session)):
        agent = resource(db, Agent, identifier, claims)
        agent.status, agent.token_hash, agent.previous_hash, agent.bootstrap_hash = "REVOKED", None, None, None
        for job in db.scalars(select(Job).where(Job.agent_id == agent.id, Job.state.not_in(TERMINAL))):
            job.state = "CANCELLING" if job.state == "RUNNING" else "CANCELLED"
            if job.state == "CANCELLED":
                job.finished = time.time()
        audit(db, request, agent.orgao_id, claims["user_id"], "AGENT_REVOKED", agent.id)
        return {"ok": True}

    @app.post("/api/v1/agents/{identifier}/rotate")
    def rotate_admin(identifier: UUID, request: Request, claims=Depends(admin), db=Depends(session)):
        agent = resource(db, Agent, identifier, claims)
        if db.scalar(select(Job.id).where(Job.agent_id == agent.id, Job.state.in_(["RUNNING", "CANCELLING"]))):
            raise HTTPException(409, "Cancele ou conclua o job antes de reinscrever")
        token = new_token()
        agent.status, agent.token_hash, agent.previous_hash = "ENROLLING", None, None
        agent.bootstrap_hash, agent.bootstrap_expires = digest(token), time.time() + 900
        audit(db, request, agent.orgao_id, claims["user_id"], "AGENT_CREDENTIAL_RESET", agent.id)
        return {"bootstrap_token": token, "expires_in": 900}

    @app.post("/api/v1/agents/{identifier}/networks")
    def configure_agent(
        identifier: UUID, data: EnrollmentInput, request: Request, claims=Depends(admin), db=Depends(session)
    ):
        agent = resource(db, Agent, identifier, claims)
        scoped(claims, data.orgao_id, data.unidade_id)
        if str(data.orgao_id) != agent.orgao_id:
            raise HTTPException(422, "Não é permitido transferir agente entre seccionais")
        if db.scalar(select(Job.id).where(Job.agent_id == agent.id, Job.state.not_in(TERMINAL))):
            raise HTTPException(409, "Conclua ou cancele os jobs antes de alterar as redes")
        validate_networks(db, data, claims)
        agent.name, agent.unidade_id = data.name, str(data.unidade_id) if data.unidade_id else None
        agent.network_ids = [str(n) for n in data.network_ids]
        audit(db, request, agent.orgao_id, claims["user_id"], "AGENT_NETWORKS_UPDATED", agent.id)
        return agent_view(agent)

    @app.post("/api/v1/jobs", status_code=202)
    def create_jobs(data: JobInput, request: Request, claims=Depends(admin), db=Depends(session)):
        scoped(claims, data.orgao_id, data.unidade_id)
        # Serializa admissões do mesmo órgão, inclusive em SQLite. Evita que
        # solicitações simultâneas ultrapassem o limite da fila por agente.
        db.execute(update(Agent).where(Agent.orgao_id == str(data.orgao_id)).values(heartbeat=Agent.heartbeat))
        key = f"{claims['user_id']}:{data.idempotency_key}"
        old = db.scalars(select(Job).where(Job.idempotency_key == key)).all()
        if old:
            if any(j.orgao_id != str(data.orgao_id) or j.request_hash != digest(data.model_dump_json()) for j in old):
                raise HTTPException(409, "Chave de idempotência vinculada a outro escopo")
            return {"run_id": old[0].run_id, "jobs": [json_row(j) for j in old], "warnings": []}
        networks = db.scalars(scoped_query(db, Network, claims, data.orgao_id).where(Network.enabled.is_(True))).all()
        networks = [
            n
            for n in networks
            if (not data.network_id or n.id == str(data.network_id))
            and (not data.unidade_id or n.unidade_id in {None, str(data.unidade_id)})
        ]
        if not networks or len(networks) > 16 or (data.target and len(networks) != 1):
            raise HTTPException(
                422, "Selecione uma rede autorizada ou configure até 16 redes para descoberta automática"
            )
        run_id, jobs, warnings = str(uuid4()), [], []
        total_hosts = 0
        for network in networks:
            config = network.config
            hour = time.gmtime().tm_hour
            start, end = config.get("window_start_utc"), config.get("window_end_utc")
            if start is not None and not (start <= hour < end if start < end else hour >= start or hour < end):
                warnings.append(f"{network.name}: fora da janela UTC autorizada")
                continue
            try:
                target = target_network(
                    data.target,
                    network.cidr,
                    min(config["max_hosts"], settings.max_hosts),
                    allow_loopback=settings.allow_loopback,
                )
                hosts = list(bounded_hosts(target, settings.max_hosts))
            except ValueError as error:
                raise HTTPException(422, str(error)) from None
            total_hosts += len(hosts)
            if total_hosts > settings.max_hosts:
                raise HTTPException(422, "Limite total de hosts excedido")
            candidates = db.scalars(
                scoped_query(db, Agent, claims, data.orgao_id)
                .where(Agent.status == "APPROVED")
                .order_by(Agent.heartbeat.desc())
            ).all()
            candidates = [
                a
                for a in candidates
                if network.id in a.network_ids
                and a.version.split(".")[0] == VERSION.split(".")[0]
                and (not data.agent_id or a.id == str(data.agent_id))
                and (not data.unidade_id or a.unidade_id in {None, str(data.unidade_id)})
            ]
            if not candidates:
                warnings.append(f"{network.name}: nenhum agente aprovado para a rede")
                continue
            agent = next(
                (
                    a
                    for a in candidates
                    if db.scalar(
                        select(func.count()).select_from(Job).where(Job.agent_id == a.id, Job.state.not_in(TERMINAL))
                    )
                    < 3
                ),
                None,
            )
            if not agent:
                warnings.append(f"{network.name}: fila do agente atingiu o limite")
                continue
            job = Job(
                run_id=run_id,
                idempotency_key=key,
                request_hash=digest(data.model_dump_json()),
                orgao_id=network.orgao_id,
                unidade_id=str(data.unidade_id) if data.unidade_id else network.unidade_id or agent.unidade_id,
                agent_id=agent.id,
                network_id=network.id,
                target=str(target),
                requested_by=claims["user_id"],
                total=len(hosts),
                deadline=time.time() + 1800,
            )
            db.add(job)
            db.flush()
            db.add_all([Target(job_id=job.id, ip=str(ip)) for ip in hosts])
            audit(db, request, job.orgao_id, claims["user_id"], "DISCOVERY_REQUESTED", job.id)
            jobs.append(job)
        if not jobs:
            raise HTTPException(409, "; ".join(warnings) or "Nenhum job disponível")
        return {"run_id": run_id, "jobs": [json_row(j) for j in jobs], "warnings": warnings}

    @app.get("/api/v1/jobs")
    def jobs(
        orgao_id: UUID | None = None,
        offset: int = Query(0, ge=0),
        limit: int = Query(25, ge=1, le=100),
        claims=Depends(admin),
        db=Depends(session),
    ):
        query = scoped_query(db, Job, claims, orgao_id)
        total = db.scalar(select(func.count()).select_from(query.subquery()))
        return {
            "items": [json_row(j) for j in db.scalars(query.order_by(Job.created.desc()).offset(offset).limit(limit))],
            "total": total,
        }

    @app.get("/api/v1/jobs/{identifier}")
    def job_detail(identifier: UUID, claims=Depends(admin), db=Depends(session)):
        return json_row(resource(db, Job, identifier, claims))

    @app.post("/api/v1/jobs/{identifier}/cancel")
    def cancel(identifier: UUID, request: Request, claims=Depends(admin), db=Depends(session)):
        job = resource(db, Job, identifier, claims)
        if job.state not in TERMINAL:
            job.state = "CANCELLING" if job.state == "RUNNING" else "CANCELLED"
            if job.state == "CANCELLED":
                job.finished = time.time()
            audit(db, request, job.orgao_id, claims["user_id"], "DISCOVERY_CANCEL_REQUESTED", job.id)
        return json_row(job)

    @app.get("/api/v1/devices")
    def devices(
        orgao_id: UUID | None = None,
        job_id: UUID | None = None,
        offset: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=100),
        claims=Depends(admin),
        db=Depends(session),
    ):
        query = scoped_query(db, ObservationRow, claims, orgao_id)
        if job_id:
            resource(db, Job, job_id, claims)
            query = query.where(ObservationRow.job_id == str(job_id))
        total = db.scalar(select(func.count()).select_from(query.subquery()))
        rows = db.scalars(query.order_by(ObservationRow.created.desc()).offset(offset).limit(limit)).all()
        job_map = {j.id: json_row(j) for j in db.scalars(select(Job).where(Job.id.in_({r.job_id for r in rows})))}
        return {"items": [{**json_row(r), "job": job_map[r.job_id]} for r in rows], "total": total}

    @app.get("/api/v1/devices/{identifier}")
    def device_detail(identifier: UUID, claims=Depends(admin), db=Depends(session)):
        observation = resource(db, ObservationRow, identifier, claims)
        history = db.scalars(
            scoped_query(db, ObservationRow, claims)
            .where(ObservationRow.device_id == observation.device_id)
            .order_by(ObservationRow.created.desc())
            .limit(20)
        ).all()
        device = db.get(Device, observation.device_id)
        job = db.get(Job, observation.job_id)
        return {
            **json_row(observation),
            "device": json_row(device),
            "job": json_row(job),
            "history": [json_row(row) for row in history],
        }

    @app.get("/api/v1/audit")
    def audit_list(offset: int = Query(0, ge=0), claims=Depends(admin), db=Depends(session)):
        return {
            "items": [
                json_row(r)
                for r in db.scalars(
                    scoped_query(db, Audit, claims).order_by(Audit.created.desc()).offset(offset).limit(100)
                )
            ]
        }

    @app.get("/api/v1/metrics", response_class=PlainTextResponse)
    def metrics(_claims=Depends(admin), db=Depends(session)):
        agents_query = scoped_query(db, Agent, _claims).where(
            Agent.status == "APPROVED", Agent.heartbeat >= time.time() - settings.offline_seconds
        )
        online = db.scalar(select(func.count()).select_from(agents_query.subquery()))
        lines = ["# TYPE secp_discovery_agents_online gauge", f"secp_discovery_agents_online {online}"]
        jobs_query = scoped_query(db, Job, _claims).subquery()
        for state, count in db.execute(select(jobs_query.c.state, func.count()).group_by(jobs_query.c.state)):
            lines.append(f'secp_discovery_jobs{{state="{state}"}} {count}')
        duration, found, failures = db.execute(
            select(
                func.sum(jobs_query.c.finished - jobs_query.c.started),
                func.sum(jobs_query.c.found),
                func.sum(jobs_query.c.errors),
            )
        ).one()
        lines.extend(
            [
                f"secp_discovery_duration_seconds_sum {duration or 0}",
                f"secp_discovery_devices_found {found or 0}",
                f"secp_discovery_probe_errors {failures or 0}",
            ]
        )
        return "\n".join(lines) + "\n"

    @app.post("/agent/v1/enroll")
    def enroll(data: EnrollRequest, request: Request, db=Depends(session)):
        limiter.check("enroll:" + (request.client.host if request.client else "unknown"), 10)
        agent = db.scalar(select(Agent).where(Agent.bootstrap_hash == digest(data.bootstrap_token)))
        if not agent or agent.status != "ENROLLING" or agent.bootstrap_expires < time.time():
            raise HTTPException(401, "Inscrição inválida, utilizada ou expirada")
        token = new_token()
        agent.status, agent.bootstrap_hash = "PENDING", None
        agent.token_hash, agent.token_expires = digest(token), time.time() + settings.token_days * 86400
        agent.version, agent.heartbeat = data.version, time.time()
        audit(db, request, agent.orgao_id, agent.id, "AGENT_ENROLLED", agent.id)
        return {"agent_id": agent.id, "token": token, "token_expires": agent.token_expires, "status": agent.status}

    @app.post("/agent/v1/heartbeat")
    def heartbeat(data: Heartbeat, agent=Depends(agent_auth), db=Depends(session)):
        agent.version, agent.heartbeat, agent.health = data.version, time.time(), data.model_dump(mode="json")
        networks = db.scalars(select(Network).where(Network.id.in_(agent.network_ids), Network.enabled.is_(True))).all()
        return {
            "agent_id": agent.id,
            "status": agent.status,
            "token_expires": agent.token_expires,
            "networks": [json_row(n) for n in networks],
            "poll_after": 5,
        }

    @app.post("/agent/v1/rotate")
    def rotate_agent(request: Request, agent=Depends(agent_auth), db=Depends(session)):
        token = new_token()
        agent.previous_hash, agent.previous_expires = agent.token_hash, time.time() + 300
        agent.token_hash, agent.token_expires = digest(token), time.time() + settings.token_days * 86400
        audit(db, request, agent.orgao_id, agent.id, "AGENT_CREDENTIAL_ROTATED", agent.id)
        return {"token": token, "token_expires": agent.token_expires}

    @app.post("/agent/v1/claim")
    def claim(agent=Depends(agent_auth), db=Depends(session)):
        db.execute(update(Agent).where(Agent.id == agent.id).values(heartbeat=time.time()))
        if agent.status != "APPROVED" or agent.version.split(".")[0] != VERSION.split(".")[0]:
            return {"job": None}
        if db.scalar(select(Job.id).where(Job.agent_id == agent.id, Job.state.in_(["RUNNING", "CANCELLING"]))):
            return {"job": None}
        job = db.scalar(
            select(Job)
            .where(Job.agent_id == agent.id, Job.state == "QUEUED", Job.deadline > time.time())
            .order_by(Job.created)
        )
        if not job:
            return {"job": None}
        network = db.get(Network, job.network_id)
        if not network.enabled or network.id not in agent.network_ids:
            job.state, job.finished = "CANCELLED", time.time()
            return {"job": None}
        start, end = network.config.get("window_start_utc"), network.config.get("window_end_utc")
        hour = time.gmtime().tm_hour
        if start is not None and not (start <= hour < end if start < end else hour >= start or hour < end):
            return {"job": None}
        lease = new_token()
        job.state, job.started = "RUNNING", job.started or time.time()
        job.lease_hash, job.lease_expires = digest(lease), time.time() + settings.lease_seconds
        job.attempts += 1
        pending = list(db.scalars(select(Target.ip).where(Target.job_id == job.id, Target.done.is_(False))))
        return {"job": {**json_row(job), "lease": lease, "config": network.config, "targets": pending}}

    def leased(db, identifier, agent, lease):
        job = db.scalar(select(Job).where(Job.id == str(identifier)).with_for_update())
        if (
            not job
            or job.agent_id != agent.id
            or job.lease_hash != digest(lease)
            or job.lease_expires < time.time()
            or job.state not in {"RUNNING", "CANCELLING"}
        ):
            raise HTTPException(409, "Lease encerrado; interrompa a operação local")
        return job

    @app.post("/agent/v1/jobs/{identifier}/lease")
    def renew(identifier: UUID, data: LeaseRequest, agent=Depends(agent_auth), db=Depends(session)):
        job = leased(db, identifier, agent, data.lease)
        job.lease_expires = min(time.time() + settings.lease_seconds, job.deadline)
        return {"cancel": job.state == "CANCELLING" or job.deadline <= time.time(), "deadline": job.deadline}

    @app.post("/agent/v1/jobs/{identifier}/report")
    def report(identifier: UUID, data: Report, request: Request, agent=Depends(agent_auth), db=Depends(session)):
        batch_hash = digest(data.model_dump_json())
        receipt = db.get(Receipt, str(data.batch_id))
        if receipt:
            job = db.get(Job, receipt.job_id)
            if receipt.job_id != str(identifier) or receipt.payload_hash != batch_hash or job.agent_id != agent.id:
                raise HTTPException(409, "Confirmação idempotente incompatível")
            return {"ok": True, "duplicate": True, "state": job.state}
        job = leased(db, identifier, agent, data.lease)
        seen = set()
        for result in data.results:
            try:
                require_ip_in_network(result.ip, job.target)
            except ValueError:
                raise HTTPException(422, "IP fora do escopo do job") from None
            if result.ip in seen:
                raise HTTPException(422, "IP repetido no lote")
            seen.add(result.ip)
            target = db.scalar(select(Target).where(Target.job_id == job.id, Target.ip == result.ip))
            if not target:
                raise HTTPException(422, "Host não pertence ao job")
            if target.done:
                continue
            target.done, target.error = True, result.error
            job.processed += 1
            job.errors += int(result.error is not None)
            if result.observation:
                obs = result.observation
                if obs.ip != result.ip or not set(obs.open_ports) <= set(
                    db.get(Network, job.network_id).config["ports"]
                ):
                    raise HTTPException(422, "Observação fora do escopo autorizado")
                identity = (
                    hashlib.sha256(f"{job.orgao_id}:{obs.manufacturer}:{obs.serial}".upper().encode()).hexdigest()
                    if obs.confidence == "CONFIRMED"
                    and obs.manufacturer
                    and obs.serial
                    and len(obs.serial) >= 4
                    and set(obs.serial) != {"0"}
                    else None
                )
                device = db.scalar(select(Device).where(Device.identity == identity)) if identity else None
                if not device:
                    try:
                        with db.begin_nested():
                            device = Device(identity=identity, orgao_id=job.orgao_id)
                            db.add(device)
                            db.flush()
                    except IntegrityError:
                        device = db.scalar(select(Device).where(Device.identity == identity))
                device.last_seen = time.time()
                db.add(
                    ObservationRow(
                        job_id=job.id,
                        device_id=device.id,
                        orgao_id=job.orgao_id,
                        ip=obs.ip,
                        payload=obs.model_dump(mode="json"),
                    )
                )
                job.found += 1
        if data.finished:
            if job.state == "CANCELLING":
                job.state = "CANCELLED"
            elif job.processed < job.total:
                job.state = "PARTIAL"
            else:
                job.state = "FAILED" if job.errors == job.total else "PARTIAL" if job.errors else "COMPLETED"
            job.finished = time.time()
            audit(db, request, job.orgao_id, agent.id, "DISCOVERY_" + job.state, job.id)
        db.add(Receipt(id=str(data.batch_id), job_id=job.id, payload_hash=batch_hash))
        job.lease_expires = min(time.time() + settings.lease_seconds, job.deadline)
        return {"ok": True, "state": job.state, "processed": job.processed}

    return app


def maintain(db, settings, now=None):
    now = now or time.time()
    for job in db.scalars(select(Job).where(Job.state.not_in(TERMINAL)).with_for_update(skip_locked=True)):
        if job.state == "CANCELLING" and job.lease_expires < now:
            job.state, job.finished = "CANCELLED", now
        elif job.deadline < now:
            job.state, job.finished = "TIMED_OUT", now
        elif job.state == "RUNNING" and job.lease_expires < now:
            job.state = "QUEUED" if job.attempts < 3 else "TIMED_OUT"
            job.lease_hash = None
            if job.state == "TIMED_OUT":
                job.finished = now
    db.execute(delete(Nonce).where(Nonce.expires < now))
    db.execute(delete(Job).where(Job.state.in_(TERMINAL), Job.created < now - settings.retention_days * 86400))
    db.execute(delete(Audit).where(Audit.created < now - 90 * 86400))
    # Dispositivos sem observações após retenção não ficam acumulados indefinidamente.
    db.execute(delete(Device).where(~Device.id.in_(select(ObservationRow.device_id))))


def main():
    import os

    import uvicorn

    if os.environ.get("DISCOVERY_ENVIRONMENT", "production") != "development" and not (
        os.environ.get("DISCOVERY_TLS_KEY") and os.environ.get("DISCOVERY_TLS_CERT")
    ):
        raise ValueError("Produção exige DISCOVERY_TLS_KEY e DISCOVERY_TLS_CERT")
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    uvicorn.run(
        create_app(),
        host="0.0.0.0",
        port=8000,
        access_log=False,
        limit_concurrency=64,
        h11_max_incomplete_event_size=131072,
        ssl_keyfile=os.environ.get("DISCOVERY_TLS_KEY"),
        ssl_certfile=os.environ.get("DISCOVERY_TLS_CERT"),
    )


if __name__ == "__main__":
    main()
