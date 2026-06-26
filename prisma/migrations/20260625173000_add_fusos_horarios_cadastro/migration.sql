CREATE TABLE "fusos_horarios" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "valor" VARCHAR(80) NOT NULL,
  "rotulo" VARCHAR(120) NOT NULL,
  "descricao" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "fusos_horarios_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fusos_horarios_valor_key" ON "fusos_horarios"("valor");
CREATE INDEX "fusos_horarios_ativo_idx" ON "fusos_horarios"("ativo");

INSERT INTO "fusos_horarios" ("valor", "rotulo", "descricao", "ativo", "atualizado_em")
VALUES
  ('America/Manaus', 'Manaus (UTC-04)', 'Fuso horário padrão da Seção Judiciária do Amazonas.', true, CURRENT_TIMESTAMP),
  ('America/Eirunepe', 'Tabatinga/Eirunepé (UTC-05)', 'Fuso horário usado por localidades do Amazonas uma hora atrás de Manaus.', true, CURRENT_TIMESTAMP),
  ('America/Rio_Branco', 'Rio Branco (UTC-05)', 'Fuso horário equivalente para integrações ou unidades no Acre.', true, CURRENT_TIMESTAMP)
ON CONFLICT ("valor") DO NOTHING;
