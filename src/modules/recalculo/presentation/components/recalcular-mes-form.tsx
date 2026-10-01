"use client";

import {
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { toast } from "@/components/ui";

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
  compacto?: boolean;
  mostrarCompactoQuandoDisponivel?: boolean;
  workerAtivo?: boolean;
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
  compacto = false,
  mostrarCompactoQuandoDisponivel = false,
  workerAtivo = true,
}: RecalcularMesFormProps) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const [estado, setEstado] = useState(estadoInicial);
  const processando =
    estado.status === "PROCESSANDO" ||
    (estado.status === "PENDENTE" && workerAtivo);
  const aguardandoWorker = estado.status === "PENDENTE" && !workerAtivo;
  const atualizando = pendente || processando;
  const toastAtualizacaoId = useRef<string | null>(null);

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
        if (proximo.status === "ATUALIZADO") {
          if (toastAtualizacaoId.current) {
            toast.update(toastAtualizacaoId.current, {
              title: "Espelho atualizado",
              description: "As informações do espelho foram carregadas.",
              variant: "success",
              duration: 2500,
            });
            toastAtualizacaoId.current = null;
          }

          router.refresh();
        }
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [anoReferencia, mesReferencia, processando, router, servidorId]);

  useEffect(() => {
    if (atualizando) {
      const mensagem = {
        title: "Atualizando espelho",
        description:
          "O espelho de ponto está sendo recalculado em segundo plano.",
        variant: "info" as const,
        duration: 100000,
      };

      if (toastAtualizacaoId.current) {
        toast.update(toastAtualizacaoId.current, mensagem);
      } else {
        toastAtualizacaoId.current = toast.show(mensagem);
      }

      return;
    }

    if (!toastAtualizacaoId.current) {
      return;
    }

    if (estado.status === "FALHA") {
      toast.update(toastAtualizacaoId.current, {
        title: "Falha ao atualizar espelho",
        description: estado.erro ?? "Não foi possível concluir a atualização.",
        variant: "error",
        duration: 6000,
      });
    } else {
      toast.update(toastAtualizacaoId.current, {
        title: "Espelho atualizado",
        description: "As informações do espelho foram carregadas.",
        variant: "success",
        duration: 2500,
      });
    }

    toastAtualizacaoId.current = null;
  }, [atualizando, estado.erro, estado.status]);

  function recalcular() {
    iniciarTransicao(async () => {
      const formData = new FormData();
      formData.set("servidorId", servidorId);
      formData.set("anoReferencia", String(anoReferencia));
      formData.set("mesReferencia", String(mesReferencia));
      const resultado = await recalcularMesServidorAction(formData);

      if (resultado.sucesso) {
        if (workerAtivo) {
          setEstado({
            status: "PENDENTE",
            atualizadoEm: estado.atualizadoEm,
            erro: null,
          });
        } else {
          toast.warning(
            "O recálculo foi colocado na fila, mas o worker de espelho está inativo neste ambiente.",
            "Worker inativo",
          );
          setEstado({
            status: "AUSENTE",
            atualizadoEm: estado.atualizadoEm,
            erro: null,
          });
        }
      } else {
        setEstado({ ...estado, status: "FALHA", erro: resultado.mensagem });
      }
    });
  }

  if (
    compacto &&
    !mostrarCompactoQuandoDisponivel &&
    ((!atualizando && estado.status !== "FALHA") || aguardandoWorker)
  ) {
    return null;
  }

  return (
    <div
      className={
        compacto
          ? "flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-950"
          : "flex flex-col gap-3 border-y py-3 sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <div
        className={`flex min-w-0 items-center gap-2 ${compacto ? "text-xs" : "text-sm"}`}
        aria-live="polite"
      >
        {atualizando ? (
          <LoaderCircle className="size-4 shrink-0 animate-spin text-blue-700" />
        ) : estado.status === "FALHA" ? (
          <TriangleAlert className="size-4 shrink-0 text-red-700" />
        ) : (
          <CheckCircle2 className="size-4 shrink-0 text-green-700" />
        )}
        <div className="min-w-0">
          <p className="font-medium">
            {atualizando
              ? "Atualizando espelho em segundo plano"
              : estado.status === "FALHA"
                ? "Falha na última atualização"
                : `Atualizado em ${formatarAtualizacao(estado.atualizadoEm)}`}
          </p>
          {estado.erro && !compacto && (
            <p className="truncate text-xs text-red-700">{estado.erro}</p>
          )}
        </div>
      </div>

      {podeRecalcular && (
        <button
          type="button"
          disabled={pendente || processando}
          onClick={recalcular}
          title="Recalcular mês e banco de horas"
          className={
            compacto
              ? "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-md bg-blue-900 px-2 text-xs font-semibold text-white hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
              : "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-blue-900 px-3 text-sm font-semibold text-white hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
          }
        >
          <RefreshCw className={`size-4 ${pendente ? "animate-spin" : ""}`} />
          {compacto ? "Recalc." : "Recalcular"}
        </button>
      )}
    </div>
  );
}
