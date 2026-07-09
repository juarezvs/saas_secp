"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { PeriodoHomologadoError } from "@/modules/boletim-frequencia/application/services/bloquear-periodo-homologado.service";
import { recalcularMesServidorService } from "../services/recalcular-mes-servidor.service";

type RecalcularMesServidorActionResult = {
  sucesso: boolean;
  mensagem: string;
};

export async function recalcularMesServidorAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return {
      sucesso: false,
      mensagem: "Sua sessao expirou. Acesse novamente para recalcular o mes.",
    } satisfies RecalcularMesServidorActionResult;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeRecalcular =
    permissoes.includes("apuracao:recalcular:global") ||
    permissoes.includes("banco-horas:gerenciar:global");

  if (!podeRecalcular) {
    return {
      sucesso: false,
      mensagem: "Voce nao tem permissao para recalcular este mes.",
    } satisfies RecalcularMesServidorActionResult;
  }

  const servidorId = String(formData.get("servidorId") ?? "");
  const anoReferencia = Number(formData.get("anoReferencia") ?? 0);
  const mesReferencia = Number(formData.get("mesReferencia") ?? 0);

  if (!servidorId || !anoReferencia || !mesReferencia) {
    return {
      sucesso: false,
      mensagem: "Nao foi possivel identificar o servidor ou a competencia.",
    } satisfies RecalcularMesServidorActionResult;
  }

  try {
    await recalcularMesServidorService({
      servidorId,
      anoReferencia,
      mesReferencia,
      usuarioIdAuditoria: session.user.id,
      origem: "RECALCULO_MANUAL_MES",
    });
  } catch (error) {
    if (error instanceof PeriodoHomologadoError) {
      const competencia = `${String(error.mesReferencia).padStart(2, "0")}/${error.anoReferencia}`;

      return {
        sucesso: false,
        mensagem: `A competencia ${competencia} ja foi homologada para este servidor. Para recalcular, reabra a homologacao antes de executar o processamento.`,
      } satisfies RecalcularMesServidorActionResult;
    }

    console.error("[RECALCULO MES] Falha ao recalcular mes do servidor", {
      servidorId,
      anoReferencia,
      mesReferencia,
      error,
    });

    return {
      sucesso: false,
      mensagem:
        "Nao foi possivel recalcular o mes agora. Verifique os logs do servidor e tente novamente.",
    } satisfies RecalcularMesServidorActionResult;
  }

  revalidatePath("/apuracao");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");

  return {
    sucesso: true,
    mensagem: "Mes e banco de horas recalculados com sucesso.",
  } satisfies RecalcularMesServidorActionResult;
}
