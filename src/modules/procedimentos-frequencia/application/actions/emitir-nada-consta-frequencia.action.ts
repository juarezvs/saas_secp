"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { validarERegistrarProcedimentoFrequencia } from "@/modules/procedimentos-frequencia/application/services/motor-procedimentos-frequencia.service";
import { buscarRegulamentacaoPontoOrgao } from "@/modules/regulamentacao-ponto/application/services/regulamentacao-ponto.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type NadaConstaFrequenciaResumo = {
  execucaoId?: string;
  servidorNome: string;
  servidorMatricula: string;
  orgaoSigla: string;
  secaoJudiciaria?: string | null;
  unidadeSigla?: string | null;
  cargoDescricao?: string | null;
  processoSei?: string | null;
  justificativa?: string | null;
  dataInicio: string;
  dataFim: string;
  dataFimVerificacao?: string | null;
  consideraMesAberto?: boolean;
  emitidoEm?: string;
  diasPrevistosTrabalho: number;
  diasTrabalhadosRegistrados: number;
  afastamentosNoPeriodo: number;
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
    dataInicio?: string;
    dataFim?: string;
  };
  resumo?: NadaConstaFrequenciaResumo;
};

const estadoCampos = (formData: FormData) => ({
  servidorId: String(formData.get("servidorId") ?? "").trim(),
  processoSei: String(formData.get("processoSei") ?? "").trim(),
  justificativa: String(formData.get("justificativa") ?? "").trim(),
  dataInicio: String(formData.get("dataInicio") ?? "").trim(),
  dataFim: String(formData.get("dataFim") ?? "").trim(),
});

function minutosParaHora(minutos: number) {
  const sinal = minutos < 0 ? "-" : "";
  const absoluto = Math.abs(minutos);
  return `${sinal}${String(Math.floor(absoluto / 60)).padStart(2, "0")}:${String(
    absoluto % 60,
  ).padStart(2, "0")}`;
}

function parseDataCampo(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;

  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarDataInput(data: Date) {
  return data.toISOString().slice(0, 10);
}

function formatarDataBr(valor: string) {
  const data = parseDataCampo(valor);

  return data ? data.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : valor;
}

function competenciasEntre(inicio: Date, fim: Date) {
  const competencias: { anoReferencia: number; mesReferencia: number }[] = [];
  const cursor = new Date(
    Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1),
  );
  const limite = new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth(), 1));

  while (cursor <= limite) {
    competencias.push({
      anoReferencia: cursor.getUTCFullYear(),
      mesReferencia: cursor.getUTCMonth() + 1,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return competencias;
}

function ultimoDiaMesAnterior(dataBase: Date) {
  return new Date(
    Date.UTC(dataBase.getUTCFullYear(), dataBase.getUTCMonth(), 0),
  );
}

function resolverPeriodoVerificacaoNadaConsta({
  dataInicio,
  dataFim,
  hoje,
  considerarMesAberto,
}: {
  dataInicio: Date;
  dataFim: Date;
  hoje: Date;
  considerarMesAberto: boolean;
}) {
  if (considerarMesAberto) {
    return { gte: dataInicio, lte: dataFim };
  }

  const inicioMesAtual = new Date(
    Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1),
  );
  const dataFimVerificacao =
    dataFim >= inicioMesAtual ? ultimoDiaMesAnterior(hoje) : dataFim;

  if (dataFimVerificacao < dataInicio) {
    return null;
  }

  return { gte: dataInicio, lte: dataFimVerificacao };
}

function calcularSaldoMovimentosBancoHoras(
  movimentos: { tipo: string; _sum: { minutos: number | null } }[],
) {
  return movimentos.reduce((total, movimento) => {
    const minutos = movimento._sum.minutos ?? 0;

    if (["CREDITO", "COMPENSACAO_DEBITO"].includes(movimento.tipo)) {
      return total + minutos;
    }

    if (["DEBITO", "COMPENSACAO_CREDITO"].includes(movimento.tipo)) {
      return total - minutos;
    }

    return total;
  }, 0);
}

function montarMensagemNadaConsta(
  resumo: Omit<NadaConstaFrequenciaResumo, "mensagem">,
) {
  const periodo = `${formatarDataBr(resumo.dataInicio)} a ${formatarDataBr(
    resumo.dataFim,
  )}`;
  const complementoPeriodo =
    resumo.dataFimVerificacao && resumo.dataFimVerificacao !== resumo.dataFim
      ? ` Verificacao efetiva ate ${formatarDataBr(
          resumo.dataFimVerificacao,
        )}; mes aberto desconsiderado conforme parametro da seccional.`
      : "";

  if (resumo.resultado === "NADA_CONSTA") {
    return `Nada consta para ${resumo.servidorNome} (${resumo.servidorMatricula}) no periodo de ${periodo} quanto a saldo negativo, debitos vencidos, faltas nao resolvidas e homologacoes pendentes.${complementoPeriodo}`;
  }

  return [
    `Constam pendencias para ${resumo.servidorNome} (${resumo.servidorMatricula}) no periodo de ${periodo}.`,
    `Saldo atual: ${minutosParaHora(resumo.saldoBancoHorasMinutos)}.`,
    `Debitos vencidos: ${minutosParaHora(resumo.debitosVencidosMinutos)}.`,
    `Faltas nao resolvidas: ${resumo.faltasNaoResolvidas}.`,
    `Homologacoes pendentes: ${resumo.pendenciasHomologacao}.`,
    complementoPeriodo.trim(),
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

  const dataInicio = parseDataCampo(campos.dataInicio);
  const dataFim = parseDataCampo(campos.dataFim);

  if (!dataInicio) {
    erros.dataInicio = ["Informe a data inicial do periodo."];
  }

  if (!dataFim) {
    erros.dataFim = ["Informe a data final do periodo."];
  }

  if (dataInicio && dataFim && dataInicio > dataFim) {
    erros.dataFim = [
      "A data final deve ser igual ou posterior a data inicial.",
    ];
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
      cargo: {
        select: {
          descricao: true,
        },
      },
      lotacoes: {
        where: { status: "ATIVO" },
        orderBy: { dataInicio: "desc" },
        take: 1,
        select: {
          cargo: {
            select: {
              descricao: true,
            },
          },
          unidade: {
            select: {
              sigla: true,
              nome: true,
            },
          },
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
  const regulamentacao = await buscarRegulamentacaoPontoOrgao(
    servidor.orgaoId,
  );
  const periodoVerificacao = resolverPeriodoVerificacaoNadaConsta({
    dataInicio: dataInicio!,
    dataFim: dataFim!,
    hoje,
    considerarMesAberto: regulamentacao.nadaConstaConsideraMesAberto,
  });
  const competenciasPeriodo = periodoVerificacao
    ? competenciasEntre(periodoVerificacao.gte, periodoVerificacao.lte)
    : [];
  const [
    movimentosSaldoPeriodo,
    debitosVencidos,
    faltasApuradas,
    faltasOcorrencias,
    pendenciasHomologacao,
    diasPrevistosTrabalho,
    diasTrabalhadosRegistrados,
    afastamentosNoPeriodo,
  ] = await Promise.all([
    periodoVerificacao
      ? prisma.movimentoBancoHoras.groupBy({
          by: ["tipo"],
          where: {
            servidorId: servidor.id,
            dataReferencia: periodoVerificacao,
            tipo: {
              in: ["CREDITO", "COMPENSACAO_DEBITO", "DEBITO", "COMPENSACAO_CREDITO"],
            },
            status: { in: ["PENDENTE", "VALIDADO", "EXPIRADO"] },
          },
          _sum: { minutos: true },
        })
      : Promise.resolve([]),
    periodoVerificacao
      ? prisma.movimentoBancoHoras.aggregate({
          where: {
            servidorId: servidor.id,
            dataReferencia: periodoVerificacao,
            tipo: { in: ["DEBITO", "COMPENSACAO_CREDITO"] },
            status: { in: ["PENDENTE", "VALIDADO", "EXPIRADO"] },
            OR: [{ status: "EXPIRADO" }, { expiraEm: { lt: hoje } }],
          },
          _sum: { minutos: true },
        })
      : Promise.resolve({ _sum: { minutos: 0 } }),
    periodoVerificacao
      ? prisma.apuracaoDiaria.count({
          where: {
            servidorId: servidor.id,
            dataReferencia: periodoVerificacao,
            resultado: "FALTA",
            status: { notIn: ["FECHADA", "HOMOLOGADA"] },
          },
        })
      : Promise.resolve(0),
    periodoVerificacao
      ? prisma.ocorrenciaFrequencia.count({
          where: {
            servidorId: servidor.id,
            tipo: "FALTA",
            resolvida: false,
            apuracaoDiaria: {
              dataReferencia: periodoVerificacao,
            },
          },
        })
      : Promise.resolve(0),
    competenciasPeriodo.length > 0
      ? prisma.homologacaoServidorMes.count({
          where: {
            servidorId: servidor.id,
            status: { in: ["PENDENTE", "COM_PENDENCIAS", "DEVOLVIDO"] },
            fechamento: {
              OR: competenciasPeriodo,
            },
          },
        })
      : Promise.resolve(0),
    periodoVerificacao
      ? prisma.apuracaoDiaria.count({
          where: {
            servidorId: servidor.id,
            dataReferencia: periodoVerificacao,
            cargaPrevistaMinutos: { gt: 0 },
          },
        })
      : Promise.resolve(0),
    periodoVerificacao
      ? prisma.apuracaoDiaria.count({
          where: {
            servidorId: servidor.id,
            dataReferencia: periodoVerificacao,
            minutosTrabalhados: { gt: 0 },
          },
        })
      : Promise.resolve(0),
    periodoVerificacao
      ? prisma.afastamentoSarh.count({
          where: {
            servidorId: servidor.id,
            ativo: true,
            dataInicio: { lte: periodoVerificacao.lte },
            OR: [
              { dataFim: null },
              { dataFim: { gte: periodoVerificacao.gte } },
            ],
          },
        })
      : Promise.resolve(0),
  ]);
  const saldoBancoHorasMinutos = calcularSaldoMovimentosBancoHoras(
    movimentosSaldoPeriodo,
  );

  const resumoSemMensagem = {
    servidorNome:
      servidor.nomeFuncional ??
      servidor.nomeCompletoSarh ??
      servidor.usuario.nome,
    servidorMatricula: servidor.matricula,
    orgaoSigla: servidor.orgao.sigla,
    secaoJudiciaria: servidor.orgao.nome,
    unidadeSigla: servidor.lotacoes[0]?.unidade.sigla ?? null,
    cargoDescricao:
      servidor.cargo?.descricao ??
      servidor.lotacoes[0]?.cargo?.descricao ??
      null,
    processoSei: campos.processoSei,
    justificativa: campos.justificativa,
    dataInicio: formatarDataInput(dataInicio!),
    dataFim: formatarDataInput(dataFim!),
    dataFimVerificacao: periodoVerificacao
      ? formatarDataInput(periodoVerificacao.lte)
      : null,
    consideraMesAberto: regulamentacao.nadaConstaConsideraMesAberto,
    emitidoEm: hoje.toISOString(),
    diasPrevistosTrabalho,
    diasTrabalhadosRegistrados,
    afastamentosNoPeriodo,
    saldoBancoHorasMinutos,
    debitosVencidosMinutos: debitosVencidos._sum.minutos ?? 0,
    faltasNaoResolvidas: faltasApuradas + faltasOcorrencias,
    pendenciasHomologacao,
    resultado:
      saldoBancoHorasMinutos < 0 ||
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
  let execucaoId: string | undefined;

  await prisma.$transaction(async (tx) => {
    const procedimento = await validarERegistrarProcedimentoFrequencia({
      tx,
      categoria: "NADA_CONSTA",
      servidorId: servidor.id,
      usuarioId: permissao.usuarioId,
      permissoesUsuario: permissao.permissoes,
      dataInicio: dataInicio!,
      dataFim: dataFim!,
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
        dataInicio: resumo.dataInicio,
        dataFim: resumo.dataFim,
        dataFimVerificacao: periodoVerificacao
          ? formatarDataInput(periodoVerificacao.lte)
          : null,
        consideraMesAberto: regulamentacao.nadaConstaConsideraMesAberto,
      } satisfies Prisma.InputJsonValue,
    });

    if (procedimento.execucao) {
      execucaoId = procedimento.execucao.id;
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
            diasPrevistosTrabalho: resumo.diasPrevistosTrabalho,
            diasTrabalhadosRegistrados: resumo.diasTrabalhadosRegistrados,
            afastamentosNoPeriodo: resumo.afastamentosNoPeriodo,
            dataInicio: resumo.dataInicio,
            dataFim: resumo.dataFim,
            dataFimVerificacao: periodoVerificacao
              ? formatarDataInput(periodoVerificacao.lte)
              : null,
            consideraMesAberto: regulamentacao.nadaConstaConsideraMesAberto,
            emitidoEm: resumo.emitidoEm,
            processoSei: resumo.processoSei,
            justificativa: resumo.justificativa,
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
    resumo: { ...resumo, execucaoId },
  };
}
