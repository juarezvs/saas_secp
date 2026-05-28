-- CreateEnum
CREATE TYPE "StatusImportacaoAfd" AS ENUM ('RECEBIDA', 'EM_PROCESSAMENTO', 'PROCESSADA', 'PROCESSADA_COM_ERROS', 'ERRO');

-- CreateEnum
CREATE TYPE "StatusArquivoAfd" AS ENUM ('RECEBIDO', 'PROCESSANDO', 'PROCESSADO', 'PROCESSADO_COM_ERROS', 'ERRO');

-- CreateTable
CREATE TABLE "afd_importacoes" (
    "id" UUID NOT NULL,
    "status" "StatusImportacaoAfd" NOT NULL DEFAULT 'RECEBIDA',
    "quantidade_arquivos" INTEGER NOT NULL DEFAULT 0,
    "total_linhas" INTEGER NOT NULL DEFAULT 0,
    "total_marcacoes_brutas" INTEGER NOT NULL DEFAULT 0,
    "total_duplicadas" INTEGER NOT NULL DEFAULT 0,
    "total_processadas" INTEGER NOT NULL DEFAULT 0,
    "total_pendentes" INTEGER NOT NULL DEFAULT 0,
    "total_erros" INTEGER NOT NULL DEFAULT 0,
    "criado_por_usuario_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciado_em" TIMESTAMP(3),
    "finalizado_em" TIMESTAMP(3),
    "observacao" TEXT,
    "metadados" JSONB,

    CONSTRAINT "afd_importacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "afd_arquivos" (
    "id" UUID NOT NULL,
    "importacao_id" UUID NOT NULL,
    "status" "StatusArquivoAfd" NOT NULL DEFAULT 'RECEBIDO',
    "nome_original" VARCHAR(255) NOT NULL,
    "caminho_arquivo" TEXT NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL DEFAULT 0,
    "hash_arquivo" VARCHAR(128) NOT NULL,
    "equipamento_codigo" VARCHAR(80),
    "total_linhas" INTEGER NOT NULL DEFAULT 0,
    "total_marcacoes_brutas" INTEGER NOT NULL DEFAULT 0,
    "total_duplicadas" INTEGER NOT NULL DEFAULT 0,
    "total_processadas" INTEGER NOT NULL DEFAULT 0,
    "total_pendentes" INTEGER NOT NULL DEFAULT 0,
    "total_erros" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciado_em" TIMESTAMP(3),
    "finalizado_em" TIMESTAMP(3),

    CONSTRAINT "afd_arquivos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "afd_importacoes_status_idx" ON "afd_importacoes"("status");

-- CreateIndex
CREATE INDEX "afd_importacoes_criado_em_idx" ON "afd_importacoes"("criado_em");

-- CreateIndex
CREATE INDEX "afd_arquivos_importacao_id_idx" ON "afd_arquivos"("importacao_id");

-- CreateIndex
CREATE INDEX "afd_arquivos_status_idx" ON "afd_arquivos"("status");

-- CreateIndex
CREATE UNIQUE INDEX "afd_arquivos_hash_arquivo_key" ON "afd_arquivos"("hash_arquivo");

-- AddForeignKey
ALTER TABLE "afd_arquivos" ADD CONSTRAINT "afd_arquivos_importacao_id_fkey" FOREIGN KEY ("importacao_id") REFERENCES "afd_importacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
