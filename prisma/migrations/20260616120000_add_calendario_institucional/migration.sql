-- CreateEnum
CREATE TYPE "TipoCalendarioInstitucional" AS ENUM ('FERIADO', 'PONTO_FACULTATIVO', 'SUSPENSAO_EXPEDIENTE');

-- CreateTable
CREATE TABLE "calendarios_institucionais" (
    "id" UUID NOT NULL,
    "data_referencia" DATE NOT NULL,
    "descricao" VARCHAR(200) NOT NULL,
    "tipo" "TipoCalendarioInstitucional" NOT NULL,
    "conta_como_dia_util" BOOLEAN NOT NULL DEFAULT false,
    "gera_apuracao_regular" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendarios_institucionais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calendarios_institucionais_data_referencia_key" ON "calendarios_institucionais"("data_referencia");

-- CreateIndex
CREATE INDEX "calendarios_institucionais_data_referencia_idx" ON "calendarios_institucionais"("data_referencia");

-- CreateIndex
CREATE INDEX "calendarios_institucionais_tipo_idx" ON "calendarios_institucionais"("tipo");

-- CreateIndex
CREATE INDEX "calendarios_institucionais_ativo_idx" ON "calendarios_institucionais"("ativo");
