import time
import uuid

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, String, UniqueConstraint, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


def uid():
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class Agent(Base):
    __tablename__ = "discovery_agents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(100))
    orgao_id: Mapped[str] = mapped_column(String(36), index=True)
    unidade_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ENROLLING")
    network_ids: Mapped[list] = mapped_column(JSON, default=list)
    bootstrap_hash: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    bootstrap_expires: Mapped[float] = mapped_column(Float, default=0)
    token_hash: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    token_expires: Mapped[float] = mapped_column(Float, default=0)
    previous_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    previous_expires: Mapped[float] = mapped_column(Float, default=0)
    heartbeat: Mapped[float] = mapped_column(Float, default=0)
    version: Mapped[str] = mapped_column(String(30), default="")
    health: Mapped[dict] = mapped_column(JSON, default=dict)
    created: Mapped[float] = mapped_column(Float, default=time.time)


class Network(Base):
    __tablename__ = "discovery_agent_networks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    orgao_id: Mapped[str] = mapped_column(String(36), index=True)
    unidade_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    name: Mapped[str] = mapped_column(String(100))
    cidr: Mapped[str] = mapped_column(String(40))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    config: Mapped[dict] = mapped_column(JSON)


class Job(Base):
    __tablename__ = "discovery_jobs"
    __table_args__ = (UniqueConstraint("idempotency_key", "network_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    run_id: Mapped[str] = mapped_column(String(36), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(80))
    request_hash: Mapped[str] = mapped_column(String(64))
    orgao_id: Mapped[str] = mapped_column(String(36), index=True)
    unidade_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    agent_id: Mapped[str] = mapped_column(ForeignKey("discovery_agents.id"), index=True)
    network_id: Mapped[str] = mapped_column(ForeignKey("discovery_agent_networks.id"))
    target: Mapped[str] = mapped_column(String(40))
    state: Mapped[str] = mapped_column(String(20), default="QUEUED", index=True)
    requested_by: Mapped[str] = mapped_column(String(80))
    total: Mapped[int] = mapped_column(Integer)
    processed: Mapped[int] = mapped_column(Integer, default=0)
    found: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[int] = mapped_column(Integer, default=0)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    lease_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    lease_expires: Mapped[float] = mapped_column(Float, default=0)
    created: Mapped[float] = mapped_column(Float, default=time.time, index=True)
    started: Mapped[float | None] = mapped_column(Float, nullable=True)
    finished: Mapped[float | None] = mapped_column(Float, nullable=True)
    deadline: Mapped[float] = mapped_column(Float)


class Target(Base):
    __tablename__ = "discovery_job_targets"
    __table_args__ = (UniqueConstraint("job_id", "ip"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    job_id: Mapped[str] = mapped_column(ForeignKey("discovery_jobs.id", ondelete="CASCADE"), index=True)
    ip: Mapped[str] = mapped_column(String(40))
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    error: Mapped[str | None] = mapped_column(String(120), nullable=True)


class Device(Base):
    __tablename__ = "discovery_devices"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    identity: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    orgao_id: Mapped[str] = mapped_column(String(36), index=True)
    first_seen: Mapped[float] = mapped_column(Float, default=time.time)
    last_seen: Mapped[float] = mapped_column(Float, default=time.time)


class ObservationRow(Base):
    __tablename__ = "discovery_observations"
    __table_args__ = (UniqueConstraint("job_id", "ip"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    job_id: Mapped[str] = mapped_column(ForeignKey("discovery_jobs.id", ondelete="CASCADE"), index=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("discovery_devices.id"), index=True)
    orgao_id: Mapped[str] = mapped_column(String(36), index=True)
    ip: Mapped[str] = mapped_column(String(40))
    payload: Mapped[dict] = mapped_column(JSON)
    created: Mapped[float] = mapped_column(Float, default=time.time)


class Receipt(Base):
    __tablename__ = "discovery_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("discovery_jobs.id", ondelete="CASCADE"), index=True)
    payload_hash: Mapped[str] = mapped_column(String(64))


class Audit(Base):
    __tablename__ = "discovery_audit_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    orgao_id: Mapped[str] = mapped_column(String(36), index=True)
    actor: Mapped[str] = mapped_column(String(100))
    action: Mapped[str] = mapped_column(String(80))
    resource_id: Mapped[str] = mapped_column(String(80))
    correlation_id: Mapped[str] = mapped_column(String(80))
    created: Mapped[float] = mapped_column(Float, default=time.time, index=True)


class Nonce(Base):
    __tablename__ = "discovery_request_nonces"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    expires: Mapped[float] = mapped_column(Float, index=True)


def database(url):
    engine = create_engine(
        url,
        pool_pre_ping=True,
        connect_args={"check_same_thread": False, "timeout": 15} if url.startswith("sqlite") else {},
    )
    if url.startswith("sqlite"):

        @event.listens_for(engine, "connect")
        def sqlite_options(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
            connection.execute("PRAGMA journal_mode=WAL")

    return engine, sessionmaker(engine, expire_on_commit=False)
