# Containers reiniciando

1. Execute `docker ps --filter name=secp-`.
2. Consulte `docker inspect --format '{{.RestartCount}}' <container>`.
3. Leia logs recentes.
4. Verifique OOM com `dmesg -T | grep -i oom`.

