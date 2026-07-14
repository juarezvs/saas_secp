DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'secp_monitor') THEN
    CREATE ROLE secp_monitor LOGIN PASSWORD 'trocar_antes_de_usar';
  END IF;
END
$$;

GRANT pg_monitor TO secp_monitor;
GRANT CONNECT ON DATABASE secp TO secp_monitor;

-- Ajuste o nome do banco acima se POSTGRES_DB for diferente de secp.
-- DSN esperado em observability/secrets/postgres_exporter_dsn:
-- postgresql://secp_monitor:SENHA@secp-postgres:5432/NOME_DO_BANCO?sslmode=disable

