import type { LucideIcon } from "lucide-react";

import { cn } from "@/components/ui/utils";

const coresCardsInformativos = {
  azul: {
    barra: "bg-[#004b93]",
    fundo: "from-[#004b93]/10 via-card to-card",
    icone: "bg-[#004b93]/10 text-[#004b93] ring-[#004b93]/15",
    detalhe: "text-[#004b93]",
  },
  "azul-claro": {
    barra: "bg-[#0072ce]",
    fundo: "from-[#0072ce]/10 via-card to-card",
    icone: "bg-[#0072ce]/10 text-[#005ea8] ring-[#0072ce]/15",
    detalhe: "text-[#005ea8]",
  },
  verde: {
    barra: "bg-[#00843d]",
    fundo: "from-[#00843d]/10 via-card to-card",
    icone: "bg-[#00843d]/10 text-[#006b31] ring-[#00843d]/15",
    detalhe: "text-[#006b31]",
  },
  "verde-escuro": {
    barra: "bg-[#00594c]",
    fundo: "from-[#00594c]/10 via-card to-card",
    icone: "bg-[#00594c]/10 text-[#00594c] ring-[#00594c]/15",
    detalhe: "text-[#00594c]",
  },
  dourado: {
    barra: "bg-[#b78b20]",
    fundo: "from-[#b78b20]/12 via-card to-card",
    icone: "bg-[#b78b20]/10 text-[#8a6616] ring-[#b78b20]/15",
    detalhe: "text-[#8a6616]",
  },
  cinza: {
    barra: "bg-[#5f6b7a]",
    fundo: "from-[#5f6b7a]/12 via-card to-card",
    icone: "bg-[#5f6b7a]/10 text-[#475569] ring-[#5f6b7a]/15",
    detalhe: "text-[#475569]",
  },
} as const;

export type DashboardRoleCardColor = keyof typeof coresCardsInformativos;

type DashboardRoleCardProps = {
  titulo: string;
  valor: string | number;
  descricao: string;
  icon: LucideIcon;
  cor?: DashboardRoleCardColor;
};

export function DashboardRoleCard({
  titulo,
  valor,
  descricao,
  icon: Icon,
  cor = "azul",
}: DashboardRoleCardProps) {
  const tema = coresCardsInformativos[cor];

  return (
    <article
      className={cn(
        "relative min-h-40 overflow-hidden rounded-lg border border-border bg-gradient-to-br p-4 text-[var(--card-foreground)] shadow-sm",
        tema.fundo,
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", tema.barra)} />
      <div className="flex h-full min-w-0 flex-col pl-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              "min-w-0 text-xs font-black uppercase tracking-normal",
              tema.detalhe,
            )}
          >
            {titulo}
          </p>
          <span
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
              tema.icone,
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
        </div>

        <p className="mt-3 text-3xl font-black tracking-normal text-foreground">
          {valor}
        </p>
        <p className="mt-auto pt-3 text-xs leading-5 text-[var(--muted-foreground)]">
            {descricao}
        </p>
      </div>
    </article>
  );
}
