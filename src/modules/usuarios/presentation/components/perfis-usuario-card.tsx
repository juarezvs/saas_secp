"use client";

import { useState } from "react";
import { KeyRound, MapPin, Search, ShieldCheck, UsersRound } from "lucide-react";

import { alterarStatusPerfilUsuarioAction } from "../../application/actions/alterar-status-perfil-usuario.action";
import { desvincularPerfilUsuarioAction } from "../../application/actions/desvincular-perfil-usuario.action";
import { DesvincularPerfilUsuarioButton } from "./desvincular-perfil-usuario-button";

type UsuarioPerfilItem = {
  id: string;
  ativo: boolean;
  orgao?: { sigla: string; nome: string } | null;
  perfil: {
    id: string;
    codigo: string;
    nome: string;
    descricao: string | null;
    permissoes?: { permissao: { codigo: string } }[];
  };
};

export function PerfisUsuarioCard({
  usuarioId,
  perfis,
}: {
  usuarioId: string;
  perfis: UsuarioPerfilItem[];
}) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const perfisFiltrados = termo
    ? perfis.filter((item) =>
        [
          item.perfil.nome,
          item.perfil.codigo,
          item.perfil.descricao,
          item.orgao?.sigla,
          item.orgao?.nome,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(termo),
      )
    : perfis;

  return (
    <section id="perfis" className="rounded border border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="secp-theme-icon grid size-10 shrink-0 place-items-center rounded">
            <UsersRound className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-bold">Perfis vinculados</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Perfis, escopos, permissões e situação de acesso.
            </p>
          </div>
        </div>
        <label className="flex h-9 w-full items-center gap-2 rounded border border-border px-3 text-muted-foreground sm:w-56">
          <Search className="size-4" aria-hidden="true" />
          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar perfil..."
            aria-label="Buscar perfil"
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
          />
        </label>
      </header>

      <div className="space-y-2 p-3">
        {perfisFiltrados.map((usuarioPerfil) => {
          const alterarStatusAction = alterarStatusPerfilUsuarioAction.bind(
            null,
            usuarioPerfil.id,
            usuarioId,
            !usuarioPerfil.ativo,
          );
          const desvincularAction = desvincularPerfilUsuarioAction.bind(
            null,
            usuarioPerfil.id,
            usuarioId,
          );

          return (
            <article
              key={usuarioPerfil.id}
              className="grid min-w-0 gap-3 rounded border border-border bg-card px-3 py-2.5 md:grid-cols-[minmax(12rem,1fr)_minmax(15rem,1.7fr)_minmax(12rem,1.35fr)_7rem_auto_auto] md:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="secp-theme-icon grid size-9 shrink-0 place-items-center rounded">
                  <ShieldCheck className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{usuarioPerfil.perfil.nome}</p>
                  <code className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                    {usuarioPerfil.perfil.codigo}
                  </code>
                </div>
              </div>

              <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                {usuarioPerfil.perfil.descricao ?? "Perfil de acesso ao SECP."}
              </p>

              <div className="flex min-w-0 items-center gap-2 border-border md:border-l md:pl-3">
                <MapPin className="size-4 shrink-0 text-[var(--secp-theme-accent)]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Escopo de atuação</p>
                  <p className="truncate text-xs font-medium">
                    {usuarioPerfil.orgao
                      ? `${usuarioPerfil.orgao.sigla} - ${usuarioPerfil.orgao.nome}`
                      : "Global"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-border md:border-l md:pl-3">
                <KeyRound className="size-4 text-[var(--secp-theme-accent)]" aria-hidden="true" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Permissões</p>
                  <p className="text-xs font-semibold">{usuarioPerfil.perfil.permissoes?.length ?? 0}</p>
                </div>
              </div>

              <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                usuarioPerfil.ativo
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}>
                <span className={`size-1.5 rounded-full ${usuarioPerfil.ativo ? "bg-emerald-600" : "bg-slate-500"}`} />
                {usuarioPerfil.ativo ? "Ativo" : "Inativo"}
              </span>

              <DesvincularPerfilUsuarioButton
                action={desvincularAction}
                alterarStatusAction={alterarStatusAction}
                perfilNome={usuarioPerfil.perfil.nome}
                ativo={usuarioPerfil.ativo}
              />
            </article>
          );
        })}

        {perfisFiltrados.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {perfis.length === 0
              ? "Nenhum perfil vinculado a este usuário."
              : "Nenhum perfil corresponde à busca."}
          </div>
        ) : null}
      </div>
    </section>
  );
}
