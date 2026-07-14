# Filas BullMQ do SECP

1. Verifique `secp_queue_healthy` para saber se o Redis esta respondendo.
2. Consulte `secp_queue_jobs{state="failed"}` por fila.
3. Abra a tela administrativa de workers no SECP.
4. Consulte logs do worker correspondente antes de reprocessar jobs.

