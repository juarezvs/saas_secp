# PgBouncer local

Crie `docker/pgbouncer/userlist.txt` fora do Git antes de subir PgBouncer:

```text
"secp" "md5<hash-md5-senha+usuario>"
```

Para gerar o hash:

```bash
printf '%s%s' 'SENHA_DO_POSTGRES' 'secp' | md5sum
```

O valor final precisa ser `md5` + hash.
