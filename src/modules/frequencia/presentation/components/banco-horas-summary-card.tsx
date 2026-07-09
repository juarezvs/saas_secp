import { Clock, Hourglass, TrendingDown, TrendingUp } from "lucide-react";

import { Button, Card } from "@/components/ui";
import { bancoHorasMock } from "../data/espelho-banco-horas.mock";

const cards = [
  { titulo: "Saldo atual", valor: bancoHorasMock.saldoAtual, descricao: "Créditos menos débitos validados.", icon: Hourglass },
  { titulo: "Créditos a vencer", valor: bancoHorasMock.creditosAVencer, descricao: "Acompanhe antes do prazo final.", icon: TrendingUp },
  { titulo: "Débitos a compensar", valor: bancoHorasMock.debitosACompensar, descricao: "Horas negativas pendentes.", icon: TrendingDown },
  { titulo: "Limite mensal", valor: bancoHorasMock.limiteMensal, descricao: "Limite ordinário de crédito no mês.", icon: Clock },
];

export function BancoHorasSummaryCard() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.titulo} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{card.titulo}</p>
                <p className="mt-2 text-3xl font-bold">{card.valor}</p>
              </div>
              <span className="secp-theme-icon rounded-lg p-3">
                <Icon className="size-5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.descricao}</p>
          </Card>
        );
      })}
      <Card className="p-5 md:col-span-2 xl:col-span-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <p className="text-sm leading-6 text-muted-foreground">
            Prazo de compensação: <strong className="text-foreground">{bancoHorasMock.prazoCompensacao}</strong>. {bancoHorasMock.impacto}
          </p>
          <Button>Solicitar compensação</Button>
        </div>
      </Card>
    </section>
  );
}

