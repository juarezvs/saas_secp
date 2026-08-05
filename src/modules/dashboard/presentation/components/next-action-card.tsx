import Link from "next/link";
import { ArrowRight, ScanFace } from "lucide-react";

import { Badge } from "@/components/ui";

type NextActionCardProps = {
  titulo: string;
  descricao: string;
  href: string;
  regra: string;
};

export function NextActionCard({
  titulo,
  descricao,
  href,
  regra,
}: NextActionCardProps) {
  return (
    <section className="rounded-md bg-secp-blue-900 p-3.5 text-white shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge className="bg-white/15 text-white">
            Próxima ação recomendada
          </Badge>
          <h2 className="mt-2.5 max-w-xl text-sm font-bold leading-tight md:text-base">
            {titulo}
          </h2>
          <p className="mt-1 text-xs leading-5 text-white/80">{descricao}</p>
          <Link
            href={href}
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-[color-mix(in_srgb,var(--secp-theme-accent)_18%,white)] bg-[var(--secp-theme-accent-contrast)] px-3 py-1.5 text-sm font-bold text-[var(--secp-theme-accent)] shadow-sm transition hover:bg-[color-mix(in_srgb,var(--secp-theme-accent-contrast)_92%,var(--secp-theme-accent)_8%)] hover:text-[var(--secp-theme-accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Registrar ponto
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <ScanFace
          className="hidden size-12 shrink-0 text-white/80 sm:block"
          aria-hidden="true"
        />
      </div>
      <p className="mt-3 rounded-md bg-white/10 px-2.5 py-1 text-xs leading-5 text-white/80">
        {regra}
      </p>
    </section>
  );
}
