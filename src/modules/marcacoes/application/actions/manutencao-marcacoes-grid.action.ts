"use server";

import { revalidatePath } from "next/cache";
import type { TipoMarcacao } from "@/generated/prisma/client";

import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { recalcularDiaEBancoHorasServidorService } from "@/modules/recalculo/application/services/recalcular-dia-e-banco-horas-servidor.service";
import { resolverFusoHorarioServidorNoBanco } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import {
  dataHoraLocalParaUtc,
  obterDataReferencia,
} from "../services/data-marcacao.service";

const PERMISSOES_MANUTENCAO_MARCACOES = [
  "marcacao:manutencao:seccional",
  "marcacao:manutencao:global",
];

const tiposPorColuna: TipoMarcacao[] = [
  "ENTRADA",
  "SAIDA_INTERVALO",
  "RETORNO_INTERVALO",
  "SAIDA",
  "MANUAL",
  "MANUAL",
];

type SalvarCelulaMarcacaoInput = {
  servidorId: string;
  marcacaoId?: string | null;
  dataReferencia: string;
  coluna: number;
  hora: string;
};

function dataReferenciaUtc(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new Error("Informe uma data valida.");
  }

  return new Date(`${valor}T00:00:00.000Z`);
}

function validarHoraOuVazio(hora: string) {
  const valor = hora.trim();

  if (valor && !/^\d{2}:\d{2}$/.test(valor)) {
    throw new Error("Informe uma hora valida.");
  }

  if (!valor) {
    return valor;
  }

  const [horas, minutos] = valor.split(":").map(Number);

  if (horas > 23 || minutos > 59) {
    throw new Error("Informe uma hora valida.");
  }

  return valor;
}

async function exigirAcessoAoServidor(servidorId: string) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar(
    PERMISSOES_MANUTENCAO_MARCACOES,
  );
  const servidor = await prisma.servidor.findUnique({
    where: {
      id: servidorId,
    },
    select: {
      id: true,
      orgaoId: true,
    },
  });

  if (!servidor) {
    throw new Error("Pessoa nao encontrada.");
  }

  const podeGlobal = permissao.permissoes.includes(
    "marcacao:manutencao:global",
  ) && permissao.perfilAtivoEscopoGlobal;
  const podeSeccional =
    (permissao.permissoes.includes("marcacao:manutencao:seccional") ||
      permissao.permissoes.includes("marcacao:manutencao:global")) &&
    (permissao.orgaoIds ?? []).includes(servidor.orgaoId);

  if (!podeGlobal && !podeSeccional) {
    throw new Error("Voce nao tem permissao para manter marcacoes desta pessoa.");
  }

  return {
    usuarioId: permissao.usuarioId!,
    servidor,
  };
}

async function buscarJornadaServidor(params: {
  servidorId: string;
  dataReferencia: Date;
}) {
  return prisma.jornadaServidor.findFirst({
    where: {
      servidorId: params.servidorId,
      ativo: true,
      status: "ATIVO",
      dataInicio: {
        lte: params.dataReferencia,
      },
      OR: [{ dataFim: null }, { dataFim: { gte: params.dataReferencia } }],
    },
    orderBy: {
      dataInicio: "desc",
    },
    select: {
      id: true,
    },
  });
}

async function recalcularDatasImpactadas(params: {
  servidorId: string;
  datas: Date[];
  usuarioIdAuditoria: string;
  origem: string;
}) {
  const datasUnicas = new Map(
    params.datas.map((data) => [data.toISOString().slice(0, 10), data]),
  );

  for (const dataReferencia of datasUnicas.values()) {
    await recalcularDiaEBancoHorasServidorService({
      servidorId: params.servidorId,
      dataReferencia,
      usuarioIdAuditoria: params.usuarioIdAuditoria,
      origem: params.origem,
      ignorarBloqueioHomologacao: true,
    });
  }
}

function revalidarRotasMarcacao(servidorId: string) {
  revalidatePath("/manutencao/marcacoes");
  revalidatePath("/marcacoes");
  revalidatePath("/marcacoes-brutas");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");
  revalidatePath("/apuracao");
  revalidatePath(`/servidores/${servidorId}`);
}

function respostaCelula(marcacao: {
  id: string;
  dataHora: Date;
  dataReferencia: Date;
  fusoHorario: string | null;
  tipo: TipoMarcacao;
}) {
  return {
    id: marcacao.id,
    hora: new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: marcacao.fusoHorario ?? "America/Manaus",
    }).format(marcacao.dataHora),
    tipo: marcacao.tipo,
    dataReferencia: marcacao.dataReferencia.toISOString().slice(0, 10),
  };
}

export async function salvarCelulaMarcacaoManutencaoAction(
  input: SalvarCelulaMarcacaoInput,
) {
  const servidorId = input.servidorId.trim();

  if (!servidorId) {
    throw new Error("Informe a pessoa.");
  }

  const coluna = Number(input.coluna);

  if (!Number.isInteger(coluna) || coluna < 0 || coluna >= tiposPorColuna.length) {
    throw new Error("Coluna de marcacao invalida.");
  }

  const hora = validarHoraOuVazio(input.hora);
  const dataInformada = dataReferenciaUtc(input.dataReferencia);
  const { usuarioId } = await exigirAcessoAoServidor(servidorId);
  const atual = input.marcacaoId
    ? await prisma.marcacao.findUnique({
        where: {
          id: input.marcacaoId,
        },
      })
    : null;

  if (input.marcacaoId && (!atual || atual.servidorId !== servidorId)) {
    throw new Error("Marcacao nao encontrada.");
  }

  if (!hora) {
    if (!atual) {
      return { ok: true, operacao: "SEM_ALTERACAO" as const, marcacao: null };
    }

    const cancelada = await prisma.marcacao.update({
      where: {
        id: atual.id,
      },
      data: {
        status: "CANCELADA",
        observacao: atual.observacao
          ? `${atual.observacao} | Cancelada em manutencao de marcacoes.`
          : "Cancelada em manutencao de marcacoes.",
        metadados: {
          origem: "MANUTENCAO_MARCACOES",
          operacao: "EXCLUSAO",
          coluna,
          marcacaoOriginal: {
            dataHora: atual.dataHora,
            dataReferencia: atual.dataReferencia,
            tipo: atual.tipo,
            fonte: atual.fonte,
            status: atual.status,
          },
        },
      },
    });

    await prisma.auditoriaEvento.create({
      data: {
        usuarioId,
        entidade: "Marcacao",
        entidadeId: atual.id,
        acao: "MARCACAO_MANUTENCAO_CANCELADA",
        dadosAntes: atual,
        dadosDepois: cancelada,
      },
    });

    await recalcularDatasImpactadas({
      servidorId,
      datas: [atual.dataReferencia],
      usuarioIdAuditoria: usuarioId,
      origem: "MARCACAO_MANUTENCAO_CANCELADA",
    });
    revalidarRotasMarcacao(servidorId);

    return { ok: true, operacao: "EXCLUSAO" as const, marcacao: null };
  }

  const fusoHorario = await resolverFusoHorarioServidorNoBanco({
    servidorId,
    dataReferencia: dataInformada,
  });
  const dataHora = dataHoraLocalParaUtc({
    dataReferencia: dataInformada,
    hora,
    fusoHorario,
  });
  const dataReferencia = obterDataReferencia(dataHora, fusoHorario);
  const jornadaServidor = await buscarJornadaServidor({
    servidorId,
    dataReferencia,
  });
  const metadadosMarcacao = {
    origem: "MANUTENCAO_MARCACOES",
    origemBruta: "EQUIPAMENTO_BIOMETRICO",
    operacao: atual ? "EDICAO" : "INCLUSAO",
    coluna,
    ...(atual
      ? {
          marcacaoOriginal: {
            dataHora: atual.dataHora,
            dataReferencia: atual.dataReferencia,
            tipo: atual.tipo,
            fonte: atual.fonte,
            status: atual.status,
          },
        }
      : {}),
  };
  const dadosMarcacao = {
    servidorId,
    jornadaServidorId: jornadaServidor?.id ?? null,
    dataHora,
    dataReferencia,
    fusoHorario,
    tipo: tiposPorColuna[coluna],
    fonte: "EQUIPAMENTO_BIOMETRICO" as const,
    status: "VALIDA" as const,
    observacao: "Marcacao sincronizada pela manutencao de marcacoes.",
    metadados: metadadosMarcacao,
  };
  const marcacao = atual
    ? await prisma.marcacao.update({
        where: {
          id: atual.id,
        },
        data: dadosMarcacao,
      })
    : await prisma.marcacao.create({
        data: {
          ...dadosMarcacao,
          criadaPorUsuarioId: usuarioId,
        },
      });

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId,
      entidade: "Marcacao",
      entidadeId: marcacao.id,
      acao: atual
        ? "MARCACAO_MANUTENCAO_ATUALIZADA"
        : "MARCACAO_MANUTENCAO_INCLUIDA",
      ...(atual ? { dadosAntes: atual } : {}),
      dadosDepois: marcacao,
    },
  });

  await recalcularDatasImpactadas({
    servidorId,
    datas: atual ? [atual.dataReferencia, dataReferencia] : [dataReferencia],
    usuarioIdAuditoria: usuarioId,
    origem: atual
      ? "MARCACAO_MANUTENCAO_ATUALIZADA"
      : "MARCACAO_MANUTENCAO_INCLUIDA",
  });
  revalidarRotasMarcacao(servidorId);

  return {
    ok: true,
    operacao: atual ? ("EDICAO" as const) : ("INCLUSAO" as const),
    marcacao: respostaCelula(marcacao),
  };
}
