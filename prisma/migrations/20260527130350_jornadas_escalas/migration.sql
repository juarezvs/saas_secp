-- CreateEnum
CREATE TYPE "TipoJornada" AS ENUM ('SETE_HORAS', 'OITO_HORAS', 'ESPECIAL');

-- CreateEnum
CREATE TYPE "TipoEscala" AS ENUM ('SEMANAL', 'REVEZAMENTO', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO');

-- CreateTable
CREATE TABLE "jornadas" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(80) NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoJornada" NOT NULL,
    "carga_diaria_minutos" INTEGER NOT NULL,
    "exige_intervalo" BOOLEAN NOT NULL DEFAULT false,
    "intervalo_minimo_minutos" INTEGER,
    "intervalo_maximo_minutos" INTEGER,
    "horario_entrada_padrao" VARCHAR(5),
    "horario_saida_padrao" VARCHAR(5),
    "horario_diferenciado_permitido" BOOLEAN NOT NULL DEFAULT false,
    "entrada_minima_diferenciada" VARCHAR(5),
    "saida_maxima_diferenciada" VARCHAR(5),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jornadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalas" (
    "id" UUID NOT NULL,
    "jornada_id" UUID NOT NULL,
    "codigo" VARCHAR(80) NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoEscala" NOT NULL DEFAULT 'SEMANAL',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalas_dias" (
    "id" UUID NOT NULL,
    "escala_id" UUID NOT NULL,
    "dia_semana" "DiaSemana" NOT NULL,
    "trabalha" BOOLEAN NOT NULL DEFAULT true,
    "horario_entrada" VARCHAR(5),
    "horario_saida" VARCHAR(5),
    "intervalo_inicio" VARCHAR(5),
    "intervalo_fim" VARCHAR(5),
    "carga_prevista_minutos" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalas_dias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jornadas_servidores" (
    "id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "jornada_id" UUID NOT NULL,
    "escala_id" UUID,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "justificativa" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jornadas_servidores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jornadas_codigo_key" ON "jornadas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "escalas_codigo_key" ON "escalas"("codigo");

-- CreateIndex
CREATE INDEX "escalas_jornada_id_idx" ON "escalas"("jornada_id");

-- CreateIndex
CREATE INDEX "escalas_dias_escala_id_idx" ON "escalas_dias"("escala_id");

-- CreateIndex
CREATE UNIQUE INDEX "escalas_dias_escala_id_dia_semana_key" ON "escalas_dias"("escala_id", "dia_semana");

-- CreateIndex
CREATE INDEX "jornadas_servidores_servidor_id_idx" ON "jornadas_servidores"("servidor_id");

-- CreateIndex
CREATE INDEX "jornadas_servidores_jornada_id_idx" ON "jornadas_servidores"("jornada_id");

-- CreateIndex
CREATE INDEX "jornadas_servidores_escala_id_idx" ON "jornadas_servidores"("escala_id");

-- CreateIndex
CREATE INDEX "jornadas_servidores_ativo_idx" ON "jornadas_servidores"("ativo");

-- AddForeignKey
ALTER TABLE "escalas" ADD CONSTRAINT "escalas_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornadas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalas_dias" ADD CONSTRAINT "escalas_dias_escala_id_fkey" FOREIGN KEY ("escala_id") REFERENCES "escalas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornadas_servidores" ADD CONSTRAINT "jornadas_servidores_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornadas_servidores" ADD CONSTRAINT "jornadas_servidores_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornadas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornadas_servidores" ADD CONSTRAINT "jornadas_servidores_escala_id_fkey" FOREIGN KEY ("escala_id") REFERENCES "escalas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
