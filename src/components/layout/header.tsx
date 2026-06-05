"use client";

import {
  Bell,
  Building2,
  Menu,
  PanelLeftClose,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AccessibilityToolbar } from "@/components/accessibility/accessibility-toolbar";
import type { PerfilNavegacao } from "@/components/layout/sidebar";

type HeaderProps = {
  nomeUsuario: string;
  matricula: string;
  unidadeAtual: string;
  perfis: PerfilNavegacao[];
  perfilAtivo: PerfilNavegacao;
  onToggleSidebar: () => void;
  onOpenMobileMenu: () => void;
  onPerfilAtivoChange: (perfil: PerfilNavegacao) => void;
};

export function Header({
  nomeUsuario,
  matricula,
  unidadeAtual,
  perfis,
  perfilAtivo,
  onToggleSidebar,
  onOpenMobileMenu,
  onPerfilAtivoChange,
}: HeaderProps) {
  function selecionarPerfil(codigo: string) {
    const novoPerfil = perfis.find((perfil) => perfil.codigo === codigo);

    if (novoPerfil) {
      onPerfilAtivoChange(novoPerfil);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 secp-institutional-gradient text-white shadow-sm">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="inline-flex size-10 items-center justify-center rounded-md border border-white/20 bg-white/10 transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:hidden"
            aria-label="Abrir menu principal"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden size-10 items-center justify-center rounded-md border border-white/20 bg-white/10 transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:inline-flex"
            aria-label="Recolher ou expandir menu lateral"
          >
            <PanelLeftClose className="size-5" aria-hidden="true" />
          </button>

          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white text-sm font-black text-secp-blue-900">
            SE
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase text-white/75">
              Sistema Eletronico de Controle de Ponto
            </p>
            <h1 className="truncate text-base font-bold">SECP</h1>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden min-w-0 items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm xl:flex">
            <Building2 className="size-4 shrink-0" aria-hidden="true" />
            <span className="max-w-56 truncate">{unidadeAtual}</span>
          </div>

          <label className="hidden min-w-44 items-center gap-2 rounded-md bg-white/10 px-3 py-2 lg:flex">
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">Perfil ativo</span>
            <select
              value={perfilAtivo.codigo}
              onChange={(event) => selecionarPerfil(event.target.value)}
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

          <AccessibilityToolbar />

          <button
            type="button"
            className="hidden size-10 items-center justify-center rounded-md border border-white/20 bg-white/10 transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:inline-flex"
            aria-label="Ver notificacoes"
          >
            <Bell className="size-5" aria-hidden="true" />
          </button>

          <div className="hidden min-w-0 items-center gap-3 rounded-md bg-white/10 px-3 py-2 md:flex">
            <span className="flex size-8 items-center justify-center rounded-full bg-white text-secp-blue-900">
              <UserRound className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="max-w-40 truncate text-sm font-semibold">
                {nomeUsuario}
              </p>
              <p className="truncate text-xs text-white/75">{matricula}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

