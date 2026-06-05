import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "@/components/ui";
import type { AcessoRapido } from "../data/dashboard-servidor.mock";

type AcessoRapidoGridProps = {
  acessos: AcessoRapido[];
};

export function AcessoRapidoGrid({ acessos }: AcessoRapidoGridProps) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Acesso rápido</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {acessos.map((acesso) => {
          const Icon = acesso.icon;

          return (
            <Link
              key={acesso.titulo}
              href={acesso.href}
              className="group rounded-md border border-border p-4 transition hover:border-secp-blue-700 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Icon className="size-6 text-secp-blue-700" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-bold">{acesso.titulo}</h3>
              <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{acesso.descricao}</p>
              <ArrowRight className="mt-3 size-4 text-muted-foreground transition group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

