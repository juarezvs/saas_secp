# SECP app down

1. Verifique `docker ps --filter name=secp-web`.
2. Consulte logs recentes com `docker logs --tail=200 secp-web`.
3. Teste `curl -fsS http://127.0.0.1:3000/api/health`.
4. Se `/api/health` responde e `/api/metrics` nao, valide o token `SECP_METRICS_TOKEN`.
5. Evite reinicio antes de coletar CPU, memoria e logs.

