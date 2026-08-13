CREATE TYPE "StatusCalculoHoraExtra" AS ENUM (
  'CALCULADO',
  'ERRO',
  'CANCELADO'
);

CREATE TABLE "horas_extras_calculos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "autorizacao_id" UUID NOT NULL,
  "calculado_por_usuario_id" UUID,
  "competencia" VARCHAR(7) NOT NULL,
  "status" "StatusCalculoHoraExtra" NOT NULL DEFAULT 'CALCULADO',
  "versao" INTEGER NOT NULL DEFAULT 1,
  "total_servidores" INTEGER NOT NULL DEFAULT 0,
  "total_minutos" INTEGER NOT NULL DEFAULT 0,
  "total_valor_centavos" INTEGER NOT NULL DEFAULT 0,
  "divisor_minutos" INTEGER NOT NULL,
  "politica_versao_id" UUID,
  "memoria_calculo" JSONB,
  "erro_mensagem" TEXT,
  "calculado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "horas_extras_calculos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "horas_extras_calculos_itens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "calculo_id" UUID NOT NULL,
  "servidor_autorizado_id" UUID NOT NULL,
  "classificacao_intervalo_id" UUID NOT NULL,
  "data" DATE NOT NULL,
  "inicio" VARCHAR(5) NOT NULL,
  "fim" VARCHAR(5) NOT NULL,
  "minutos" INTEGER NOT NULL,
  "tipo_dia" "OvertimeDayType" NOT NULL,
  "vigencia_remuneratoria_id" VARCHAR(160) NOT NULL,
  "remuneracao_base_centavos" INTEGER NOT NULL,
  "divisor_minutos" INTEGER NOT NULL,
  "percentual" DECIMAL(7,4) NOT NULL,
  "rubrica" VARCHAR(80),
  "valor_centavos" INTEGER NOT NULL,
  "memoria_calculo" JSONB,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "horas_extras_calculos_itens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "horas_extras_remuneracoes_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "calculo_id" UUID NOT NULL,
  "servidor_autorizado_id" UUID NOT NULL,
  "vigencia_id" VARCHAR(160) NOT NULL,
  "inicio" DATE NOT NULL,
  "fim" DATE,
  "remuneracao_base_centavos" INTEGER NOT NULL,
  "origem" VARCHAR(40) NOT NULL,
  "fonte_documento" VARCHAR(200),
  "consultado_em" TIMESTAMP(3),
  "payload" JSONB,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "horas_extras_remuneracoes_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "horas_extras_calculos_itens_calculo_id_classificacao_key"
  ON "horas_extras_calculos_itens"("calculo_id", "classificacao_intervalo_id");
CREATE UNIQUE INDEX "horas_extras_remuneracoes_snapshots_calculo_servidor_vigencia_key"
  ON "horas_extras_remuneracoes_snapshots"("calculo_id", "servidor_autorizado_id", "vigencia_id");

CREATE INDEX "horas_extras_calculos_autorizacao_id_idx" ON "horas_extras_calculos"("autorizacao_id");
CREATE INDEX "horas_extras_calculos_competencia_idx" ON "horas_extras_calculos"("competencia");
CREATE INDEX "horas_extras_calculos_status_idx" ON "horas_extras_calculos"("status");
CREATE INDEX "horas_extras_calculos_calculado_por_usuario_id_idx" ON "horas_extras_calculos"("calculado_por_usuario_id");
CREATE INDEX "horas_extras_calculos_calculado_em_idx" ON "horas_extras_calculos"("calculado_em");

CREATE INDEX "horas_extras_calculos_itens_calculo_id_idx" ON "horas_extras_calculos_itens"("calculo_id");
CREATE INDEX "horas_extras_calculos_itens_servidor_autorizado_id_idx" ON "horas_extras_calculos_itens"("servidor_autorizado_id");
CREATE INDEX "horas_extras_calculos_itens_classificacao_intervalo_id_idx" ON "horas_extras_calculos_itens"("classificacao_intervalo_id");
CREATE INDEX "horas_extras_calculos_itens_data_idx" ON "horas_extras_calculos_itens"("data");
CREATE INDEX "horas_extras_calculos_itens_tipo_dia_idx" ON "horas_extras_calculos_itens"("tipo_dia");

CREATE INDEX "horas_extras_remuneracoes_snapshots_calculo_id_idx" ON "horas_extras_remuneracoes_snapshots"("calculo_id");
CREATE INDEX "horas_extras_remuneracoes_snapshots_servidor_autorizado_id_idx" ON "horas_extras_remuneracoes_snapshots"("servidor_autorizado_id");
CREATE INDEX "horas_extras_remuneracoes_snapshots_vigencia_id_idx" ON "horas_extras_remuneracoes_snapshots"("vigencia_id");

ALTER TABLE "horas_extras_calculos"
  ADD CONSTRAINT "horas_extras_calculos_autorizacao_id_fkey"
  FOREIGN KEY ("autorizacao_id") REFERENCES "autorizacoes_horas_extras"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "horas_extras_calculos"
  ADD CONSTRAINT "horas_extras_calculos_calculado_por_usuario_id_fkey"
  FOREIGN KEY ("calculado_por_usuario_id") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "horas_extras_calculos_itens"
  ADD CONSTRAINT "horas_extras_calculos_itens_calculo_id_fkey"
  FOREIGN KEY ("calculo_id") REFERENCES "horas_extras_calculos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "horas_extras_calculos_itens"
  ADD CONSTRAINT "horas_extras_calculos_itens_servidor_autorizado_id_fkey"
  FOREIGN KEY ("servidor_autorizado_id") REFERENCES "autorizacoes_horas_extras_servidores"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "horas_extras_calculos_itens"
  ADD CONSTRAINT "horas_extras_calculos_itens_classificacao_intervalo_id_fkey"
  FOREIGN KEY ("classificacao_intervalo_id") REFERENCES "horas_extras_classificacoes_intervalos"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "horas_extras_remuneracoes_snapshots"
  ADD CONSTRAINT "horas_extras_remuneracoes_snapshots_calculo_id_fkey"
  FOREIGN KEY ("calculo_id") REFERENCES "horas_extras_calculos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "horas_extras_remuneracoes_snapshots"
  ADD CONSTRAINT "horas_extras_remuneracoes_snapshots_servidor_autorizado_id_fkey"
  FOREIGN KEY ("servidor_autorizado_id") REFERENCES "autorizacoes_horas_extras_servidores"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
