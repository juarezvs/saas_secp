"use server";

import { revalidatePath } from "next/cache";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { diagnosticarConfiguracaoApuracao } from "../../domain/configuracao-apuracao";
import { validarConfiguracaoApuracaoMct } from "../services/validar-configuracao-apuracao.service";

const PATH = "/administracao/mct/configuracao-apuracao";
const GERENCIAR = ["mct-configuracao:gerenciar:seccional", "mct-configuracao:gerenciar:global"];

function lerData(valor: FormDataEntryValue | null, obrigatoria = false) {
  const texto = String(valor ?? "").trim();
  if (!texto) {
    if (obrigatoria) throw new Error("Informe a data inicial de vigência.");
    return null;
  }
  const data = new Date(`${texto}T00:00:00.000Z`);
  if (!Number.isFinite(data.getTime())) throw new Error("Data de vigência inválida.");
  return data;
}

function lerComplementos(formData: FormData) {
  const campos = ["intervaloMinimoMinutos", "intervaloMaximoMinutos", "janelaInicio", "janelaFim", "fundamentoNormativo"];
  return Object.fromEntries(campos.map((campo) => [campo, String(formData.get(campo) ?? "").trim()]).filter(([, valor]) => valor));
}

function validarEscopo(orgaoId: string, acesso: { perfilAtivoEscopoGlobal?: boolean; orgaoIds?: string[] }) {
  if (!acesso.perfilAtivoEscopoGlobal && !acesso.orgaoIds?.includes(orgaoId)) throw new Error("A jornada não pertence ao escopo do perfil ativo.");
}

function filtroSobreposicao(params: { id?: string; jornadaId: string; escalaId: string | null; inicio: Date; fim: Date | null }) {
  return {
    ...(params.id ? { id: { not: params.id } } : {}),
    jornadaId: params.jornadaId,
    escalaId: params.escalaId,
    status: "ATIVA" as const,
    vigenciaInicio: { lte: params.fim ?? new Date("9999-12-31T00:00:00.000Z") },
    OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: params.inicio } }],
  };
}

export async function salvarConfiguracaoApuracao(formData: FormData) {
  const acesso = await exigirUmaDasPermissoesOuRedirecionar(GERENCIAR);
  const jornadaId = String(formData.get("jornadaId") ?? "");
  const escalaId = String(formData.get("escalaId") ?? "") || null;
  const politicaVersaoId = String(formData.get("politicaVersaoId") ?? "") || null;
  const modeloCodigo = String(formData.get("modeloCodigo") ?? "");
  const vigenciaInicio = lerData(formData.get("vigenciaInicio"), true)!;
  const vigenciaFim = lerData(formData.get("vigenciaFim"));
  const configuracaoComplementar = lerComplementos(formData);
  const jornada = await prisma.jornada.findUnique({ where: { id: jornadaId }, select: { orgaoId: true, escalas: { select: { id: true } } } });
  if (!jornada?.orgaoId) throw new Error("Jornada sem órgão responsável.");
  validarEscopo(jornada.orgaoId, acesso);
  if (escalaId && !jornada.escalas.some((escala) => escala.id === escalaId)) throw new Error("A escala selecionada não pertence à jornada.");
  const politica = politicaVersaoId ? await prisma.mctPoliticaVersao.findFirst({ where: { id: politicaVersaoId, orgaoId: jornada.orgaoId, estado: "PUBLICADA" }, select: { id: true } }) : null;
  if (politicaVersaoId && !politica) throw new Error("A política deve estar publicada e pertencer ao mesmo órgão da jornada.");
  const diagnostico = diagnosticarConfiguracaoApuracao({ modeloCodigo, politicaPublicada: Boolean(politica), vigenciaInicio, vigenciaFim, configuracaoComplementar });
  const sobreposta = await prisma.mctConfiguracaoApuracao.findFirst({ where: filtroSobreposicao({ jornadaId, escalaId, inicio: vigenciaInicio, fim: vigenciaFim }), select: { id: true } });
  if (sobreposta) throw new Error("Já existe uma configuração ativa nessa vigência.");
  const anterior = await prisma.mctConfiguracaoApuracao.findFirst({ where: { jornadaId, escalaId }, select: { id: true, versao: true }, orderBy: [{ versao: "desc" }, { criadoEm: "desc" }] });
  await prisma.mctConfiguracaoApuracao.create({ data: { orgaoId: jornada.orgaoId, jornadaId, escalaId, politicaVersaoId, modeloCodigo, versao: (anterior?.versao ?? 0) + 1, configuracaoAnteriorId: anterior?.id, vigenciaInicio, vigenciaFim, configuracaoComplementar, status: diagnostico.status } });
  revalidatePath(PATH);
  return { sucesso: true, mensagem: diagnostico.completa ? "Configuração pronta para simulação." : "Rascunho salvo com pendências.", pendencias: diagnostico.pendencias };
}

export async function ativarConfiguracaoApuracao(id: string) {
  const acesso = await exigirUmaDasPermissoesOuRedirecionar(GERENCIAR);
  const item = await prisma.mctConfiguracaoApuracao.findUnique({ where: { id }, include: { politica: { select: { estado: true } } } });
  if (!item) throw new Error("Configuração não encontrada.");
  validarEscopo(item.orgaoId, acesso);
  const diagnostico = diagnosticarConfiguracaoApuracao({ modeloCodigo: item.modeloCodigo, politicaPublicada: item.politica?.estado === "PUBLICADA", vigenciaInicio: item.vigenciaInicio, vigenciaFim: item.vigenciaFim, configuracaoComplementar: item.configuracaoComplementar as Record<string, unknown> });
  if (!diagnostico.completa) throw new Error(diagnostico.pendencias.join(" "));
  const complementar = item.configuracaoComplementar as Record<string, unknown>;
  const validacao = complementar._validacao as Record<string, unknown> | undefined;
  if (item.status !== "EM_VALIDACAO" || validacao?.sucesso !== true || validacao.politicaVersaoId !== item.politicaVersaoId) {
    throw new Error("Execute e aprove a validação técnica desta versão antes de ativar.");
  }
  const sobreposta = await prisma.mctConfiguracaoApuracao.findFirst({ where: filtroSobreposicao({ id, jornadaId: item.jornadaId, escalaId: item.escalaId, inicio: item.vigenciaInicio, fim: item.vigenciaFim }), select: { id: true } });
  if (sobreposta) throw new Error("Há outra configuração ativa com vigência sobreposta.");
  await prisma.mctConfiguracaoApuracao.update({ where: { id }, data: { status: "ATIVA", ativadaEm: new Date(), ativadaPorUsuarioId: acesso.usuarioId } });
  revalidatePath(PATH);
  return { sucesso: true, mensagem: "Configuração ativada para análises. O cálculo oficial permanece em LEGACY." };
}

export async function validarConfiguracaoApuracao(id: string) {
  const acesso = await exigirUmaDasPermissoesOuRedirecionar(GERENCIAR);
  const item = await prisma.mctConfiguracaoApuracao.findUnique({ where: { id }, select: { orgaoId: true, status: true, configuracaoComplementar: true } });
  if (!item) throw new Error("Configuração não encontrada.");
  validarEscopo(item.orgaoId, acesso);
  if (!['PRONTA_SIMULACAO', 'EM_VALIDACAO'].includes(item.status)) throw new Error("Somente configurações prontas para simulação podem ser validadas.");
  const resumo = await validarConfiguracaoApuracaoMct(id);
  await prisma.mctConfiguracaoApuracao.update({
    where: { id },
    data: { status: "EM_VALIDACAO", configuracaoComplementar: { ...(item.configuracaoComplementar as Record<string, unknown>), _validacao: resumo } },
  });
  revalidatePath(PATH);
  return { sucesso: true, mensagem: `Validação concluída com ${resumo.regrasExecutadas} regra(s) e ${resumo.rubricasAplicadas} rubrica(s).`, resumo };
}

export async function inativarConfiguracaoApuracao(id: string) {
  const acesso = await exigirUmaDasPermissoesOuRedirecionar(GERENCIAR);
  const item = await prisma.mctConfiguracaoApuracao.findUnique({ where: { id }, select: { orgaoId: true, status: true } });
  if (!item) throw new Error("Configuração não encontrada.");
  validarEscopo(item.orgaoId, acesso);
  if (item.status !== "ATIVA") throw new Error("Somente uma configuração ativa pode ser inativada.");
  await prisma.mctConfiguracaoApuracao.update({ where: { id }, data: { status: "INATIVA", vigenciaFim: new Date() } });
  revalidatePath(PATH);
  return { sucesso: true, mensagem: "Configuração inativada e vigência encerrada. O histórico foi preservado." };
}
