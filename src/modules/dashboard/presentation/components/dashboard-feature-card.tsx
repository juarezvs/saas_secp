import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui";
import { cn } from "@/components/ui/utils";

const coresCards = {
  azul: {
    barra: "bg-[#004b93]",
    fundo: "from-[#004b93]/8 via-transparent to-transparent",
    icone: "bg-[#004b93]/10 text-[#004b93] ring-[#004b93]/15",
    rodape: "text-[#004b93]",
    hover: "hover:border-[#004b93]/50",
  },
  "azul-claro": {
    barra: "bg-[#0072ce]",
    fundo: "from-[#0072ce]/8 via-transparent to-transparent",
    icone: "bg-[#0072ce]/10 text-[#005ea8] ring-[#0072ce]/15",
    rodape: "text-[#005ea8]",
    hover: "hover:border-[#0072ce]/50",
  },
  verde: {
    barra: "bg-[#00843d]",
    fundo: "from-[#00843d]/8 via-transparent to-transparent",
    icone: "bg-[#00843d]/10 text-[#006b31] ring-[#00843d]/15",
    rodape: "text-[#006b31]",
    hover: "hover:border-[#00843d]/50",
  },
  "verde-escuro": {
    barra: "bg-[#00594c]",
    fundo: "from-[#00594c]/8 via-transparent to-transparent",
    icone: "bg-[#00594c]/10 text-[#00594c] ring-[#00594c]/15",
    rodape: "text-[#00594c]",
    hover: "hover:border-[#00594c]/50",
  },
  dourado: {
    barra: "bg-[#b78b20]",
    fundo: "from-[#b78b20]/10 via-transparent to-transparent",
    icone: "bg-[#b78b20]/10 text-[#8a6616] ring-[#b78b20]/15",
    rodape: "text-[#8a6616]",
    hover: "hover:border-[#b78b20]/50",
  },
  cinza: {
    barra: "bg-[#5f6b7a]",
    fundo: "from-[#5f6b7a]/10 via-transparent to-transparent",
    icone: "bg-[#5f6b7a]/10 text-[#475569] ring-[#5f6b7a]/15",
    rodape: "text-[#475569]",
    hover: "hover:border-[#5f6b7a]/50",
  },
} as const;

export type DashboardFeatureCardColor = keyof typeof coresCards;

type DashboardFeatureCardProps = {
  titulo: string;
  descricao: string;
  href: string;
  icon: LucideIcon;
  cor?: DashboardFeatureCardColor;
};

export function DashboardFeatureCard({
  titulo,
  descricao,
  href,
  icon: Icon,
  cor = "azul",
}: DashboardFeatureCardProps) {
  const tema = coresCards[cor];

  return (
    <Link href={href} className="group flex min-w-0">
      <Card
        className={cn(
          "relative flex min-h-56 w-full overflow-hidden p-0 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg",
          "bg-gradient-to-br",
          tema.fundo,
          tema.hover,
        )}
      >
        <span className={cn("absolute inset-x-0 top-0 h-1", tema.barra)} />
        <div className="flex min-w-0 flex-1 flex-col p-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 text-sm font-black leading-5 text-[var(--card-foreground)]">
              {titulo}
            </h2>
            <span
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
                tema.icone,
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
          </div>

          <p className="mt-5 line-clamp-4 text-xs leading-5 text-[var(--muted-foreground)]">
            {descricao}
          </p>

          <span
            className={cn(
              "mt-auto flex items-center justify-between border-t border-border/70 pt-4 text-xs font-black uppercase",
              tema.rodape,
            )}
          >
            Acessar
            <ArrowRight
              className="size-4 transition group-hover:translate-x-1"
              aria-hidden="true"
            />
          </span>
        </div>
      </Card>
    </Link>
  );
}
