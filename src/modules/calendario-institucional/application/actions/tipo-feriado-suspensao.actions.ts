"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

const permissoesCadastro = [
  "tipoferiado:cadastrar:seccional",
  "tipoferiado:cadastrar:master",
  "configuracoes:gerenciar:seccional",
  "configuracoes:gerenciar:global",
];

const schema = z.object({
  id: z.string().uuid().optional(),
  codigo: z.enum([
    "FERIADO",
    "PONTO_FACULTATIVO",
    "SUSPENSAO_EXPEDIENTE",
    "TELETRABALHO_INTEGRAL_EXTRAORDINARIO",
  ]),
  nome: z.string().trim().min(3).max(120),
  descricao: z.string().trim().max(1000).optional(),
});

export async function salvarTipoFeriadoSuspensaoAction(formData: FormData) {
  await exigirUmaDasPermissoesOuRedirecionar(permissoesCadastro);
  const dados = schema.parse({
    id: String(formData.get("id") ?? "") || undefined,
    codigo: String(formData.get("codigo") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
  });
  const existente = await prisma.tipoFeriadoSuspensao.findUnique({ where: { codigo: dados.codigo }, select: { origem: true } });
  if (existente?.origem === "SARH") throw new Error("Registros com origem SARH não podem ser alterados.");

  await prisma.tipoFeriadoSuspensao.upsert({
    where: { codigo: dados.codigo },
    create: { ...dados, origem: "SECP" },
    update: { nome: dados.nome, descricao: dados.descricao, ativo: true },
  });
  revalidatePath("/cadastros-auxiliares/tipos-feriados-suspensoes");
  revalidatePath("/administracao/calendario");
}

export async function alternarTipoFeriadoSuspensaoAction(formData: FormData) {
  await exigirUmaDasPermissoesOuRedirecionar(permissoesCadastro);
  const id = String(formData.get("id") ?? "");
  const atual = await prisma.tipoFeriadoSuspensao.findUniqueOrThrow({
    where: { id },
  });
  if (atual.origem === "SARH") throw new Error("Registros com origem SARH não podem ser alterados.");
  await prisma.tipoFeriadoSuspensao.update({
    where: { id },
    data: { ativo: !atual.ativo },
  });
  revalidatePath("/cadastros-auxiliares/tipos-feriados-suspensoes");
}
