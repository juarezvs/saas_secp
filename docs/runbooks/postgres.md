# PostgreSQL

Em producao, o PostgreSQL do SECP fica no servidor dedicado `172.19.5.37`, em `/opt/secp-db`, container `secp-db-postgres`.
O servidor da aplicacao mantem apenas `secp-pgbouncer`, apontando para esse banco remoto.

1. No servidor da aplicacao, valide a aplicacao e o pool: `curl -fsS http://127.0.0.1:3000/api/ready` e `docker exec secp-pgbouncer pg_isready -h 127.0.0.1 -p 6432 -U secp -d secp_prod`.
2. No servidor de banco, valide o Postgres: `ssh nutec@172.19.5.37 'cd /opt/secp-db && docker compose ps && docker exec secp-db-postgres pg_isready -U secp -d secp_prod -h localhost'`.
3. Verifique conexoes em uso no dashboard ou via `pg_stat_activity`.
4. Confirme se o usuario `secp_monitor` ainda possui `pg_monitor`, quando a observabilidade estiver ativa.
5. Antes de deploys ou manutencoes, gere backup no servidor de banco ou por `pg_dump` contra `172.19.5.37:5432`.
6. Nao rode migrations, `VACUUM FULL`, reset ou remocao de volume sem janela e backup validado.

Nunca remova o volume do banco dedicado em `172.19.5.37`. O container antigo `secp-postgres` no servidor da aplicacao nao deve existir em producao.
