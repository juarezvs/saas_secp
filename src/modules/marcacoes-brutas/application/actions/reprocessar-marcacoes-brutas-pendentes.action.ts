"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { reprocessarMarcacoesBrutasPendentesService } from "../services/reprocessar-marcacoes-brutas-pendentes.service";

export type ReprocessarMarcacoesBrutasState = {
  ok: boolean | null;
  mensagem: string;
  resultado?: {
    total: number;
    processadas: number;
    aindaPendentes: number;
    erros: number;
    associadas: number;
    semServidorCorrespondente: number;
    semJornadaVigente: number;
    periodosHomologados: number;
    pendentesRestantes: number;
    proximoCursor: string | null;
    lotesExecutados: number;
    processadasAcumuladas: number;
    associadasAcumuladas: number;
    errosAcumulados: number;
  };
};

export async function reprocessarMarcacoesBrutasPendentesAction(
  estadoAnterior: ReprocessarMarcacoesBrutasState,
  formData: FormData,
): Promise<ReprocessarMarcacoesBrutasState> {
  const continuar = formData.get("continuar") === "true";
  const resultadoAnterior = continuar ? estadoAnterior.resultado : undefined;

  const session = await auth();

  if (!session?.user) {
    return {
      ok: false,
      mensagem: "Sessão expirada. Entre novamente para reprocessar.",
    };
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];
  const podeReprocessar =
    permissoes.includes("afd:importar:global") ||
    permissoes.includes("marcacoes:gerenciar:global");

  if (!podeReprocessar) {
    return {
      ok: false,
      mensagem: "Você não possui permissão para reprocessar marcações.",
    };
  }

  try {
    const resultado = await reprocessarMarcacoesBrutasPendentesService({
      usuarioId: session.user.id,
      limite: 1000,
      cursorId: resultadoAnterior?.proximoCursor,
    });

    revalidatePath("/afd");
    revalidatePath("/marcacoes-brutas");
    revalidatePath("/marcacoes");
    revalidatePath("/apuracao");
    revalidatePath("/espelho-ponto");

    return {
      ok: true,
      mensagem: resultado.proximoCursor
        ? "Lote concluído. Avançando para as próximas pendências."
        : "Reprocessamento concluído.",
      resultado: {
        ...resultado,
        lotesExecutados: (resultadoAnterior?.lotesExecutados ?? 0) + 1,
        processadasAcumuladas:
          (resultadoAnterior?.processadasAcumuladas ?? 0) + resultado.processadas,
        associadasAcumuladas:
          (resultadoAnterior?.associadasAcumuladas ?? 0) + resultado.associadas,
        errosAcumulados:
          (resultadoAnterior?.errosAcumulados ?? 0) + resultado.erros,
      },
    };
  } catch (error) {
    return {
      ok: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Falha inesperada durante o reprocessamento.",
    };
  }
}
