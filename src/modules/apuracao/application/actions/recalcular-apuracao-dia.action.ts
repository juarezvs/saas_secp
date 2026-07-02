"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { normalizarDataReferencia } from "../services/calcular-tempo.service";
import { recalcularDiaEBancoHorasServidorService } from "@/modules/recalculo/application/services/recalcular-dia-e-banco-horas-servidor.service";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { buscarServidorComUsuarioPorUsuarioId } from "../../infrastructure/repositories/apuracao.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function recalcularApuracaoDiaAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeRecalcular =
    permissoes.includes("apuracao:recalcular:global") ||
    permissoes.includes("apuracao:consultar:proprio");

  if (!podeRecalcular) {
    return;
  }

  const servidorId = String(formData.get("servidorId") ?? "");
  const data = String(formData.get("dataReferencia") ?? "");

  if (!servidorId || !data) {
    return;
  }

  const dataReferencia = normalizarDataReferencia(new Date(`${data}T00:00:00`));

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
    return servidor?.id === params.servidorId;
  }

  return false;
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
    servidorId,
    permissoes,
  });

  if (!permitido) {
    return;
  }

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
