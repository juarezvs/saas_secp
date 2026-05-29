"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { SincronizarSarhUseCase } from "../../application/use-cases/sincronizar-sarh.use-case";
import type { SarhEndpointKey } from "../../domain/sarh.types";

export type SincronizarSarhActionState = {
  ok: boolean | null;
  mensagem: string;
  execucaoId?: string;
  detalhes?: Record<string, unknown>;
};

export async function sincronizarSarhAction(formData: FormData): Promise<SincronizarSarhActionState> {
  const modo = String(formData.get("modo") ?? "simulacao");
  const matricula = String(formData.get("matricula") ?? "").trim() || undefined;
  const endpoints = formData.getAll("endpoints").map(String) as SarhEndpointKey[];

  const useCase = new SincronizarSarhUseCase(prisma);

  try {
    const resultado = await useCase.execute({
      tipo: modo === "aplicar" ? "SINCRONIZACAO_COMPLETA" : "SIMULACAO",
      modoSimulacao: modo !== "aplicar",
      endpoints: endpoints.length ? endpoints : undefined,
      matricula,
      iniciadoPorUsuarioId: null,
    });

    revalidatePath("/administracao/integracoes/sarh");

    return {
      ok: true,
      mensagem: resultado.modoSimulacao
        ? "Simulação SARH concluída. Nenhum dado de domínio foi alterado."
        : "Sincronização SARH aplicada com sucesso.",
      execucaoId: resultado.execucaoId,
      detalhes: resultado,
    };
  } catch (error) {
    return {
      ok: false,
      mensagem: error instanceof Error ? error.message : "Falha inesperada ao sincronizar SARH.",
    };
  }
}


export async function sincronizarSarhComProgressoAction(
  _estadoAnterior: SincronizarSarhActionState,
  formData: FormData,
): Promise<SincronizarSarhActionState> {
  return sincronizarSarhAction(formData);
}
