"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  type MouseEventHandler,
  type ReactNode,
} from "react";
import { toast } from "@/components/ui";

let toastCarregamentoId: string | null = null;
let chaveUrlAtual = "";
let navegacaoEspelhoEmAndamento = false;

type Props = {
  estadoSarh: "AGUARDANDO" | "SINCRONIZANDO" | null;
  processamento: {
    status: "PENDENTE" | "PROCESSANDO" | "ATUALIZADO" | "FALHA" | "AUSENTE";
    erro: string | null;
  };
};

function mostrarEtapa(title: string, description: string) {
  const mensagem = {
    title,
    description,
    variant: "info" as const,
    duration: 100000,
  };
  if (toastCarregamentoId) toast.update(toastCarregamentoId, mensagem);
  else toastCarregamentoId = toast.show(mensagem);
}

export function notificarCarregamentoEspelho() {
  navegacaoEspelhoEmAndamento = true;
  mostrarEtapa(
    "Atualizando espelho",
    "Carregando as informações da competência selecionada.",
  );
}

export function EspelhoPontoCarregamentoToast({
  estadoSarh,
  processamento,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chave = `${pathname}?${searchParams.toString()}`;
  const acompanhouProcessamento = useRef(false);
  const sarhEmAndamento = estadoSarh !== null;
  const recalculoEmAndamento = ["PENDENTE", "PROCESSANDO"].includes(
    processamento.status,
  );

  useEffect(() => {
    if (!sarhEmAndamento && !recalculoEmAndamento) return;
    const interval = window.setInterval(() => {
      if (!navegacaoEspelhoEmAndamento) router.refresh();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [recalculoEmAndamento, router, sarhEmAndamento]);

  useEffect(() => {
    if (sarhEmAndamento) {
      acompanhouProcessamento.current = true;
      mostrarEtapa(
        "Sincronizando dados com SARH",
        estadoSarh === "AGUARDANDO"
          ? "A sincronização está aguardando processamento."
          : "Buscando afastamentos e demais dados funcionais.",
      );
      return;
    }

    if (recalculoEmAndamento) {
      acompanhouProcessamento.current = true;
      mostrarEtapa(
        "Recalculando espelho de ponto",
        processamento.status === "PENDENTE"
          ? "O recálculo está aguardando processamento."
          : "Aplicando as informações atualizadas ao espelho.",
      );
      return;
    }

    if (
      processamento.status === "FALHA" &&
      acompanhouProcessamento.current &&
      toastCarregamentoId
    ) {
      toast.update(toastCarregamentoId, {
        title: "Falha ao atualizar espelho",
        description:
          processamento.erro ?? "Não foi possível concluir a atualização.",
        variant: "error",
        duration: 6000,
      });
      toastCarregamentoId = null;
      acompanhouProcessamento.current = false;
      return;
    }

    if (
      processamento.status === "ATUALIZADO" &&
      acompanhouProcessamento.current &&
      toastCarregamentoId
    ) {
      acompanhouProcessamento.current = false;
      mostrarEtapa(
        "Atualizando espelho",
        "Carregando na tela os dados recalculados.",
      );
      router.refresh();
      const timeout = window.setTimeout(() => {
        if (!toastCarregamentoId) return;
        toast.update(toastCarregamentoId, {
          title: "Espelho atualizado",
          description: "As informações do espelho foram atualizadas.",
          variant: "success",
          duration: 2500,
        });
        toastCarregamentoId = null;
      }, 500);
      return () => window.clearTimeout(timeout);
    }
  }, [
    estadoSarh,
    processamento.erro,
    processamento.status,
    recalculoEmAndamento,
    router,
    sarhEmAndamento,
  ]);

  useEffect(() => {
    if (chaveUrlAtual && chave !== chaveUrlAtual && toastCarregamentoId) {
      navegacaoEspelhoEmAndamento = false;
      if (sarhEmAndamento || recalculoEmAndamento) {
        acompanhouProcessamento.current = true;
      } else {
        toast.update(toastCarregamentoId, {
          title: "Espelho atualizado",
          description: "As informações do espelho foram carregadas.",
          variant: "success",
          duration: 2500,
        });
        toastCarregamentoId = null;
      }
    }
    chaveUrlAtual = chave;
  }, [chave, recalculoEmAndamento, sarhEmAndamento]);

  return null;
}

export function EspelhoPontoUrlCanonica({ href }: { href: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const atual = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  useEffect(() => {
    if (href && href !== atual) router.replace(href, { scroll: false });
  }, [atual, href, router]);
  return null;
}

export function EspelhoPontoNavLink({
  "aria-label": ariaLabel,
  children,
  className,
  href,
}: {
  "aria-label": string;
  children: ReactNode;
  className?: string;
  href: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const atual = `${pathname}?${searchParams.toString()}`;
  const aoClicar: MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0 ||
      href === atual
    ) {
      return;
    }
    notificarCarregamentoEspelho();
  };

  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={aoClicar}
      scroll={false}
    >
      {children}
    </Link>
  );
}
