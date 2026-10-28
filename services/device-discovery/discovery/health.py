import os
import sys
import time
from pathlib import Path

import httpx


def main():
    if "worker" in sys.argv:
        age = time.time() - float(Path("/data/worker-heartbeat").read_text())
        sys.exit(0 if 0 <= age < 35 else 1)
    scheme = "https" if os.environ.get("DISCOVERY_TLS_CERT") else "http"
    url = os.environ.get("DISCOVERY_HEALTH_URL") or f"{scheme}://127.0.0.1:8000/health/ready"
    with httpx.Client(verify=os.environ.get("DISCOVERY_CA_FILE") or True, timeout=3, trust_env=False) as client:
        response = client.get(url)
        sys.exit(0 if response.is_success else 1)


if __name__ == "__main__":
    main()
