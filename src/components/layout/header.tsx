"use client";

import { Menu, ShieldCheck, UserRound } from "lucide-react";
import { AccessibilityToolbar } from "@/components/accessibility/accessibility-toolbar";
import type { PerfilSessao } from "@/modules/auth/domain/entities/usuario-autenticado";

type PerfilSessaoComRotulo = PerfilSessao & {
  id?: string;
  nome?: string;
  descricao?: string;
};

type HeaderProps = {
  nomeUsuario: string;
  matricula: string;
  perfis: PerfilSessao[];
  perfilAtivo: PerfilSessao | null;
  alterandoPerfil?: boolean;
  onToggleSidebar: () => void;
  onPerfilAtivoChange: (perfil: PerfilSessao) => void | Promise<void>;
};

function obterRotuloPerfil(perfil: PerfilSessao | null) {
  if (!perfil) {
    return "Sem perfil";
  }

  const perfilComRotulo = perfil as PerfilSessaoComRotulo;

  return perfilComRotulo.nome ?? perfilComRotulo.descricao ?? perfil.codigo;
}

function obterChavePerfil(perfil: PerfilSessao) {
  const perfilComRotulo = perfil as PerfilSessaoComRotulo;

  return perfilComRotulo.id ?? perfil.codigo;
}

export function Header({
  nomeUsuario,
  matricula,
  perfis,
  perfilAtivo,
  alterandoPerfil = false,
  onToggleSidebar,
  onPerfilAtivoChange,
}: HeaderProps) {
  const deveMostrarSeletor = perfis.length > 1;

  function handlePerfilChange(codigoPerfil: string) {
    const novoPerfil = perfis.find((perfil) => perfil.codigo === codigoPerfil);

    if (!novoPerfil || novoPerfil.codigo === perfilAtivo?.codigo) {
      return;
    }

    void onPerfilAtivoChange(novoPerfil);
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border bg-[var(--card)] transition hover:bg-[var(--muted)]"
            aria-label="Abrir ou recolher menu lateral"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
              Justiça Federal do Amazonas
            </p>
            <h1 className="truncate text-sm font-bold text-[var(--foreground)] sm:text-base">
              SECP — Controle Eletrônico de Ponto
            </h1>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <AccessibilityToolbar />

          <div className="hidden min-w-0 items-center gap-3 rounded-xl border bg-[var(--muted)] px-3 py-2 lg:flex">
            <div className="rounded-full bg-blue-900 p-2 text-white dark:bg-blue-700">
              <UserRound className="size-4" aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <p className="max-w-48 truncate text-sm font-semibold text-[var(--foreground)]">
                {nomeUsuario}
              </p>
              <p className="truncate text-xs text-[var(--muted-foreground)]">
                {matricula}
              </p>
            </div>
          </div>

          <div className="flex min-w-[12rem] items-center gap-2 rounded-xl border bg-[var(--muted)] px-3 py-2">
            <ShieldCheck
              className="size-4 shrink-0 text-blue-900 dark:text-blue-300"
              aria-hidden="true"
            />

            {deveMostrarSeletor ? (
              <label className="flex min-w-0 flex-1 items-center gap-2">
                <span className="sr-only">Perfil ativo da sessão</span>
                <select
                  value={perfilAtivo?.codigo ?? ""}
                  disabled={alterandoPerfil}
                  onChange={(event) => handlePerfilChange(event.target.value)}
                  className="w-full rounded-md border bg-[var(--card)] px-2 py-1 text-xs font-semibold text-[var(--foreground)] outline-none transition focus:ring-2 focus:ring-blue-700 disabled:cursor-wait disabled:opacity-70"
                  aria-label="Selecionar perfil ativo"
                >
                  {perfis.map((perfil) => (
                    <option key={obterChavePerfil(perfil)} value={perfil.codigo}>
                      {obterRotuloPerfil(perfil)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="truncate text-xs font-semibold text-[var(--foreground)]">
                {obterRotuloPerfil(perfilAtivo)}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
