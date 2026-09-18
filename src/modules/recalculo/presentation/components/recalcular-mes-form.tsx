"use client";

import { CheckCircle2, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  consultarProcessamentoEspelhoAction,
  recalcularMesServidorAction,
  type EstadoProcessamentoEspelho,
} from "../../application/actions/recalcular-mes-servidor.action";

type RecalcularMesFormProps = {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
  podeRecalcular: boolean;
  estadoInicial: EstadoProcessamentoEspelho;
};

function formatarAtualizacao(valor: string | null) {
  if (!valor) return "Ainda não calculado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}

export function RecalcularMesForm({
  servidorId,
  anoReferencia,
  mesReferencia,
  podeRecalcular,
  estadoInicial,
}: RecalcularMesFormProps) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const [estado, setEstado] = useState(estadoInicial);
  const processando = ["PENDENTE", "PROCESSANDO"].includes(estado.status);

  useEffect(() => {
    if (!processando) return;

    const interval = window.setInterval(async () => {
      const formData = new FormData();
      formData.set("servidorId", servidorId);
      formData.set("anoReferencia", String(anoReferencia));
      formData.set("mesReferencia", String(mesReferencia));
      const proximo = await consultarProcessamentoEspelhoAction(formData);

      if (proximo) {
        setEstado(proximo);
        if (proximo.status === "ATUALIZADO") router.refresh();
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [anoReferencia, mesReferencia, processando, router, servidorId]);

  function recalcular() {
    iniciarTransicao(async () => {
      const formData = new FormData();
      formData.set("servidorId", servidorId);
      formData.set("anoReferencia", String(anoReferencia));
      formData.set("mesReferencia", String(mesReferencia));
      const resultado = await recalcularMesServidorAction(formData);

      if (resultado.sucesso) {
        setEstado({ status: "PENDENTE", atualizadoEm: estado.atualizadoEm, erro: null });
      } else {
        setEstado({ ...estado, status: "FALHA", erro: resultado.mensagem });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 border-y py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2 text-sm" aria-live="polite">
        {processando ? (
          <LoaderCircle className="size-4 shrink-0 animate-spin text-blue-700" />
        ) : estado.status === "FALHA" ? (
          <TriangleAlert className="size-4 shrink-0 text-red-700" />
        ) : (
          <CheckCircle2 className="size-4 shrink-0 text-green-700" />
        )}
        <div className="min-w-0">
          <p className="font-medium">
            {processando
              ? "Atualizando espelho em segundo plano"
              : estado.status === "FALHA"
                ? "Falha na última atualização"
                : `Atualizado em ${formatarAtualizacao(estado.atualizadoEm)}`}
          </p>
          {estado.erro && <p className="truncate text-xs text-red-700">{estado.erro}</p>}
        </div>
      </div>

      {podeRecalcular && (
        <button
          type="button"
          disabled={pendente || processando}
          onClick={recalcular}
          title="Recalcular mês e banco de horas"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-blue-900 px-3 text-sm font-semibold text-white hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${pendente ? "animate-spin" : ""}`} />
          Recalcular
        </button>
      )}
    </div>
  );
}
