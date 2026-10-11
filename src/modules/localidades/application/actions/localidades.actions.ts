"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { sincronizarLocalidadesIbgeService } from "@/modules/localidades/application/services/sincronizar-localidades-ibge.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

const caminho = "/cadastros-auxiliares/estados-cidades";
const permissoesCadastro = [
  "localidade:cadastrar:seccional",
  "localidade:cadastrar:master",
  "configuracoes:gerenciar:seccional",
  "configuracoes:gerenciar:global",
];

const estadoSchema = z.object({
  id: z.coerce.number().int().positive(),
  sigla: z.string().trim().length(2).transform((valor) => valor.toUpperCase()),
  nome: z.string().trim().min(2).max(80),
});
const cidadeSchema = z.object({
  id: z.coerce.number().int().positive(),
  estadoId: z.coerce.number().int().positive(),
  nome: z.string().trim().min(2).max(120),
});

export async function sincronizarLocalidadesIbgeAction() {
  await exigirUmaDasPermissoesOuRedirecionar(permissoesCadastro);
  const resultado = await sincronizarLocalidadesIbgeService();
  revalidatePath(caminho);
  redirect(`${caminho}?uf=AM&sincronizados=${resultado.estados}-${resultado.cidades}`);
}

export async function salvarEstadoAction(formData: FormData) {
  await exigirUmaDasPermissoesOuRedirecionar(permissoesCadastro);
  const dados = estadoSchema.parse(Object.fromEntries(formData));
  const existente = await prisma.estado.findUnique({ where: { id: dados.id }, select: { origem: true } });
  if (existente?.origem === "SARH") throw new Error("Registros com origem SARH não podem ser alterados.");
  await prisma.estado.upsert({
    where: { id: dados.id },
    create: { ...dados, ativo: true, origem: "SECP" },
    update: { sigla: dados.sigla, nome: dados.nome, ativo: true },
  });
  revalidatePath(caminho);
}

export async function salvarCidadeAction(formData: FormData) {
  await exigirUmaDasPermissoesOuRedirecionar(permissoesCadastro);
  const dados = cidadeSchema.parse(Object.fromEntries(formData));
  const existente = await prisma.cidade.findUnique({ where: { id: dados.id }, select: { origem: true } });
  if (existente?.origem === "SARH") throw new Error("Registros com origem SARH não podem ser alterados.");
  await prisma.cidade.upsert({
    where: { id: dados.id },
    create: { ...dados, ativo: true, origem: "SECP" },
    update: { estadoId: dados.estadoId, nome: dados.nome, ativo: true },
  });
  revalidatePath(caminho);
}

export async function alternarEstadoAction(formData: FormData) {
  await exigirUmaDasPermissoesOuRedirecionar(permissoesCadastro);
  const id = z.coerce.number().int().positive().parse(formData.get("id"));
  const atual = await prisma.estado.findUniqueOrThrow({ where: { id } });
  if (atual.origem === "SARH") throw new Error("Registros com origem SARH não podem ser alterados.");
  await prisma.estado.update({ where: { id }, data: { ativo: !atual.ativo } });
  revalidatePath(caminho);
}

export async function alternarCidadeAction(formData: FormData) {
  await exigirUmaDasPermissoesOuRedirecionar(permissoesCadastro);
  const id = z.coerce.number().int().positive().parse(formData.get("id"));
  const atual = await prisma.cidade.findUniqueOrThrow({ where: { id } });
  if (atual.origem === "SARH") throw new Error("Registros com origem SARH não podem ser alterados.");
  await prisma.cidade.update({ where: { id }, data: { ativo: !atual.ativo } });
  revalidatePath(caminho);
}
