"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { excluirMarcacaoNutecAction } from "@/modules/marcacoes/application/actions/manter-marcacao-nutec.action";

export function CancelarMarcacaoBrutaButton({
  marcacaoId,
}: {
  marcacaoId: string;
}) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleCancelar() {
    setErro(null);
    iniciarTransicao(async () => {
      try {
        await excluirMarcacaoNutecAction(marcacaoId);
        router.refresh();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível cancelar a marcação.",
        );
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleCancelar}
        disabled={pendente}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-950"
        title="Cancelar a marcação processada vinculada a este registro bruto"
      >
        {pendente ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 className="size-3.5" aria-hidden="true" />
        )}
        {pendente ? "Cancelando..." : "Cancelar marcação"}
      </button>

      {erro ? (
        <p className="max-w-48 text-xs font-medium text-red-700 dark:text-red-300">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
