ALTER TYPE "StatusAcompanhamentoEstagio" ADD VALUE IF NOT EXISTS 'AGUARDANDO_SUPERVISOR';
ALTER TYPE "StatusAcompanhamentoEstagio" ADD VALUE IF NOT EXISTS 'DEVOLVIDO';

ALTER TABLE "acompanhamentos_estagio_mensais"
  ADD COLUMN IF NOT EXISTS "supervisor_assinado_por_id" UUID,
  ADD COLUMN IF NOT EXISTS "supervisor_assinado_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "assinatura_supervisor" JSONB,
  ADD COLUMN IF NOT EXISTS "devolucao_justificativa" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'acompanhamentos_estagio_mensais_supervisor_assinado_por_id_fkey'
  ) THEN
    ALTER TABLE "acompanhamentos_estagio_mensais"
      ADD CONSTRAINT "acompanhamentos_estagio_mensais_supervisor_assinado_por_id_fkey"
      FOREIGN KEY ("supervisor_assinado_por_id")
      REFERENCES "usuarios"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "acompanhamentos_estagio_mensais_supervisor_assinado_por_id_idx"
  ON "acompanhamentos_estagio_mensais"("supervisor_assinado_por_id");
