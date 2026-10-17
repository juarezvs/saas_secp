import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    gateway_secret: str
    redis_url: str = ""
    lease_seconds: int = 120
    offline_seconds: int = 90
    retention_days: int = 30
    token_days: int = 90
    max_hosts: int = 1024
    allow_loopback: bool = False

    @classmethod
    def load(cls):
        key = os.environ.get("DISCOVERY_GATEWAY_SECRET", "")
        if len(key) < 32:
            raise ValueError("DISCOVERY_GATEWAY_SECRET deve ter pelo menos 32 caracteres")

        def bounded(name, default, minimum, maximum):
            value = int(os.environ.get(name, default))
            if not minimum <= value <= maximum:
                raise ValueError(f"{name} fora dos limites operacionais")
            return value

        return cls(
            database_url=os.environ.get("DISCOVERY_DATABASE_URL", "sqlite:////data/discovery.db"),
            gateway_secret=key,
            redis_url=os.environ.get("DISCOVERY_REDIS_URL", ""),
            retention_days=bounded("DISCOVERY_RETENTION_DAYS", 30, 1, 365),
            max_hosts=bounded("DISCOVERY_MAX_HOSTS", 1024, 1, 1024),
            token_days=bounded("DISCOVERY_TOKEN_DAYS", 90, 1, 90),
            allow_loopback=os.environ.get("DISCOVERY_ALLOW_LOOPBACK") == "true",
        )
