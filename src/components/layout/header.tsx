"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AccessibilityToolbar } from "@/components/accessibility/accessibility-toolbar";
import type { PerfilNavegacao } from "@/components/layout/sidebar";
import type { PreferenciasAcessibilidade } from "@/modules/auth/application/services/preferencias-acessibilidade.service";

type HeaderProps = {
  nomeUsuario: string;
  matricula: string;
  funcaoOuCargo?: string | null;
  fotoUrl?: string | null;
  unidadeAtual: string;
  perfis: PerfilNavegacao[];
  perfilAtivo: PerfilNavegacao;
  onToggleSidebar: () => void;
  onOpenMobileMenu: () => void;
  onPerfilAtivoChange: (perfil: PerfilNavegacao) => void;
  onLogout: () => Promise<void>;
  sidebarRecolhida: boolean;
  drawerAberto: boolean;
  totalNotificacoes: number;
  preferenciasAcessibilidade: PreferenciasAcessibilidade;
};

export function Header({
  nomeUsuario,
  matricula,
  funcaoOuCargo,
  fotoUrl,
  unidadeAtual,
  perfis,
  perfilAtivo,
  onToggleSidebar,
  onOpenMobileMenu,
  onPerfilAtivoChange,
  onLogout,
  sidebarRecolhida,
  drawerAberto,
  totalNotificacoes,
  preferenciasAcessibilidade,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [totalNotificacoesAtual, setTotalNotificacoesAtual] =
    useState(totalNotificacoes);
  const [perfilPendente, startTransition] = useTransition();

  const buscarTotalNotificacoes = useCallback(async () => {
    try {
      const response = await fetch("/api/notificacoes/contador", {
        cache: "no-store",
      });

      if (!response.ok) {
        return totalNotificacoes;
      }

      const payload = (await response.json()) as { total?: number };
      return Number(payload.total ?? 0);
    } catch {
      return totalNotificacoes;
    }
  }, [totalNotificacoes]);

  useEffect(() => {
    let ativo = true;

    buscarTotalNotificacoes().then((total) => {
      if (ativo) {
        setTotalNotificacoesAtual(total);
      }
    });

    return () => {
      ativo = false;
    };
  }, [pathname, buscarTotalNotificacoes]);

  useEffect(() => {
    function atualizarAoFocar() {
      buscarTotalNotificacoes().then(setTotalNotificacoesAtual);
    }

    window.addEventListener("focus", atualizarAoFocar);
    document.addEventListener("visibilitychange", atualizarAoFocar);

    return () => {
      window.removeEventListener("focus", atualizarAoFocar);
      document.removeEventListener("visibilitychange", atualizarAoFocar);
    };
  }, [buscarTotalNotificacoes]);

  function selecionarPerfil(codigo: string) {
    const novoPerfil = perfis.find((perfil) => perfil.codigo === codigo);

    if (novoPerfil) {
      startTransition(async () => {
        const response = await fetch("/api/sessao/perfil-ativo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            perfilCodigo: novoPerfil.codigo,
          }),
        });

        if (response.ok) {
          const payload = (await response.json()) as {
            perfilAtivo?: PerfilNavegacao;
          };
          onPerfilAtivoChange(payload.perfilAtivo ?? novoPerfil);
          router.push("/dashboard");
          router.refresh();
          buscarTotalNotificacoes().then(setTotalNotificacoesAtual);
        }
      });
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/15 secp-institutional-gradient text-white shadow-lg shadow-slate-950/20 backdrop-blur">
      <div className="flex min-h-[4.5rem] items-center justify-between gap-3 px-4 ring-1 ring-white/5 lg:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="inline-flex size-10 items-center justify-center rounded-md border border-white/20 bg-white/10 shadow-sm backdrop-blur transition hover:border-white/35 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:hidden"
            aria-label="Abrir menu principal"
            aria-controls="secp-sidebar-mobile"
            aria-expanded={drawerAberto}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden size-10 items-center justify-center rounded-md border border-white/20 bg-white/10 shadow-sm backdrop-blur transition hover:border-white/35 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:inline-flex"
            aria-label={
              sidebarRecolhida
                ? "Expandir menu lateral"
                : "Recolher menu lateral"
            }
            title={
              sidebarRecolhida
                ? "Expandir menu lateral"
                : "Recolher menu lateral"
            }
            aria-controls="secp-sidebar-desktop"
            aria-expanded={!sidebarRecolhida}
          >
            {sidebarRecolhida ? (
              <PanelLeftOpen className="size-5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-5" aria-hidden="true" />
            )}
          </button>

          <Link href="/dashboard" className="sr-only">
            Ir para a dashboard
          </Link>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 py-2">
          {unidadeAtual && (
            <div className="mr-auto hidden min-w-0 items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm shadow-sm backdrop-blur xl:flex">
              <Building2
                className="size-4 shrink-0 text-white/85"
                aria-hidden="true"
              />
              <span className="max-w-72 truncate text-white/90">
                {unidadeAtual}
              </span>
            </div>
          )}

          <label className="hidden min-w-48 items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 shadow-sm backdrop-blur transition focus-within:border-white/40 lg:flex">
            <ShieldCheck
              className="size-4 shrink-0 text-white/85"
              aria-hidden="true"
            />
            <span className="sr-only">Perfil ativo</span>
            <select
              value={perfilAtivo.codigo}
              onChange={(event) => selecionarPerfil(event.target.value)}
              disabled={perfilPendente}
              className="w-full bg-transparent text-xs font-semibold text-white outline-none [&>option]:text-slate-950"
              aria-label="Selecionar perfil ativo"
            >
              {perfis.map((perfil) => (
                <option key={perfil.codigo} value={perfil.codigo}>
                  {perfil.nome}
                </option>
              ))}
            </select>
          </label>

          <AccessibilityToolbar
            preferenciasIniciais={preferenciasAcessibilidade}
          />

          <Link
            href="/notificacoes"
            className="relative hidden size-10 items-center justify-center rounded-md border border-white/20 bg-white/10 shadow-sm backdrop-blur transition hover:border-white/35 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:inline-flex"
            aria-label={`Ver notificações${totalNotificacoesAtual > 0 ? `: ${totalNotificacoesAtual} não lida(s)` : ""}`}
          >
            <Bell className="size-5" aria-hidden="true" />
            {totalNotificacoesAtual > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-secp-danger px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {totalNotificacoesAtual > 99 ? "99+" : totalNotificacoesAtual}
              </span>
            )}
          </Link>

          <div className="hidden min-w-0 items-center gap-3 rounded-md border border-white/15 bg-white/10 px-3 py-2 shadow-sm backdrop-blur md:flex">
            {fotoUrl ? (
              <Image
                src={fotoUrl}
                alt=""
                width={40}
                height={40}
                unoptimized
                className="size-10 rounded-full border-2 border-white bg-white object-cover shadow-sm ring-2 ring-white/25"
              />
            ) : (
              <span className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-white text-secp-blue-900 shadow-sm ring-2 ring-white/25">
                <UserRound className="size-4" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0 max-w-80">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-semibold">{nomeUsuario}</p>
                <span className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white/85">
                  {matricula}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-white/75">
                {funcaoOuCargo || perfilAtivo.nome}
              </p>
            </div>
          </div>

          <form action={onLogout}>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-semibold shadow-sm backdrop-blur transition hover:border-white/35 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label="Sair do sistema"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
