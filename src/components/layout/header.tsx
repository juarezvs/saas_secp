"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UserRound,
  WandSparkles,
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
  onStartTour?: () => void;
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
  onStartTour,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [totalNotificacoesAtual, setTotalNotificacoesAtual] =
    useState(totalNotificacoes);
  const [seletorPerfilAberto, setSeletorPerfilAberto] = useState(false);
  const [perfilPendente, startTransition] = useTransition();
  const seletorPerfilRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!seletorPerfilAberto) {
      return;
    }

    function fecharAoClicarFora(event: MouseEvent) {
      if (!seletorPerfilRef.current?.contains(event.target as Node)) {
        setSeletorPerfilAberto(false);
      }
    }

    function fecharComEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSeletorPerfilAberto(false);
      }
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEsc);

    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEsc);
    };
  }, [seletorPerfilAberto]);

  function selecionarPerfil(codigo: string) {
    const novoPerfil = perfis.find((perfil) => perfil.codigo === codigo);

    if (novoPerfil) {
      setSeletorPerfilAberto(false);
      startTransition(async () => {
        const response = await fetch("/api/sessao/perfil-ativo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
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

          <div
            ref={seletorPerfilRef}
            className="relative hidden min-w-56 lg:block"
            data-tour="perfil-ativo"
          >
            <button
              type="button"
              onClick={() => setSeletorPerfilAberto((aberto) => !aberto)}
              disabled={perfilPendente}
              className="flex h-11 w-full items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 text-left shadow-sm backdrop-blur transition hover:border-white/35 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait disabled:opacity-70"
              aria-label="Selecionar perfil ativo"
              aria-haspopup="listbox"
              aria-expanded={seletorPerfilAberto}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-secp-blue-900 shadow-sm ring-1 ring-white/40">
                <ShieldCheck className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase leading-none text-white/65">
                  Perfil ativo
                </span>
                <span className="mt-1 block truncate text-xs font-semibold text-white">
                  {perfilAtivo.nome}
                </span>
              </span>
              <ChevronDown
                className={`size-4 shrink-0 text-white/80 transition ${
                  seletorPerfilAberto ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {seletorPerfilAberto && (
              <div
                className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-2xl shadow-slate-950/25 ring-1 ring-white/70"
                role="listbox"
                aria-label="Perfis disponiveis"
              >
                <div className="border-b border-[var(--border)] bg-gradient-to-r from-secp-blue-900 via-secp-blue-800 to-secp-blue-700 px-4 py-3 text-white">
                  <p className="text-xs font-semibold uppercase text-white/70">
                    Alternar perfil
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold">
                    {nomeUsuario}
                  </p>
                </div>

                <div className="max-h-80 overflow-y-auto p-2">
                  {perfis.map((perfil) => {
                    const ativo = perfil.codigo === perfilAtivo.codigo;
                    const detalhePerfil = perfil.descricao;

                    return (
                      <button
                        key={perfil.codigo}
                        type="button"
                        onClick={() => selecionarPerfil(perfil.codigo)}
                        disabled={perfilPendente || ativo}
                        className={`group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--secp-theme-accent)] ${
                          ativo
                            ? "bg-[var(--secp-theme-soft)] text-[var(--secp-theme-strong)]"
                            : "text-foreground hover:bg-muted"
                        } disabled:cursor-default`}
                        role="option"
                        aria-selected={ativo}
                      >
                        <span
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border ${
                            ativo
                              ? "border-[var(--secp-theme-border)] bg-white text-[var(--secp-theme-strong)]"
                              : "border-[var(--border)] bg-background text-muted-foreground group-hover:text-[var(--secp-theme-strong)]"
                          }`}
                        >
                          {ativo ? (
                            <Check className="size-4" aria-hidden="true" />
                          ) : (
                            <ShieldCheck
                              className="size-4"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {perfil.nome}
                          </span>
                          {detalhePerfil && (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {detalhePerfil}
                            </span>
                          )}
                        </span>
                        {ativo && (
                          <span className="mt-1 rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--secp-theme-strong)] ring-1 ring-[var(--secp-theme-border)]">
                            Atual
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {onStartTour && perfilAtivo.codigo.toUpperCase() === "SERVIDOR" && (
            <button
              type="button"
              onClick={onStartTour}
              className="inline-flex size-10 items-center justify-center rounded-md border border-white/20 bg-white/10 shadow-sm backdrop-blur transition hover:border-white/35 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label="Iniciar tour explicativo do SECP"
              title="Tour explicativo"
              data-tour="tour-secp"
            >
              <WandSparkles className="size-5" aria-hidden="true" />
            </button>
          )}

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
