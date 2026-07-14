set -euo pipefail
cd /opt/secp/secp-app
limpa_env() { sed -n "s/^$1=//p" .env.production | tail -1 | sed 's/^"//; s/"$//; s/\r$//'; }
pg_user=$(limpa_env POSTGRES_USER)
pg_db=$(limpa_env POSTGRES_DB)
docker exec secp-postgres psql -U "$pg_user" -d "$pg_db" -c "select u.id, u.sigla, u.nome, o.sigla as orgao from unidade_organizacional u join orgao o on o.id=u.orgao_id where u.ativo = true order by case when u.sigla ilike '%NUTEC%' then 0 when u.sigla ilike '%SECAD%' then 1 when u.sigla ilike '%NUCGP%' then 2 when u.sigla ilike '%SJAM%' then 3 else 9 end, u.sigla limit 60;"