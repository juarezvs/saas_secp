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
    <Card className="p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-black text-slate-950 dark:text-slate-50">
          <Settings className="size-4 text-blue-700" aria-hidden="true" />
          Acesso rápido
        </h2>
        <Link
          href="/dashboard?secao=favoritos"
          className="text-xs font-bold text-secp-blue-700 hover:underline"
        >
          Ver todos
        </Link>
      </div>

      <AcessoRapidoFavoritos />

      {acessos.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          Nenhum atalho disponível para o perfil ativo.
        </p>
      ) : (
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {acessos.slice(0, 6).map((acesso) => {
            const Icon = acesso.icon;

            return (
              <Link
                key={`${acesso.href}-${acesso.titulo}`}
                href={acesso.href}
                className={`group flex min-h-[96px] flex-col justify-between rounded-xl border p-3 shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-slate-800 ${tomAcessoRapido(acesso.titulo).card}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={`grid size-10 place-items-center rounded-lg ${tomAcessoRapido(acesso.titulo).icon}`}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <ArrowRight
                    className="size-4 text-blue-700 transition group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black leading-tight text-blue-950 dark:text-blue-100">
                    {acesso.titulo}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-[11px] font-medium leading-tight text-slate-500">
                    {acesso.descricao}
                  </span>
                </span>
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
      card: "border-emerald-100 bg-emerald-50/45 hover:bg-emerald-50",
      icon: "bg-emerald-100 text-emerald-700",
    };
  }

  if (titulo.includes("Banco")) {
    return {
      card: "border-amber-100 bg-amber-50/45 hover:bg-amber-50",
      icon: "bg-amber-100 text-amber-700",
    };
  }

  if (titulo.includes("Comprovantes")) {
    return {
      card: "border-red-100 bg-red-50/45 hover:bg-red-50",
      icon: "bg-red-100 text-red-700",
    };
  }

  if (titulo.includes("Compensa")) {
    return {
      card: "border-blue-100 bg-blue-50/45 hover:bg-blue-50",
      icon: "bg-blue-100 text-blue-700",
    };
  }

  if (titulo.includes("afastamentos") || titulo.includes("Recesso")) {
    return {
      card: "border-violet-100 bg-violet-50/45 hover:bg-violet-50",
      icon: "bg-violet-100 text-violet-700",
    };
  }

  return {
    card: "border-blue-100 bg-blue-50/45 hover:bg-blue-50",
    icon: "bg-blue-100 text-blue-700",
  };
}
