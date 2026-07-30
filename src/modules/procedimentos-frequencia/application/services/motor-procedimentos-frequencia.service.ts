import type {
  Prisma,
  PrismaClient,
  TipoProcedimentoAdministrativoFrequencia,
} from "@/generated/prisma/client";
import { PeriodoHomologadoError } from "@/modules/boletim-frequencia/application/services/bloquear-periodo-homologado.service";
import { possuiPermissaoNaLista } from "@/modules/auth/application/services/permissao-utils";
import { prisma } from "@/shared/infrastructure/database/prisma";

type Tx = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export class ProcedimentoFrequenciaError extends Error {
  constructor(
    message: string,
    public readonly codigo?: string,
  ) {
    super(message);
    this.name = "ProcedimentoFrequenciaError";
  }
}

export type ValidarProcedimentoFrequenciaParams = {
  categoria: TipoProcedimentoAdministrativoFrequencia;
  servidorId: string;
  usuarioId?: string | null;
  permissoesUsuario?: string[];
  dataInicio?: Date | null;
  dataFim?: Date | null;
  processoSei?: string | null;
  documentoSei?: string | null;
  autoridade?: string | null;
  justificativa?: string | null;
  titulo?: string | null;
  impactoMinutos?: number | null;
  dadosEntrada?: Prisma.InputJsonValue;
  aplicar?: boolean;
  exigePermissao?: "executar" | "autorizar" | false;
  exigeRecalculo?: boolean;
  permitirBancoFechado?: boolean;
  validarDocumentos?: boolean;
  tx?: Tx;
};

function competenciaTexto(data: Date) {
  return `${String(data.getUTCMonth() + 1).padStart(2, "0")}/${data.getUTCFullYear()}`;
}

function permissaoGlobalEquivalente(permissao: string) {
  return /:(seccional|chefia|subordinados|unidade)$/.test(permissao)
    ? permissao.replace(/:(seccional|chefia|subordinados|unidade)$/, ":global")
    : null;
}

function possuiPermissaoProcedimento(
  permissoesUsuario: string[] | undefined,
  permissao: string | null,
) {
  if (!permissao) {
    return true;
  }

  return (
    possuiPermissaoNaLista(permissoesUsuario, permissao) ||
    Boolean(
      permissaoGlobalEquivalente(permissao) &&
        possuiPermissaoNaLista(
          permissoesUsuario,
          permissaoGlobalEquivalente(permissao) as string,
        ),
    )
  );
}

async function resolverOrgaoServidor(tx: Tx, servidorId: string) {
  const servidor = await tx.servidor.findUnique({
    where: { id: servidorId },
    select: {
      id: true,
      orgaoId: true,
      lotacoes: {
        where: { status: "ATIVO" },
        orderBy: { dataInicio: "desc" },
        take: 1,
        select: {
          unidade: {
            select: {
              orgaoId: true,
            },
          },
        },
      },
    },
  });

  if (!servidor) {
    throw new ProcedimentoFrequenciaError("Servidor não encontrado.");
  }

  return servidor.lotacoes[0]?.unidade.orgaoId ?? servidor.orgaoId;
}

async function verificarPeriodoFechado(params: {
  tx: Tx;
  servidorId: string;
  dataReferencia?: Date | null;
}) {
  if (!params.dataReferencia) {
    return false;
  }

  const anoReferencia = params.dataReferencia.getUTCFullYear();
  const mesReferencia = params.dataReferencia.getUTCMonth() + 1;
  const homologacao = await params.tx.homologacaoServidorMes.findFirst({
    where: {
      servidorId: params.servidorId,
      status: {
        in: ["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"],
      },
      fechamento: {
        anoReferencia,
        mesReferencia,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(homologacao);
}

function normalizarTextoObrigatorio(valor: string | null | undefined) {
  return valor?.trim() || null;
}

export async function validarERegistrarProcedimentoFrequencia({
  tx = prisma,
  aplicar = true,
  exigePermissao = "autorizar",
  exigeRecalculo = false,
  permitirBancoFechado = false,
  validarDocumentos = true,
  ...params
}: ValidarProcedimentoFrequenciaParams) {
  const orgaoId = await resolverOrgaoServidor(tx, params.servidorId);
  const procedimento = await tx.procedimentoAdministrativoFrequencia.findFirst({
    where: {
      orgaoId,
      categoria: params.categoria,
      ativo: true,
    },
    orderBy: [{ ordem: "asc" }, { codigo: "asc" }],
  });

  if (!procedimento) {
    throw new ProcedimentoFrequenciaError(
      "Não há procedimento administrativo ativo para esta rotina na seccional do servidor.",
      "PROCEDIMENTO_INATIVO",
    );
  }

  const permissaoExigida =
    exigePermissao === "executar"
      ? procedimento.permissaoExecutar
      : exigePermissao === "autorizar"
        ? procedimento.permissaoAutorizar
        : null;

  if (
    exigePermissao &&
    !possuiPermissaoProcedimento(params.permissoesUsuario, permissaoExigida)
  ) {
    throw new ProcedimentoFrequenciaError(
      `O procedimento "${procedimento.nome}" exige a permissão ${permissaoExigida}.`,
      "PERMISSAO_PROCEDIMENTO_NEGADA",
    );
  }

  if (exigeRecalculo && !procedimento.permiteRecalculo) {
    throw new ProcedimentoFrequenciaError(
      `O procedimento "${procedimento.nome}" não permite recálculo da competência original.`,
      "RECALCULO_NAO_PERMITIDO",
    );
  }

  const periodoFechado = await verificarPeriodoFechado({
    tx,
    servidorId: params.servidorId,
    dataReferencia: params.dataInicio,
  });

  if (periodoFechado && !procedimento.permiteBancoFechado) {
    throw new PeriodoHomologadoError(
      params.servidorId,
      params.dataInicio?.getUTCFullYear() ?? 0,
      (params.dataInicio?.getUTCMonth() ?? 0) + 1,
    );
  }

  if (periodoFechado && !permitirBancoFechado) {
    throw new ProcedimentoFrequenciaError(
      `A competência ${competenciaTexto(params.dataInicio as Date)} está homologada. Use procedimento de banco fechado para preservar o histórico e lançar o impacto em competência posterior.`,
      "BANCO_FECHADO_EXIGE_PROCEDIMENTO",
    );
  }

  const processoSei = normalizarTextoObrigatorio(params.processoSei);
  const documentoSei = normalizarTextoObrigatorio(params.documentoSei);
  const autoridade = normalizarTextoObrigatorio(params.autoridade);
  const justificativa = normalizarTextoObrigatorio(params.justificativa);

  if (validarDocumentos && procedimento.requerProcessoSei && !processoSei) {
    throw new ProcedimentoFrequenciaError(
      `O procedimento "${procedimento.nome}" exige processo SEI.`,
      "PROCESSO_SEI_OBRIGATORIO",
    );
  }

  if (validarDocumentos && procedimento.requerAnexo && !documentoSei) {
    throw new ProcedimentoFrequenciaError(
      `O procedimento "${procedimento.nome}" exige documento, ato ou anexo de instrução.`,
      "DOCUMENTO_OBRIGATORIO",
    );
  }

  if (validarDocumentos && procedimento.requerAutoridade && !autoridade) {
    throw new ProcedimentoFrequenciaError(
      `O procedimento "${procedimento.nome}" exige autoridade responsável.`,
      "AUTORIDADE_OBRIGATORIA",
    );
  }

  if (!justificativa) {
    throw new ProcedimentoFrequenciaError(
      `Informe a justificativa administrativa do procedimento "${procedimento.nome}".`,
      "JUSTIFICATIVA_OBRIGATORIA",
    );
  }

  if (!aplicar) {
    return {
      procedimento,
      orgaoId,
      execucao: null,
      periodoFechado,
    };
  }

  const execucao = await tx.procedimentoAdministrativoFrequenciaExecucao.create({
    data: {
      procedimentoId: procedimento.id,
      orgaoId,
      servidorId: params.servidorId,
      usuarioResponsavelId: params.usuarioId ?? null,
      autorizadoPorUsuarioId: params.usuarioId ?? null,
      status: "APLICADO",
      dataInicio: params.dataInicio ?? null,
      dataFim: params.dataFim ?? params.dataInicio ?? null,
      processoSei,
      documentoSei,
      autoridade,
      titulo: params.titulo ?? procedimento.nome,
      justificativa,
      impactoMinutos: params.impactoMinutos ?? null,
      dadosEntrada: params.dadosEntrada,
      dadosResultado: {
        procedimentoCodigo: procedimento.codigo,
        procedimentoCategoria: procedimento.categoria,
        permiteBancoFechado: procedimento.permiteBancoFechado,
        permiteRecalculo: procedimento.permiteRecalculo,
        preservaHistoricoOriginal: procedimento.preservaHistoricoOriginal,
        periodoFechado,
      },
      autorizadoEm: new Date(),
      aplicadoEm: new Date(),
    },
  });

  return {
    procedimento,
    orgaoId,
    execucao,
    periodoFechado,
  };
}
