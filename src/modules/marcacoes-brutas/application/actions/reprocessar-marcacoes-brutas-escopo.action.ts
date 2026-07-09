"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";

import { reprocessarMarcacoesBrutasEscopoService } from "../services/reprocessar-marcacoes-brutas-escopo.service";

export type ReprocessarMarcacoesBrutasEscopoState = {
  ok: boolean | null;
  mensagem: string;
  resultado?: {
    servidoresAfetados: number;
    brutasEncontradas: number;
    reprocessadas: number;
    jaPendentes: number;
    periodosHomologados: number;
    erros: number;
    competenciasRecalculadas: number;
  };
};

function podeReprocessar(permissoes: string[]) {
  return (
    permissoes.includes("marcacoes:gerenciar:global") ||
    permissoes.includes("apuracao:recalcular:global") ||
    permissoes.includes("afd:importar:global")
  );
}

function parseCompetencia(valor: FormDataEntryValue | null) {
  const competencia = String(valor ?? "").trim();
  const match = /^(\d{4})-(\d{2})$/.exec(competencia);

  if (!match) {
    return null;
  }

  const anoReferencia = Number(match[1]);
  const mesReferencia = Number(match[2]);

  if (
    !Number.isInteger(anoReferencia) ||
    !Number.isInteger(mesReferencia) ||
    mesReferencia < 1 ||
    mesReferencia > 12
  ) {
    return null;
  }

  return { anoReferencia, mesReferencia };
}

export async function reprocessarMarcacoesBrutasEscopoAction(
  _estadoAnterior: ReprocessarMarcacoesBrutasEscopoState,
  formData: FormData,
): Promise<ReprocessarMarcacoesBrutasEscopoState> {
  const session = await auth();

  if (!session?.user) {
    return {
      ok: false,
      mensagem: "Sessão expirada. Entre novamente para reprocessar.",
    };
  }

  if (!podeReprocessar(session.user.perfilAtivo?.permissoes ?? [])) {
    return {
      ok: false,
      mensagem: "Você não possui permissão para reprocessar marcações brutas.",
    };
  }

  const competencia = parseCompetencia(formData.get("competencia"));

  if (!competencia) {
    return {
      ok: false,
      mensagem: "Informe uma competência válida.",
    };
  }

  const modo = String(formData.get("modo") ?? "");
  const servidorId = String(formData.get("servidorId") ?? "").trim();
  const unidadeId = String(formData.get("unidadeId") ?? "").trim();

  if (modo !== "SERVIDOR" && modo !== "UNIDADE") {
    return {
      ok: false,
      mensagem: "Escolha se o reprocessamento será por servidor ou departamento.",
    };
  }

  if (modo === "SERVIDOR" && !servidorId) {
    return {
      ok: false,
      mensagem: "Selecione o servidor que será reprocessado.",
    };
  }

  if (modo === "UNIDADE" && !unidadeId) {
    return {
      ok: false,
      mensagem: "Selecione o departamento que será reprocessado.",
    };
  }

  try {
    const resultado = await reprocessarMarcacoesBrutasEscopoService({
      usuarioId: session.user.id,
      ...competencia,
      escopo:
        modo === "SERVIDOR"
          ? { tipo: "SERVIDOR", servidorId }
          : {
              tipo: "UNIDADE",
              unidadeId,
              incluirSubunidades: formData.get("incluirSubunidades") === "on",
            },
    });

    revalidatePath("/marcacoes-brutas");
    revalidatePath("/marcacoes");
    revalidatePath("/apuracao");
    revalidatePath("/espelho-ponto");

    return {
      ok: true,
      mensagem: "Reprocessamento do escopo concluído.",
      resultado,
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
