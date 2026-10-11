# Disco do host

1. Execute `df -h` e `df -ih`.
2. Verifique crescimento de `/srv/observability/prometheus`.
3. Confirme retencao `15d/40GB`.
4. Verifique imagens e cache com `docker system df`.
5. Para remover somente artefatos Docker sem uso, execute `docker image prune -a -f --filter "until=168h"` e `docker builder prune -a -f --filter "until=24h"`.
6. Se o Redis reportar `MISCONF` depois de liberar espaco, execute `docker exec secp-redis redis-cli BGSAVE` e confirme `rdb_last_bgsave_status:ok` em `redis-cli INFO persistence`.
7. Nao apague volumes Docker sem backup e confirmacao explicita.

