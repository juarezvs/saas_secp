"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { recalcularPosSolicitacaoService } from "../services/recalcular-pos-solicitacao.service";

function revalidarCompetenciasDoEspelho(params: {
  servidorId: string;
  datasImpactadas?: Date[];
  resultadosBanco?: Array<{ anoReferencia: number; mesReferencia: number }>;
}) {
  const competencias = new Map<string, string>();

  for (const data of params.datasImpactadas ?? []) {
    const ano = data.getUTCFullYear();
    const mes = data.getUTCMonth() + 1;
    competencias.set(`${ano}-${mes}`, `${ano}-${String(mes).padStart(2, "0")}`);
  }

  for (const item of params.resultadosBanco ?? []) {
    competencias.set(
      `${item.anoReferencia}-${item.mesReferencia}`,
      `${item.anoReferencia}-${String(item.mesReferencia).padStart(2, "0")}`,
    );
  }

  for (const competencia of competencias.values()) {
    revalidatePath(
      `/espelho-ponto?servidorId=${params.servidorId}&competencia=${competencia}`,
    );
  }
}

export async function recalcularPosSolicitacaoAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeRecalcular =
    permissoes.includes("apuracao:recalcular:global") ||
    permissoes.includes("solicitacoes:analisar:chefia") ||
    permissoes.includes("solicitacoes:consultar:global");

  if (!podeRecalcular) {
    return;
  }

  const solicitacaoId = String(formData.get("solicitacaoId") ?? "");

  if (!solicitacaoId) {
    return;
  }

  const resultado = await recalcularPosSolicitacaoService({
    solicitacaoId,
    usuarioIdAuditoria: session.user.id,
  });

  revalidatePath("/solicitacoes");
  revalidatePath(`/solicitacoes/${solicitacaoId}`);
  revalidatePath("/apuracao");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");
  revalidatePath("/marcacoes");

  if (resultado.sucesso && resultado.servidorId) {
    revalidarCompetenciasDoEspelho({
      servidorId: resultado.servidorId,
      datasImpactadas: resultado.datasImpactadas,
      resultadosBanco: resultado.resultadosBanco,
    });
  }
}
