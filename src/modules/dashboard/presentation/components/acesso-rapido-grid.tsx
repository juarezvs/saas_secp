import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui";
import type { AcessoRapido } from "../data/dashboard-servidor.mock";

type AcessoRapidoGridProps = {
  acessos: AcessoRapido[];
};

export function AcessoRapidoGrid({ acessos }: AcessoRapidoGridProps) {
  return (
    <Card className="p-3">
      <h2 className="text-sm font-semibold">Acesso rápido</h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {acessos.map((acesso) => {
          const Icon = acesso.icon;

          return (
            <Link
              key={acesso.titulo}
              href={acesso.href}
              className="group flex min-h-16 flex-col justify-between rounded-md border border-border p-2.5 transition hover:border-secp-blue-700 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex items-center justify-between gap-2">
                <Icon
                  className="size-4 shrink-0 text-secp-blue-700"
                  aria-hidden="true"
                />
                <ArrowRight
                  className="size-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-2 text-xs font-bold leading-tight">
                {acesso.titulo}
              </h3>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
