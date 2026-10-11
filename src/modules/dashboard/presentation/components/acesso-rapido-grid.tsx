import Link from "next/link";
import { ArrowRight, Settings } from "lucide-react";

import { Card } from "@/components/ui";
import type { AcessoRapido } from "../data/dashboard-servidor.config";
import { AcessoRapidoFavoritos } from "./acesso-rapido-favoritos";

type AcessoRapidoGridProps = {
  acessos: AcessoRapido[];
};

export function AcessoRapidoGrid({ acessos }: AcessoRapidoGridProps) {
  return (
    <Card className="overflow-hidden rounded border-zinc-200 p-0 shadow-[0_1px_2px_rgba(0,0,0,0.12),0_3px_8px_rgba(0,0,0,0.06)] dark:border-zinc-700">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
        <h2 className="inline-flex items-center gap-2 text-sm font-black text-slate-950 dark:text-slate-50">
          <span className="grid size-8 place-items-center bg-[#0078d4] text-white"><Settings className="size-4" aria-hidden="true" /></span>
          Acesso rápido
        </h2>
        <Link
          href="/dashboard?secao=favoritos"
          className="text-xs font-bold text-secp-blue-700 hover:underline"
        >
          Ver todos
        </Link>
      </div>

      <div className="px-3"><AcessoRapidoFavoritos /></div>

      {acessos.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          Nenhum atalho disponível para o perfil ativo.
        </p>
      ) : (
        <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
          {acessos.slice(0, 6).map((acesso) => {
            const Icon = acesso.icon;

            return (
              <Link
                key={`${acesso.href}-${acesso.titulo}`}
                href={acesso.href}
                className="group flex min-h-[88px] items-start gap-3 rounded border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-blue-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-zinc-700 dark:bg-zinc-950"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`grid size-9 shrink-0 place-items-center text-white ${tomAcessoRapido(acesso.titulo).icon}`}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-black leading-tight text-blue-950 dark:text-blue-100">
                    {acesso.titulo}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-[11px] font-medium leading-tight text-slate-500">
                    {acesso.descricao}
                  </span>
                </span>
                <ArrowRight className="mt-2 size-4 shrink-0 text-blue-700 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function tomAcessoRapido(titulo: string) {
  if (titulo.includes("Solicitar")) {
    return {
      icon: "bg-[#107c10]",
    };
  }

  if (titulo.includes("Banco")) {
    return {
      icon: "bg-[#ffb900]",
    };
  }

  if (titulo.includes("Comprovantes")) {
    return {
      icon: "bg-[#d83b01]",
    };
  }

  if (titulo.includes("Compensa")) {
    return {
      icon: "bg-[#0078d4]",
    };
  }

  if (titulo.includes("afastamentos") || titulo.includes("Recesso")) {
    return {
      icon: "bg-[#8661c5]",
    };
  }

  return {
    icon: "bg-[#0078d4]",
  };
}
