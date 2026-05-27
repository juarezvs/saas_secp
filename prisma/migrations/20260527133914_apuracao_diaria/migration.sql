-- CreateEnum
CREATE TYPE "StatusApuracaoDiaria" AS ENUM ('PENDENTE', 'CALCULADA', 'INCONSISTENTE', 'FECHADA', 'HOMOLOGADA');

-- CreateEnum
CREATE TYPE "ResultadoApuracaoDia" AS ENUM ('REGULAR', 'CREDITO', 'DEBITO', 'FALTA', 'INCOMPLETA', 'SEM_JORNADA', 'SEM_EXPEDIENTE');

-- CreateEnum
CREATE TYPE "TipoOcorrenciaFrequencia" AS ENUM ('MARCACAO_INCOMPLETA', 'INTERVALO_INVALIDO', 'CREDITO', 'DEBITO', 'FALTA', 'SEM_JORNADA', 'MARCACAO_DUPLICADA', 'HORA_NAO_AUTORIZADA');

-- CreateTable
CREATE TABLE "apuracoes_diarias" (
    "id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "jornada_servidor_id" UUID,
    "data_referencia" DATE NOT NULL,
    "carga_prevista_minutos" INTEGER NOT NULL DEFAULT 0,
    "minutos_trabalhados" INTEGER NOT NULL DEFAULT 0,
    "minutos_intervalo" INTEGER NOT NULL DEFAULT 0,
    "minutos_credito" INTEGER NOT NULL DEFAULT 0,
    "minutos_debito" INTEGER NOT NULL DEFAULT 0,
    "resultado" "ResultadoApuracaoDia" NOT NULL,
    "status" "StatusApuracaoDiaria" NOT NULL DEFAULT 'PENDENTE',
    "primeira_entrada" TIMESTAMP(3),
    "saida_intervalo" TIMESTAMP(3),
    "retorno_intervalo" TIMESTAMP(3),
    "ultima_saida" TIMESTAMP(3),
    "observacao" TEXT,
    "metadados" JSONB,
    "calculada_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apuracoes_diarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocorrencias_frequencia" (
    "id" UUID NOT NULL,
    "apuracao_diaria_id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "tipo" "TipoOcorrenciaFrequencia" NOT NULL,
    "descricao" TEXT NOT NULL,
    "minutos" INTEGER NOT NULL DEFAULT 0,
    "resolvida" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocorrencias_frequencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "apuracoes_diarias_servidor_id_idx" ON "apuracoes_diarias"("servidor_id");

-- CreateIndex
CREATE INDEX "apuracoes_diarias_jornada_servidor_id_idx" ON "apuracoes_diarias"("jornada_servidor_id");

-- CreateIndex
CREATE INDEX "apuracoes_diarias_data_referencia_idx" ON "apuracoes_diarias"("data_referencia");

-- CreateIndex
CREATE INDEX "apuracoes_diarias_resultado_idx" ON "apuracoes_diarias"("resultado");

-- CreateIndex
CREATE INDEX "apuracoes_diarias_status_idx" ON "apuracoes_diarias"("status");

-- CreateIndex
CREATE UNIQUE INDEX "apuracoes_diarias_servidor_id_data_referencia_key" ON "apuracoes_diarias"("servidor_id", "data_referencia");

-- CreateIndex
CREATE INDEX "ocorrencias_frequencia_apuracao_diaria_id_idx" ON "ocorrencias_frequencia"("apuracao_diaria_id");

-- CreateIndex
CREATE INDEX "ocorrencias_frequencia_servidor_id_idx" ON "ocorrencias_frequencia"("servidor_id");

-- CreateIndex
CREATE INDEX "ocorrencias_frequencia_tipo_idx" ON "ocorrencias_frequencia"("tipo");

-- CreateIndex
CREATE INDEX "ocorrencias_frequencia_resolvida_idx" ON "ocorrencias_frequencia"("resolvida");

-- AddForeignKey
ALTER TABLE "apuracoes_diarias" ADD CONSTRAINT "apuracoes_diarias_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apuracoes_diarias" ADD CONSTRAINT "apuracoes_diarias_jornada_servidor_id_fkey" FOREIGN KEY ("jornada_servidor_id") REFERENCES "jornadas_servidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias_frequencia" ADD CONSTRAINT "ocorrencias_frequencia_apuracao_diaria_id_fkey" FOREIGN KEY ("apuracao_diaria_id") REFERENCES "apuracoes_diarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias_frequencia" ADD CONSTRAINT "ocorrencias_frequencia_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
