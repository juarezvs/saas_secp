import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui";
import type { AcessoRapido } from "../data/dashboard-servidor.config";

type AcessoRapidoGridProps = {
  acessos: AcessoRapido[];
};

export function AcessoRapidoGrid({ acessos }: AcessoRapidoGridProps) {
  return (
    <Card className="p-2.5">
      <h2 className="text-sm font-semibold">Acesso rápido</h2>
      {acessos.length === 0 ? (
        <p className="mt-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          Nenhum atalho disponível para o perfil ativo.
        </p>
      ) : (
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-5">
          {acessos.map((acesso) => {
            const Icon = acesso.icon;

            return (
              <Link
                key={acesso.titulo}
                href={acesso.href}
                className="group flex min-h-11 items-center gap-2 rounded-md border border-border p-2 transition hover:border-secp-blue-700 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Icon
                  className="size-4 shrink-0 text-secp-blue-700"
                  aria-hidden="true"
                />
                <h3 className="min-w-0 flex-1 text-xs font-bold leading-tight">
                  {acesso.titulo}
                </h3>
                <ArrowRight
                  className="size-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
