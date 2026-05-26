"use client";

import { Menu, UserRound } from "lucide-react";
import { AccessibilityToolbar } from "@/components/accessibility/accessibility-toolbar";
import type { PerfilSessao } from "@/modules/auth/domain/entities/usuario-autenticado";

type HeaderProps = {
  nomeUsuario: string;
  matricula: string;
  perfilAtivo: PerfilSessao | null;
  onToggleSidebar: () => void;
};

export function Header({
  nomeUsuario,
  matricula,
  perfilAtivo,
  onToggleSidebar,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex size-10 items-center justify-center rounded-lg border bg-[var(--card)] transition hover:bg-[var(--muted)]"
            aria-label="Abrir ou recolher menu lateral"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
              Justiça Federal do Amazonas
            </p>
            <h1 className="text-sm font-bold text-[var(--foreground)] sm:text-base">
              SECP — Controle Eletrônico de Ponto
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AccessibilityToolbar />

          <div className="hidden items-center gap-3 rounded-xl border bg-[var(--muted)] px-3 py-2 lg:flex">
            <div className="rounded-full bg-blue-900 p-2 text-white dark:bg-blue-700">
              <UserRound className="size-4" aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                {nomeUsuario}
              </p>
              <p className="truncate text-xs text-[var(--muted-foreground)]">
                {matricula} • {perfilAtivo?.codigo ?? "sem perfil"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
