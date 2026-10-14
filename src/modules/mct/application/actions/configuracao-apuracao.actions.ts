"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { MODELOS_CONFIGURACAO_APURACAO } from "../../domain/modelos-configuracao-apuracao";

const PATH = "/administracao/mct/configuracao-apuracao";

export async function salvarConfiguracaoApuracao(formData: FormData) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "mct-configuracao:gerenciar:seccional",
    "mct-configuracao:gerenciar:global",
  ]);
  const jornadaId = String(formData.get("jornadaId") ?? "");
  const escalaId = String(formData.get("escalaId") ?? "") || null;
  const politicaVersaoId = String(formData.get("politicaVersaoId") ?? "") || null;
  const modeloCodigo = String(formData.get("modeloCodigo") ?? "");
  const vigenciaInicio = new Date(`${String(formData.get("vigenciaInicio") ?? "")}T00:00:00.000Z`);
  const jornada = await prisma.jornada.findUnique({ where: { id: jornadaId }, select: { orgaoId: true } });
  if (!jornada?.orgaoId) throw new Error("Jornada sem órgão responsável.");
  if (!MODELOS_CONFIGURACAO_APURACAO.some((item) => item.codigo === modeloCodigo)) throw new Error("Modelo de apuração inválido.");
  if (!Number.isFinite(vigenciaInicio.getTime())) throw new Error("Vigência inicial inválida.");
  const status = politicaVersaoId ? "PRONTA_SIMULACAO" : "INCOMPLETA";
  await prisma.mctConfiguracaoApuracao.create({
    data: { orgaoId: jornada.orgaoId, jornadaId, escalaId, politicaVersaoId, modeloCodigo, vigenciaInicio, status },
  });
  revalidatePath(PATH);
}
