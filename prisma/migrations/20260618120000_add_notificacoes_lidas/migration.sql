CREATE TABLE "notificacoes_lidas" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "notificacao_id" VARCHAR(160) NOT NULL,
    "lida_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_lidas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notificacoes_lidas_usuario_id_notificacao_id_key" ON "notificacoes_lidas"("usuario_id", "notificacao_id");
CREATE INDEX "notificacoes_lidas_usuario_id_idx" ON "notificacoes_lidas"("usuario_id");
CREATE INDEX "notificacoes_lidas_notificacao_id_idx" ON "notificacoes_lidas"("notificacao_id");

ALTER TABLE "notificacoes_lidas"
ADD CONSTRAINT "notificacoes_lidas_usuario_id_fkey"
FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
