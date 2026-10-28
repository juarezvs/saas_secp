import json
import logging
import signal
import threading
import time
from pathlib import Path

from .central import maintain
from .config import Settings
from .db import database


def main():
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    settings = Settings.load()
    engine, sessions = database(settings.database_url)
    stopped = threading.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: stopped.set())
    redis = None
    if settings.redis_url:
        from redis import Redis

        redis = Redis.from_url(settings.redis_url, socket_timeout=2, socket_connect_timeout=2)
    while not stopped.is_set():
        try:
            with sessions.begin() as db:
                maintain(db, settings)
            Path("/data/worker-heartbeat").write_text(str(time.time()))
            if redis:
                redis.set("secp:discovery:worker:heartbeat", "1", ex=30)
                redis.publish("secp:discovery:updates", "refresh")
        except Exception as error:
            logging.warning(json.dumps({"event": "maintenance_error", "error_type": type(error).__name__}))
        stopped.wait(10)
    engine.dispose()


if __name__ == "__main__":
    main()
