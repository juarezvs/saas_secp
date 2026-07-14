set -euo pipefail
cd /opt/secp/secp-app
stamp=202607141410
mkdir -p /opt/secp/backups
cp .env.production /opt/secp/backups/.env.production.bak-$stamp
tar --exclude='./secp-deploy-*.tar.gz' --exclude='./backups' --exclude='./files_afd' --exclude='./import/_upload' --exclude='./.storage' -czf /opt/secp/backups/secp-app-before-$stamp.tar.gz .
tar -xzf secp-deploy-20260714140939.tar.gz
cp /opt/secp/backups/.env.production.bak-$stamp .env.production
mv Dockerfile.pending Dockerfile
if grep -q '^APP_VERSION=' .env.production; then
  sed -i 's/^APP_VERSION=.*/APP_VERSION=202607141410_prod/' .env.production
else
  printf '\nAPP_VERSION=202607141410_prod\n' >> .env.production
fi
mkdir -p observability/secrets docker/pgbouncer
if [ ! -s observability/secrets/secp_metrics_token ]; then
  openssl rand -hex 32 > observability/secrets/secp_metrics_token
  chmod 600 observability/secrets/secp_metrics_token
fi
set -a
. ./.env.production
set +a
docker exec secp-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select chr(34) || rolname || chr(34) || ' ' || chr(34) || rolpassword || chr(34) from pg_authid where rolname = current_user" > docker/pgbouncer/userlist.txt
chmod 600 docker/pgbouncer/userlist.txt
echo prepared
sed -n 's/^APP_VERSION=.*/APP_VERSION=<updated>/p' .env.production
ls -l docker/pgbouncer/userlist.txt observability/secrets/secp_metrics_token