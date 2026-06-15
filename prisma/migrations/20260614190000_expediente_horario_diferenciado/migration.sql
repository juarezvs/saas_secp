ALTER TABLE "jornadas_servidores"
ADD COLUMN "horario_diferenciado_autorizado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "autorizado_por_usuario_id" UUID,
ADD COLUMN "autorizado_em" TIMESTAMP(3);

CREATE INDEX "jornadas_servidores_autorizado_por_usuario_id_idx"
ON "jornadas_servidores"("autorizado_por_usuario_id");

ALTER TABLE "jornadas_servidores"
ADD CONSTRAINT "jornadas_servidores_autorizado_por_usuario_id_fkey"
FOREIGN KEY ("autorizado_por_usuario_id")
REFERENCES "usuarios"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
