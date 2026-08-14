ALTER TABLE "perfis" ADD COLUMN "orgao_id" UUID;

CREATE INDEX "perfis_orgao_id_idx" ON "perfis"("orgao_id");

ALTER TABLE "perfis"
  ADD CONSTRAINT "perfis_orgao_id_fkey"
  FOREIGN KEY ("orgao_id") REFERENCES "orgaos"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
