# PgBouncer do SECP

Em producao, o PgBouncer roda no servidor da aplicacao e aponta para o PostgreSQL dedicado em `172.19.5.37:5432`.
Em desenvolvimento, `compose.local.yaml` usa `docker/pgbouncer/pgbouncer.local.ini`, apontando para o Postgres local do Docker.

Crie `docker/pgbouncer/userlist.txt` fora do Git antes de subir o PgBouncer. O SECP usa `scram-sha-256`, entao o arquivo deve receber o verificador SCRAM do usuario do banco:

```text
"secp" "SCRAM-SHA-256$4096:..."
```

Para atualizar esse valor com seguranca:

```bash
docker exec -it secp-db-postgres psql -U postgres -d postgres
ALTER ROLE secp WITH PASSWORD '<SENHA_FORTE>';
SELECT rolpassword FROM pg_authid WHERE rolname = 'secp';
```

Copie o valor retornado por `rolpassword` para `docker/pgbouncer/userlist.txt`, no formato `"secp" "<VALOR_SCRAM>"`.
Quando a senha do banco mudar, atualize tambem o `userlist.txt` no servidor da aplicacao e reinicie `secp-pgbouncer`.
