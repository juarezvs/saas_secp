CREATE TABLE IF NOT EXISTS "estagios_supervisoes" (
  "id" UUID NOT NULL,
  "estagiario_servidor_id" UUID NOT NULL,
  "supervisor_servidor_id" UUID NOT NULL,
  "curso" VARCHAR(180),
  "data_inicio" DATE NOT NULL,
  "data_fim" DATE,
  "observacao" TEXT,
  "criado_por_usuario_id" UUID,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "estagios_supervisoes_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'estagios_supervisoes_estagiario_servidor_id_fkey'
  ) THEN
    ALTER TABLE "estagios_supervisoes"
      ADD CONSTRAINT "estagios_supervisoes_estagiario_servidor_id_fkey"
      FOREIGN KEY ("estagiario_servidor_id")
      REFERENCES "servidores"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'estagios_supervisoes_supervisor_servidor_id_fkey'
  ) THEN
    ALTER TABLE "estagios_supervisoes"
      ADD CONSTRAINT "estagios_supervisoes_supervisor_servidor_id_fkey"
      FOREIGN KEY ("supervisor_servidor_id")
      REFERENCES "servidores"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'estagios_supervisoes_criado_por_usuario_id_fkey'
  ) THEN
    ALTER TABLE "estagios_supervisoes"
      ADD CONSTRAINT "estagios_supervisoes_criado_por_usuario_id_fkey"
      FOREIGN KEY ("criado_por_usuario_id")
      REFERENCES "usuarios"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "estagios_supervisoes_estagiario_servidor_id_data_inicio_data_fim_idx"
  ON "estagios_supervisoes"("estagiario_servidor_id", "data_inicio", "data_fim");

CREATE INDEX IF NOT EXISTS "estagios_supervisoes_supervisor_servidor_id_idx"
  ON "estagios_supervisoes"("supervisor_servidor_id");

CREATE INDEX IF NOT EXISTS "estagios_supervisoes_criado_por_usuario_id_idx"
  ON "estagios_supervisoes"("criado_por_usuario_id");
