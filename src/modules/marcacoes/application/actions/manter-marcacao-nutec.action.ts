"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { recalcularDiaEBancoHorasServidorService } from "@/modules/recalculo/application/services/recalcular-dia-e-banco-horas-servidor.service";
import { resolverFusoHorarioServidorNoBanco } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import {
  dataHoraLocalParaUtc,
  obterDataReferencia,
} from "../services/data-marcacao.service";
import {
  exigirUsuarioNutec,
  exigirUsuarioPodeExcluirMarcacao,
} from "../services/permissao-manutencao-marcacao.service";

const tiposMarcacaoPermitidos = new Set([
  "ENTRADA",
  "SAIDA_INTERVALO",
  "RETORNO_INTERVALO",
  "SAIDA",
  "MANUAL",
  "AJUSTE",
]);

function normalizarDataFormulario(valor: string) {
  return new Date(`${valor}T00:00:00.000Z`);
}

function extrairDadosMarcacao(formData: FormData) {
  return {
    servidorId: String(formData.get("servidorId") ?? "").trim(),
    dataReferencia: String(formData.get("dataReferencia") ?? "").trim(),
    hora: String(formData.get("hora") ?? "").trim(),
    tipo: String(formData.get("tipo") ?? "").trim(),
    observacao: String(formData.get("observacao") ?? "").trim(),
  };
}

function validarDadosMarcacao(dados: ReturnType<typeof extrairDadosMarcacao>) {
  if (!dados.servidorId) {
    throw new Error("Informe o servidor.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.dataReferencia)) {
    throw new Error("Informe uma data valida.");
  }

  if (!/^\d{2}:\d{2}$/.test(dados.hora)) {
    throw new Error("Informe uma hora valida.");
  }

  if (!tiposMarcacaoPermitidos.has(dados.tipo)) {
    throw new Error("Informe um tipo de marcacao valido.");
  }
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
  const chaves = new Map(
    params.datas.map((data) => [data.toISOString().slice(0, 10), data]),
  );

  for (const dataReferencia of chaves.values()) {
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
  revalidatePath("/marcacoes");
  revalidatePath("/marcacoes-brutas");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");
  revalidatePath("/apuracao");
  revalidatePath(`/servidores/${servidorId}`);
}

export async function incluirMarcacaoNutecAction(formData: FormData) {
  const permissao = await exigirUsuarioNutec();
  const dados = extrairDadosMarcacao(formData);
  validarDadosMarcacao(dados);

  const dataInformada = normalizarDataFormulario(dados.dataReferencia);
  const fusoHorario = await resolverFusoHorarioServidorNoBanco({
    servidorId: dados.servidorId,
    dataReferencia: dataInformada,
  });
  const dataHora = dataHoraLocalParaUtc({
    dataReferencia: dataInformada,
    hora: dados.hora,
    fusoHorario,
  });
  const dataReferencia = obterDataReferencia(dataHora, fusoHorario);
  const jornadaServidor = await buscarJornadaServidor({
    servidorId: dados.servidorId,
    dataReferencia,
  });

  const marcacao = await prisma.marcacao.create({
    data: {
      servidorId: dados.servidorId,
      jornadaServidorId: jornadaServidor?.id ?? null,
      dataHora,
      dataReferencia,
      fusoHorario,
      tipo: dados.tipo as never,
      fonte: "MANUAL_ADMINISTRATIVO",
      status: "AJUSTADA",
      observacao: dados.observacao || "Marcacao incluida pelo NUTEC.",
      criadaPorUsuarioId: permissao.usuarioId,
      metadados: {
        origem: "MANUTENCAO_NUTEC",
        operacao: "INCLUSAO",
      },
    },
  });

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: permissao.usuarioId,
      entidade: "Marcacao",
      entidadeId: marcacao.id,
      acao: "MARCACAO_INCLUIDA_NUTEC",
      dadosDepois: marcacao,
    },
  });

  await recalcularDatasImpactadas({
    servidorId: dados.servidorId,
    datas: [dataReferencia],
    usuarioIdAuditoria: permissao.usuarioId,
    origem: "MARCACAO_INCLUIDA_NUTEC",
  });
  revalidarRotasMarcacao(dados.servidorId);
}

export async function atualizarMarcacaoNutecAction(
  marcacaoId: string,
  formData: FormData,
) {
  const permissao = await exigirUsuarioNutec();
  const atual = await prisma.marcacao.findUnique({
    where: {
      id: marcacaoId,
    },
  });

  if (!atual) {
    throw new Error("Marcacao nao encontrada.");
  }

  const dados = extrairDadosMarcacao(formData);
  const servidorId = dados.servidorId || atual.servidorId;
  validarDadosMarcacao({ ...dados, servidorId });

  const dataInformada = normalizarDataFormulario(dados.dataReferencia);
  const fusoHorario = await resolverFusoHorarioServidorNoBanco({
    servidorId,
    dataReferencia: dataInformada,
  });
  const dataHora = dataHoraLocalParaUtc({
    dataReferencia: dataInformada,
    hora: dados.hora,
    fusoHorario,
  });
  const dataReferencia = obterDataReferencia(dataHora, fusoHorario);
  const jornadaServidor = await buscarJornadaServidor({
    servidorId,
    dataReferencia,
  });
  const atualizada = await prisma.marcacao.update({
    where: {
      id: marcacaoId,
    },
    data: {
      servidorId,
      jornadaServidorId: jornadaServidor?.id ?? null,
      dataHora,
      dataReferencia,
      fusoHorario,
      tipo: dados.tipo as never,
      fonte: "MANUAL_ADMINISTRATIVO",
      status: "AJUSTADA",
      observacao: dados.observacao || atual.observacao,
      metadados: {
        origem: "MANUTENCAO_NUTEC",
        operacao: "EDICAO",
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
      usuarioId: permissao.usuarioId,
      entidade: "Marcacao",
      entidadeId: marcacaoId,
      acao: "MARCACAO_ATUALIZADA_NUTEC",
      dadosAntes: atual,
      dadosDepois: atualizada,
    },
  });

  await recalcularDatasImpactadas({
    servidorId,
    datas: [atual.dataReferencia, dataReferencia],
    usuarioIdAuditoria: permissao.usuarioId,
    origem: "MARCACAO_ATUALIZADA_NUTEC",
  });
  revalidarRotasMarcacao(servidorId);
}

export async function excluirMarcacaoNutecAction(marcacaoId: string) {
  const atual = await prisma.marcacao.findUnique({
    where: {
      id: marcacaoId,
    },
    include: {
      servidor: {
        select: {
          orgaoId: true,
        },
      },
    },
  });

  if (!atual) {
    throw new Error("Marcacao nao encontrada.");
  }

  const permissao = await exigirUsuarioPodeExcluirMarcacao({
    servidorOrgaoId: atual.servidor.orgaoId,
  });

  const cancelada = await prisma.marcacao.update({
    where: {
      id: marcacaoId,
    },
    data: {
      status: "CANCELADA",
      observacao: atual.observacao
        ? `${atual.observacao} | Cancelada pelo NUTEC.`
        : "Cancelada pelo NUTEC.",
      metadados: {
        origem: "MANUTENCAO_NUTEC",
        operacao: "EXCLUSAO",
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
      usuarioId: permissao.usuarioId,
      entidade: "Marcacao",
      entidadeId: marcacaoId,
      acao: "MARCACAO_EXCLUIDA_NUTEC",
      dadosAntes: atual,
      dadosDepois: cancelada,
    },
  });

  await recalcularDatasImpactadas({
    servidorId: atual.servidorId,
    datas: [atual.dataReferencia],
    usuarioIdAuditoria: permissao.usuarioId,
    origem: "MARCACAO_EXCLUIDA_NUTEC",
  });
  revalidarRotasMarcacao(atual.servidorId);
}
