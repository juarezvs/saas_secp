ALTER TABLE "fechamentos_mensais_unidades"
  ADD COLUMN IF NOT EXISTS "total_servidores" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_pendentes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_com_pendencias" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_homologados" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_homologados_com_ressalva" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_devolvidos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_carga_prevista_minutos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_minutos_trabalhados" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_minutos_credito" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_minutos_debito" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_faltas" INTEGER NOT NULL DEFAULT 0;

UPDATE "fechamentos_mensais_unidades" f
SET
  "total_servidores" = resumo.total_servidores,
  "total_pendentes" = resumo.total_pendentes,
  "total_com_pendencias" = resumo.total_com_pendencias,
  "total_homologados" = resumo.total_homologados,
  "total_homologados_com_ressalva" = resumo.total_homologados_com_ressalva,
  "total_devolvidos" = resumo.total_devolvidos,
  "total_carga_prevista_minutos" = resumo.total_carga_prevista_minutos,
  "total_minutos_trabalhados" = resumo.total_minutos_trabalhados,
  "total_minutos_credito" = resumo.total_minutos_credito,
  "total_minutos_debito" = resumo.total_minutos_debito,
  "total_faltas" = resumo.total_faltas
FROM (
  SELECT
    "fechamento_id",
    COUNT(*)::INTEGER AS total_servidores,
    COUNT(*) FILTER (WHERE "status" = 'PENDENTE')::INTEGER AS total_pendentes,
    COUNT(*) FILTER (WHERE "status" = 'COM_PENDENCIAS')::INTEGER AS total_com_pendencias,
    COUNT(*) FILTER (WHERE "status" = 'HOMOLOGADO')::INTEGER AS total_homologados,
    COUNT(*) FILTER (WHERE "status" = 'HOMOLOGADO_COM_RESSALVA')::INTEGER AS total_homologados_com_ressalva,
    COUNT(*) FILTER (WHERE "status" = 'DEVOLVIDO')::INTEGER AS total_devolvidos,
    COALESCE(SUM("carga_prevista_minutos"), 0)::INTEGER AS total_carga_prevista_minutos,
    COALESCE(SUM("minutos_trabalhados"), 0)::INTEGER AS total_minutos_trabalhados,
    COALESCE(SUM("minutos_credito"), 0)::INTEGER AS total_minutos_credito,
    COALESCE(SUM("minutos_debito"), 0)::INTEGER AS total_minutos_debito,
    COALESCE(SUM("faltas"), 0)::INTEGER AS total_faltas
  FROM "homologacoes_servidores_meses"
  GROUP BY "fechamento_id"
) resumo
WHERE f."id" = resumo."fechamento_id";
