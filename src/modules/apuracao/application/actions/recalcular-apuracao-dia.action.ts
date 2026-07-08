"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { normalizarDataReferencia } from "../services/calcular-tempo.service";
import { recalcularDiaEBancoHorasServidorService } from "@/modules/recalculo/application/services/recalcular-dia-e-banco-horas-servidor.service";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { perfilAtivoEhChefia } from "@/modules/auth/application/services/perfil-chefia.service";
import {
  buscarServidorComUsuarioPorUsuarioId,
  listarServidoresParaEspelhoPonto,
} from "../../infrastructure/repositories/apuracao.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function recalcularApuracaoDiaAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeRecalcular =
    permissoes.includes("apuracao:recalcular:global") ||
    permissoes.includes("apuracao:consultar:proprio") ||
    permissoes.includes("homologacao:gerenciar:chefia") ||
    permissoes.includes("minha-equipe:consultar:chefia");

  if (!podeRecalcular) {
    return;
  }

  const servidorId = String(formData.get("servidorId") ?? "");
  const data = String(formData.get("dataReferencia") ?? "");

  if (!servidorId || !data) {
    return;
  }

  const dataReferencia = normalizarDataReferencia(new Date(`${data}T00:00:00`));
  const permitido = await usuarioPodeRecalcularServidor({
    usuarioId: session.user.id,
    perfilAtivoCodigo: session.user.perfilAtivo?.codigo,
    servidorId,
    permissoes,
  });

  if (!permitido) {
    return;
  }

  await verificarPeriodoPodeSerRecalculado({
    servidorId,
    dataInicio: dataReferencia,
    dataFim: dataReferencia,
  });

  await recalcularDiaEBancoHorasServidorService({
    servidorId,
    dataReferencia,
    usuarioIdAuditoria: session.user.id,
    origem: "RECALCULO_MANUAL_APURACAO_PAGE",
  });

  revalidatePath("/apuracao");
  revalidatePath("/espelho-ponto");
  revalidatePath("/marcacoes");
  revalidatePath("/banco-horas");
}

function parseDataFormulario(valor: string) {
  if (!valor.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return null;
  }

  return normalizarDataReferencia(new Date(`${valor}T00:00:00`));
}

async function usuarioPodeRecalcularServidor(params: {
  usuarioId: string;
  perfilAtivoCodigo?: string | null;
  servidorId: string;
  permissoes: string[];
}) {
  if (params.permissoes.includes("apuracao:recalcular:global")) {
    const escopo = await obterEscopoOrgaoDaSessao();

    if (escopo.global) {
      return true;
    }

    const servidor = await prisma.servidor.findUnique({
      where: { id: params.servidorId },
      select: { orgaoId: true },
    });

    return Boolean(
      servidor?.orgaoId && escopo.orgaoIds.includes(servidor.orgaoId),
    );
  }

  if (params.permissoes.includes("apuracao:consultar:proprio")) {
    const servidor = await buscarServidorComUsuarioPorUsuarioId(params.usuarioId);
    if (servidor?.id === params.servidorId) {
      return true;
    }
  }

  if (
    perfilAtivoEhChefia({
      perfilAtivoCodigo: params.perfilAtivoCodigo,
      permissoes: params.permissoes,
    })
  ) {
    const [servidorProprio, servidoresChefia] = await Promise.all([
      buscarServidorComUsuarioPorUsuarioId(params.usuarioId),
      listarServidoresParaEspelhoPonto({
        usuarioId: params.usuarioId,
        escopo: "chefia",
      }),
    ]);

    return (
      servidorProprio?.id === params.servidorId ||
      servidoresChefia.some((servidor) => servidor.id === params.servidorId)
    );
  }

  return false;
}

function competenciasNoPeriodo(dataInicio: Date, dataFim: Date) {
  const competencias = new Map<string, { anoReferencia: number; mesReferencia: number }>();
  const cursor = new Date(
    Date.UTC(dataInicio.getUTCFullYear(), dataInicio.getUTCMonth(), 1),
  );
  const ultimo = new Date(
    Date.UTC(dataFim.getUTCFullYear(), dataFim.getUTCMonth(), 1),
  );

  while (cursor <= ultimo) {
    const anoReferencia = cursor.getUTCFullYear();
    const mesReferencia = cursor.getUTCMonth() + 1;
    competencias.set(`${anoReferencia}-${mesReferencia}`, {
      anoReferencia,
      mesReferencia,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return Array.from(competencias.values());
}

async function verificarPeriodoPodeSerRecalculado(params: {
  servidorId: string;
  dataInicio: Date;
  dataFim: Date;
}) {
  const competencias = competenciasNoPeriodo(params.dataInicio, params.dataFim);

  for (const competencia of competencias) {
    const inicioMes = new Date(
      Date.UTC(competencia.anoReferencia, competencia.mesReferencia - 1, 1),
    );
    const fimMes = new Date(
      Date.UTC(competencia.anoReferencia, competencia.mesReferencia, 1),
    );
    const homologacao = await prisma.homologacaoServidorMes.findFirst({
      where: {
        servidorId: params.servidorId,
        fechamento: {
          anoReferencia: competencia.anoReferencia,
          mesReferencia: competencia.mesReferencia,
        },
      },
      select: {
        status: true,
        fechamento: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!homologacao) {
      continue;
    }

    if (
      ["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"].includes(homologacao.status) ||
      homologacao.fechamento.status !== "ABERTO"
    ) {
      throw new Error(
        "Não é possível recalcular período com competência homologada ou fechada.",
      );
    }

    const fechamentoUnidade = await prisma.fechamentoMensalUnidade.findFirst({
      where: {
        anoReferencia: competencia.anoReferencia,
        mesReferencia: competencia.mesReferencia,
        status: {
          not: "ABERTO",
        },
        unidade: {
          lotacoes: {
            some: {
              servidorId: params.servidorId,
              status: "ATIVO",
              dataInicio: {
                lt: fimMes,
              },
              OR: [
                {
                  dataFim: null,
                },
                {
                  dataFim: {
                    gte: inicioMes,
                  },
                },
              ],
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (fechamentoUnidade) {
      throw new Error(
        "Não é possível recalcular período com competência homologada ou fechada.",
      );
    }
  }
}

export async function recalcularApuracaoPeriodoAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];
  const servidorId = String(formData.get("servidorId") ?? "");
  const dataInicio = parseDataFormulario(String(formData.get("dataInicio") ?? ""));
  const dataFim = parseDataFormulario(String(formData.get("dataFim") ?? ""));

  if (!servidorId || !dataInicio || !dataFim || dataFim < dataInicio) {
    return;
  }

  const permitido = await usuarioPodeRecalcularServidor({
    usuarioId: session.user.id,
    perfilAtivoCodigo: session.user.perfilAtivo?.codigo,
    servidorId,
    permissoes,
  });

  if (!permitido) {
    return;
  }

  await verificarPeriodoPodeSerRecalculado({
    servidorId,
    dataInicio,
    dataFim,
  });

  const cursor = new Date(dataInicio);

  while (cursor <= dataFim) {
    await recalcularDiaEBancoHorasServidorService({
      servidorId,
      dataReferencia: new Date(cursor),
      usuarioIdAuditoria: session.user.id,
      origem: "RECALCULO_MANUAL_APURACAO_PERIODO",
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  revalidatePath("/apuracao");
  revalidatePath("/espelho-ponto");
  revalidatePath("/marcacoes");
  revalidatePath("/banco-horas");
}
