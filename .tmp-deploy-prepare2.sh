set -euo pipefail
cd /opt/secp/secp-app
pg_user=$(sed -n 's/^POSTGRES_USER=//p' .env.production | tail -1)
pg_db=$(sed -n 's/^POSTGRES_DB=//p' .env.production | tail -1)
mkdir -p observability/secrets docker/pgbouncer
if [ ! -s observability/secrets/secp_metrics_token ]; then
  openssl rand -hex 32 > observability/secrets/secp_metrics_token
  chmod 600 observability/secrets/secp_metrics_token
fi
docker exec secp-postgres psql -U "$pg_user" -d "$pg_db" -tAc "select chr(34) || rolname || chr(34) || ' ' || chr(34) || rolpassword || chr(34) from pg_authid where rolname = current_user" > docker/pgbouncer/userlist.txt
chmod 600 docker/pgbouncer/userlist.txt
echo prepared
sed -n 's/^APP_VERSION=.*/APP_VERSION=<updated>/p' .env.production
ls -l docker/pgbouncer/userlist.txt observability/secrets/secp_metrics_token