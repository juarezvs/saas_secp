-- CreateEnum
CREATE TYPE "StatusCadastroFacial" AS ENUM ('PENDENTE', 'ATIVO', 'BLOQUEADO', 'REVOGADO');

-- CreateEnum
CREATE TYPE "TipoAmostraFacial" AS ENUM ('CADASTRO', 'VALIDACAO', 'LIVENESS');

-- CreateTable
CREATE TABLE "biometrias_faciais_servidores" (
    "id" UUID NOT NULL,
    "servidor_id" UUID NOT NULL,
    "status" "StatusCadastroFacial" NOT NULL DEFAULT 'PENDENTE',
    "algoritmo" VARCHAR(120) NOT NULL DEFAULT 'human-face-description',
    "versao_algoritmo" VARCHAR(80),
    "template" JSONB NOT NULL,
    "template_dimensao" INTEGER NOT NULL,
    "qualidade_media" DOUBLE PRECISION,
    "amostras_quantidade" INTEGER NOT NULL DEFAULT 0,
    "limiar_distancia" DOUBLE PRECISION NOT NULL DEFAULT 0.55,
    "termo_aceite_em" TIMESTAMP(3),
    "cadastrado_por_usuario_id" UUID,
    "atualizado_por_usuario_id" UUID,
    "revogado_por_usuario_id" UUID,
    "revogado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biometrias_faciais_servidores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometrias_faciais_amostras" (
    "id" UUID NOT NULL,
    "biometria_id" UUID,
    "servidor_id" UUID NOT NULL,
    "tipo" "TipoAmostraFacial" NOT NULL,
    "template" JSONB,
    "qualidade" DOUBLE PRECISION,
    "distancia" DOUBLE PRECISION,
    "similaridade" DOUBLE PRECISION,
    "validada" BOOLEAN NOT NULL DEFAULT false,
    "metadados" JSONB,
    "criado_por_usuario_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometrias_faciais_amostras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "biometrias_faciais_servidores_servidor_id_key" ON "biometrias_faciais_servidores"("servidor_id");

-- CreateIndex
CREATE INDEX "biometrias_faciais_servidores_status_idx" ON "biometrias_faciais_servidores"("status");

-- CreateIndex
CREATE INDEX "biometrias_faciais_amostras_biometria_id_idx" ON "biometrias_faciais_amostras"("biometria_id");

-- CreateIndex
CREATE INDEX "biometrias_faciais_amostras_servidor_id_idx" ON "biometrias_faciais_amostras"("servidor_id");

-- CreateIndex
CREATE INDEX "biometrias_faciais_amostras_tipo_idx" ON "biometrias_faciais_amostras"("tipo");

-- CreateIndex
CREATE INDEX "biometrias_faciais_amostras_validada_idx" ON "biometrias_faciais_amostras"("validada");

-- CreateIndex
CREATE INDEX "biometrias_faciais_amostras_criado_em_idx" ON "biometrias_faciais_amostras"("criado_em");

-- AddForeignKey
ALTER TABLE "biometrias_faciais_servidores" ADD CONSTRAINT "biometrias_faciais_servidores_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometrias_faciais_amostras" ADD CONSTRAINT "biometrias_faciais_amostras_biometria_id_fkey" FOREIGN KEY ("biometria_id") REFERENCES "biometrias_faciais_servidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometrias_faciais_amostras" ADD CONSTRAINT "biometrias_faciais_amostras_servidor_id_fkey" FOREIGN KEY ("servidor_id") REFERENCES "servidores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
