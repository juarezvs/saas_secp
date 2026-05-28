/*
  Warnings:

  - A unique constraint covering the columns `[cpf]` on the table `servidores` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "servidores" ADD COLUMN     "cpf" VARCHAR(11);

-- CreateIndex
CREATE UNIQUE INDEX "servidores_cpf_key" ON "servidores"("cpf");
