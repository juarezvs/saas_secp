CREATE TYPE "TipoLiberacaoRotina" AS ENUM ('ROTINA', 'PERMISSAO');

CREATE TABLE "rotinas_liberacoes" (
    "id" UUID NOT NULL,
    "tipo" "TipoLiberacaoRotina" NOT NULL,
    "chave" VARCHAR(160) NOT NULL,
    "liberada" BOOLEAN NOT NULL DEFAULT true,
    "atualizado_por_usuario_id" UUID,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rotinas_liberacoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rotinas_liberacoes_tipo_chave_key" ON "rotinas_liberacoes"("tipo", "chave");
CREATE INDEX "rotinas_liberacoes_tipo_idx" ON "rotinas_liberacoes"("tipo");
CREATE INDEX "rotinas_liberacoes_liberada_idx" ON "rotinas_liberacoes"("liberada");
