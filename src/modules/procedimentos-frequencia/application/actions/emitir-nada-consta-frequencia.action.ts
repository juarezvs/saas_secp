"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { validarERegistrarProcedimentoFrequencia } from "@/modules/procedimentos-frequencia/application/services/motor-procedimentos-frequencia.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type NadaConstaFrequenciaResumo = {
  servidorNome: string;
  servidorMatricula: string;
  orgaoSigla: string;
  secaoJudiciaria?: string | null;
  saldoBancoHorasMinutos: number;
  debitosVencidosMinutos: number;
  faltasNaoResolvidas: number;
  pendenciasHomologacao: number;
  resultado: "NADA_CONSTA" | "COM_PENDENCIAS";
  mensagem: string;
};

export type NadaConstaFrequenciaFormState = {
  sucesso: boolean;
  mensagem?: string;
  erros?: Record<string, string[]>;
  campos?: {
    servidorId?: string;
    processoSei?: string;
    justificativa?: string;
  };
  resumo?: NadaConstaFrequenciaResumo;
};

const estadoCampos = (formData: FormData) => ({
  servidorId: String(formData.get("servidorId") ?? "").trim(),
  processoSei: String(formData.get("processoSei") ?? "").trim(),
  justificativa: String(formData.get("justificativa") ?? "").trim(),
});

function minutosParaHora(minutos: number) {
  const sinal = minutos < 0 ? "-" : "";
  const absoluto = Math.abs(minutos);
  return `${sinal}${String(Math.floor(absoluto / 60)).padStart(2, "0")}:${String(
    absoluto % 60,
  ).padStart(2, "0")}`;
}

function montarMensagemNadaConsta(resumo: Omit<NadaConstaFrequenciaResumo, "mensagem">) {
  if (resumo.resultado === "NADA_CONSTA") {
    return `Nada consta para ${resumo.servidorNome} (${resumo.servidorMatricula}) quanto a saldo negativo, debitos vencidos, faltas nao resolvidas e homologacoes pendentes.`;
  }

  return [
    `Constam pendencias para ${resumo.servidorNome} (${resumo.servidorMatricula}).`,
    `Saldo atual: ${minutosParaHora(resumo.saldoBancoHorasMinutos)}.`,
    `Debitos vencidos: ${minutosParaHora(resumo.debitosVencidosMinutos)}.`,
    `Faltas nao resolvidas: ${resumo.faltasNaoResolvidas}.`,
    `Homologacoes pendentes: ${resumo.pendenciasHomologacao}.`,
  ].join(" ");
}

export async function emitirNadaConstaFrequenciaAction(
  _estadoAnterior: NadaConstaFrequenciaFormState,
  formData: FormData,
): Promise<NadaConstaFrequenciaFormState> {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "procedimentos-frequencia:emitir-nada-consta:seccional",
    "procedimentos-frequencia:emitir-nada-consta:global",
  ]);
  const escopo = await obterEscopoOrgaoDaSessao();
  const campos = estadoCampos(formData);
  const erros: Record<string, string[]> = {};

  if (!campos.servidorId) {
    erros.servidorId = ["Selecione o servidor."];
  }

  if (!campos.processoSei) {
    erros.processoSei = ["Informe o processo SEI."];
  }

  if (!campos.justificativa) {
    erros.justificativa = ["Informe a justificativa administrativa."];
  }

  if (Object.keys(erros).length > 0) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos para emitir o Nada Consta.",
      erros,
      campos,
    };
  }

  const servidor = await prisma.servidor.findFirst({
    where: {
      id: campos.servidorId,
      ativo: true,
      ...(escopo.global ? {} : { orgaoId: { in: escopo.orgaoIds } }),
    },
    select: {
      id: true,
      matricula: true,
      nomeFuncional: true,
      nomeCompletoSarh: true,
      orgaoId: true,
      orgao: {
        select: {
          sigla: true,
          nome: true,
        },
      },
      usuario: {
        select: {
          nome: true,
        },
      },
    },
  });

  if (!servidor) {
    return {
      sucesso: false,
      mensagem: "Servidor nao encontrado no escopo do perfil ativo.",
      campos,
    };
  }

  const hoje = new Date();
  const [
    saldo,
    debitosVencidos,
    faltasApuradas,
    faltasOcorrencias,
    pendenciasHomologacao,
  ] = await Promise.all([
    prisma.bancoHorasSaldo.findUnique({
      where: { servidorId: servidor.id },
      select: { saldoMinutos: true },
    }),
    prisma.movimentoBancoHoras.aggregate({
      where: {
        servidorId: servidor.id,
        tipo: { in: ["DEBITO", "COMPENSACAO_DEBITO"] },
        status: { in: ["PENDENTE", "VALIDADO", "EXPIRADO"] },
        OR: [{ status: "EXPIRADO" }, { expiraEm: { lt: hoje } }],
      },
      _sum: { minutos: true },
    }),
    prisma.apuracaoDiaria.count({
      where: {
        servidorId: servidor.id,
        resultado: "FALTA",
        status: { notIn: ["FECHADA", "HOMOLOGADA"] },
      },
    }),
    prisma.ocorrenciaFrequencia.count({
      where: {
        servidorId: servidor.id,
        tipo: "FALTA",
        resolvida: false,
      },
    }),
    prisma.homologacaoServidorMes.count({
      where: {
        servidorId: servidor.id,
        status: { in: ["PENDENTE", "COM_PENDENCIAS", "DEVOLVIDO"] },
      },
    }),
  ]);

  const resumoSemMensagem = {
    servidorNome:
      servidor.nomeFuncional ?? servidor.nomeCompletoSarh ?? servidor.usuario.nome,
    servidorMatricula: servidor.matricula,
    orgaoSigla: servidor.orgao.sigla,
    secaoJudiciaria: servidor.orgao.nome,
    saldoBancoHorasMinutos: saldo?.saldoMinutos ?? 0,
    debitosVencidosMinutos: debitosVencidos._sum.minutos ?? 0,
    faltasNaoResolvidas: faltasApuradas + faltasOcorrencias,
    pendenciasHomologacao,
    resultado:
      (saldo?.saldoMinutos ?? 0) < 0 ||
      (debitosVencidos._sum.minutos ?? 0) > 0 ||
      faltasApuradas + faltasOcorrencias > 0 ||
      pendenciasHomologacao > 0
        ? ("COM_PENDENCIAS" as const)
        : ("NADA_CONSTA" as const),
  };
  const resumo = {
    ...resumoSemMensagem,
    mensagem: montarMensagemNadaConsta(resumoSemMensagem),
  };

  await prisma.$transaction(async (tx) => {
    const procedimento = await validarERegistrarProcedimentoFrequencia({
      tx,
      categoria: "NADA_CONSTA",
      servidorId: servidor.id,
      usuarioId: permissao.usuarioId,
      permissoesUsuario: permissao.permissoes,
      dataInicio: hoje,
      processoSei: campos.processoSei,
      documentoSei: campos.processoSei,
      justificativa: campos.justificativa,
      titulo: "Emissao de Nada Consta de frequencia",
      exigePermissao: "executar",
      exigeRecalculo: false,
      validarDocumentos: true,
      dadosEntrada: {
        origem: "NADA_CONSTA_FREQUENCIA",
        servidorMatricula: servidor.matricula,
        orgaoSigla: servidor.orgao.sigla,
      } satisfies Prisma.InputJsonValue,
    });

    if (procedimento.execucao) {
      await tx.procedimentoAdministrativoFrequenciaExecucao.update({
        where: { id: procedimento.execucao.id },
        data: {
          resultado: resumo.mensagem,
          dadosResultado: {
            procedimentoCodigo: procedimento.procedimento.codigo,
            procedimentoCategoria: procedimento.procedimento.categoria,
            resultado: resumo.resultado,
            saldoBancoHorasMinutos: resumo.saldoBancoHorasMinutos,
            debitosVencidosMinutos: resumo.debitosVencidosMinutos,
            faltasNaoResolvidas: resumo.faltasNaoResolvidas,
            pendenciasHomologacao: resumo.pendenciasHomologacao,
          } satisfies Prisma.InputJsonValue,
        },
      });
    }
  });

  revalidatePath("/administracao/procedimentos-frequencia");
  revalidatePath("/administracao/procedimentos-frequencia/nada-consta");

  return {
    sucesso: true,
    mensagem: "Nada Consta de frequencia emitido e registrado no motor.",
    campos,
    resumo,
  };
}
