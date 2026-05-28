-- AlterTable
ALTER TABLE "marcacoes_brutas" ADD COLUMN     "arquivo_afd_id" UUID;

-- AddForeignKey
ALTER TABLE "marcacoes_brutas" ADD CONSTRAINT "marcacoes_brutas_arquivo_afd_id_fkey" FOREIGN KEY ("arquivo_afd_id") REFERENCES "afd_arquivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
