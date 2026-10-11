"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

const permissoesCadastro = ["configuracoes:gerenciar:seccional", "configuracoes:gerenciar:global"];
const tipos = ["RACA", "COR_CABELO", "COR_OLHOS", "TIPO_SANGUINEO", "IDENTIDADE_GENERO"] as const;
const dominioSchema = z.object({
  id: z.string().uuid().optional(),
  tipo: z.enum(tipos),
  codigoSarh: z.string().trim().min(1).max(20),
  nome: z.string().trim().min(2).max(100),
  ordem: z.coerce.number().int().min(0).max(999),
});

export async function salvarDominioCaracteristicaAction(formData: FormData) {
  await exigirUmaDasPermissoesOuRedirecionar(permissoesCadastro);
  const dados = dominioSchema.parse(Object.fromEntries(formData));
  const existente = await prisma.dominioCaracteristicaPessoal.findUnique({
    where: dados.id ? { id: dados.id } : { tipo_codigoSarh: { tipo: dados.tipo, codigoSarh: dados.codigoSarh } },
    select: { origem: true },
  });
  if (existente?.origem === "SARH") throw new Error("Registros com origem SARH não podem ser alterados.");
  await prisma.dominioCaracteristicaPessoal.upsert({
    where: dados.id ? { id: dados.id } : { tipo_codigoSarh: { tipo: dados.tipo, codigoSarh: dados.codigoSarh } },
    create: { tipo: dados.tipo, codigoSarh: dados.codigoSarh, nome: dados.nome, ordem: dados.ordem, origemSarh: false, origem: "SECP" },
    update: { tipo: dados.tipo, codigoSarh: dados.codigoSarh, nome: dados.nome, ordem: dados.ordem },
  });
  revalidatePath("/cadastros-auxiliares/caracteristicas-pessoais");
}

export async function alternarDominioCaracteristicaAction(formData: FormData) {
  await exigirUmaDasPermissoesOuRedirecionar(permissoesCadastro);
  const id = z.string().uuid().parse(formData.get("id"));
  const atual = await prisma.dominioCaracteristicaPessoal.findUniqueOrThrow({ where: { id }, select: { ativo: true, origem: true } });
  if (atual.origem === "SARH") throw new Error("Registros com origem SARH não podem ser alterados.");
  await prisma.dominioCaracteristicaPessoal.update({ where: { id }, data: { ativo: !atual.ativo } });
  revalidatePath("/cadastros-auxiliares/caracteristicas-pessoais");
}

export async function salvarDominiosEmailAction(formData: FormData) {
  await exigirUmaDasPermissoesOuRedirecionar(["configuracoes:gerenciar:global"]);
  const dominios = z.array(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i)).min(1).parse(
    String(formData.get("dominios") ?? "").split(/[\s,;]+/).map((item) => item.trim().toLowerCase().replace(/^@/, "")).filter(Boolean),
  );
  await prisma.configuracaoGlobal.upsert({
    where: { id: "global" },
    create: { id: "global", dominiosEmailInstitucionais: Array.from(new Set(dominios)) },
    update: { dominiosEmailInstitucionais: Array.from(new Set(dominios)) },
  });
  revalidatePath("/administracao/configuracoes-globais");
}

