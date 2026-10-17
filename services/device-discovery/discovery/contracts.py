from enum import StrEnum
from ipaddress import IPv4Address, IPv4Network
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class JobState(StrEnum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    CANCELLING = "CANCELLING"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    PARTIAL = "PARTIAL"
    FAILED = "FAILED"
    TIMED_OUT = "TIMED_OUT"


TERMINAL = {JobState.CANCELLED, JobState.COMPLETED, JobState.PARTIAL, JobState.FAILED, JobState.TIMED_OUT}
METHODS = {"tcp", "arp", "icmp", "mdns", "ssdp", "ws-discovery", "snmp"}
PORTS = {80, 443, 3000, 3001, 4370, 8080, 8443, 1870}


class NetworkInput(StrictModel):
    orgao_id: UUID
    unidade_id: UUID | None = None
    name: str = Field(min_length=2, max_length=100)
    cidr: str
    ports: list[int] = Field(default_factory=lambda: [80, 443, 3000, 3001, 8080, 8443], min_length=1, max_length=8)
    methods: list[str] = Field(default_factory=lambda: ["tcp", "arp"], min_length=1, max_length=7)
    concurrency: int = Field(default=8, ge=1, le=24)
    rate: int = Field(default=10, ge=1, le=20)
    timeout: float = Field(default=1.0, ge=0.2, le=5)
    max_hosts: int = Field(default=256, ge=1, le=1024)
    window_start_utc: int | None = Field(default=None, ge=0, le=23)
    window_end_utc: int | None = Field(default=None, ge=0, le=23)

    @field_validator("cidr")
    @classmethod
    def cidr_literal(cls, value):
        return str(IPv4Network(value, strict=True))

    @field_validator("ports")
    @classmethod
    def ports_allowed(cls, value):
        if not set(value) <= PORTS:
            raise ValueError("Portas fora da lista de protocolos de descoberta")
        return sorted(set(value))

    @field_validator("methods")
    @classmethod
    def methods_allowed(cls, value):
        if not set(value) <= METHODS:
            raise ValueError("Método de descoberta desconhecido")
        return sorted(set(value))

    @model_validator(mode="after")
    def complete_window(self):
        if (self.window_start_utc is None) != (self.window_end_utc is None):
            raise ValueError("Informe início e fim da janela UTC")
        return self


class EnrollmentInput(StrictModel):
    name: str = Field(min_length=2, max_length=100)
    orgao_id: UUID
    unidade_id: UUID | None = None
    network_ids: list[UUID] = Field(min_length=1, max_length=32)


class EnrollRequest(StrictModel):
    bootstrap_token: str = Field(min_length=32, max_length=200)
    version: str = Field(max_length=30)
    platform: str = Field(max_length=60)


class Heartbeat(StrictModel):
    version: str = Field(max_length=30)
    health: Literal["ONLINE", "DEGRADED", "DISCOVERING", "COMMUNICATION_ERROR"] = "ONLINE"
    interfaces: list[dict[str, str]] = Field(default_factory=list, max_length=32)
    capabilities: list[str] = Field(default_factory=list, max_length=16)


class JobInput(StrictModel):
    orgao_id: UUID
    unidade_id: UUID | None = None
    network_id: UUID | None = None
    agent_id: UUID | None = None
    target: str | None = Field(default=None, max_length=48)
    idempotency_key: UUID


class Evidence(StrictModel):
    method: str = Field(max_length=40)
    field: Literal["manufacturer", "model", "serial", "firmware", "mac", "description", "device_type", "hostname"]
    value: str = Field(max_length=250)
    source: Literal["DECLARED", "INFERRED"]


class Observation(StrictModel):
    ip: str
    open_ports: list[int] = Field(default_factory=list, max_length=8)
    mac: str | None = Field(default=None, max_length=32)
    hostname: str | None = Field(default=None, max_length=200)
    manufacturer: str | None = Field(default=None, max_length=80)
    model: str | None = Field(default=None, max_length=120)
    serial: str | None = Field(default=None, max_length=120)
    firmware: str | None = Field(default=None, max_length=120)
    device_type: Literal[
        "BIOMETRIC_CLOCK", "CLOCK", "TURNSTILE", "ACCESS_CONTROLLER", "FACIAL_TERMINAL", "DOOR_CONTROLLER", "UNKNOWN"
    ] = "UNKNOWN"
    confidence: Literal["CONFIRMED", "PROBABLE", "UNKNOWN"] = "UNKNOWN"
    protocols: list[Annotated[str, Field(max_length=80)]] = Field(default_factory=list, max_length=12)
    capabilities: list[Literal["METADATA_READ", "AUTHENTICATED_METADATA"]] = Field(default_factory=list, max_length=16)
    driver: str | None = Field(default=None, max_length=80)
    evidence: list[Evidence] = Field(default_factory=list, max_length=24)
    warnings: list[Annotated[str, Field(max_length=300)]] = Field(default_factory=list, max_length=16)

    @field_validator("ip")
    @classmethod
    def literal_ip(cls, value):
        return str(IPv4Address(value))

    @model_validator(mode="after")
    def confirmed_requires_evidence(self):
        if self.confidence == "CONFIRMED" and not any(
            e.source == "DECLARED"
            and e.method in {"CONTROL_ID_API", "HIKVISION_ISAPI", "INTELBRAS_API", "EXISTING_SECP_DRIVER"}
            for e in self.evidence
        ):
            raise ValueError("Confirmação exige evidência específica do protocolo")
        if self.confidence != "CONFIRMED":
            self.serial = None
        return self


class TargetResult(StrictModel):
    ip: str
    observation: Observation | None = None
    error: str | None = Field(default=None, max_length=120)

    @field_validator("ip")
    @classmethod
    def literal_ip(cls, value):
        return str(IPv4Address(value))


class Report(StrictModel):
    lease: str = Field(min_length=32, max_length=200)
    batch_id: UUID
    results: list[TargetResult] = Field(default_factory=list, max_length=32)
    finished: bool = False


class LeaseRequest(StrictModel):
    lease: str = Field(min_length=32, max_length=200)
