ALTER TABLE "integracoes_sistemas" ADD COLUMN "orgao_id" UUID;

CREATE INDEX "integracoes_sistemas_orgao_id_idx" ON "integracoes_sistemas"("orgao_id");

ALTER TABLE "integracoes_sistemas"
ADD CONSTRAINT "integracoes_sistemas_orgao_id_fkey"
FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
