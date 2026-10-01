"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type MouseEventHandler, type ReactNode } from "react";

import { toast } from "@/components/ui";

let toastCarregamentoId: string | null = null;
let chaveUrlAtual = "";

export function notificarCarregamentoEspelho() {
  const mensagem = {
    title: "Carregando espelho",
    description: "Atualizando as informações da competência selecionada.",
    variant: "info" as const,
    duration: 100000,
  };

  if (toastCarregamentoId) {
    toast.update(toastCarregamentoId, mensagem);
    return;
  }

  toastCarregamentoId = toast.show(mensagem);
}

export function EspelhoPontoCarregamentoToast() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const chave = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    if (chaveUrlAtual && chave !== chaveUrlAtual && toastCarregamentoId) {
      toast.update(toastCarregamentoId, {
        title: "Espelho carregado",
        description: "As informações do espelho foram atualizadas.",
        variant: "success",
        duration: 2500,
      });
      toastCarregamentoId = null;
    }

    chaveUrlAtual = chave;
  }, [chave]);

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
    if (!href || href === atual) {
      return;
    }

    router.replace(href, { scroll: false });
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
