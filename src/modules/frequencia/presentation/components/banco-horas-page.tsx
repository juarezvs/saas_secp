import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Card } from "@/components/ui";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { BancoHorasExtrato } from "./banco-horas-extrato";
import { BancoHorasSummaryCard } from "./banco-horas-summary-card";

export function BancoHorasPageMock() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Banco de Horas" }]} />
      <section>
        <p className="text-sm font-semibold uppercase text-secp-blue-700">Banco de horas</p>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">Saldo e extrato</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Acompanhe créditos, débitos, vencimentos e impactos antes de solicitar compensação.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Arts. 10 a 14"
        titulo="Limite mensal e compensação"
        descricao="O banco de horas observa limite ordinário mensal de 16h e compensação em até 3 meses."
      />

      <Card className="p-4 text-sm leading-6 text-muted-foreground">
        Esta tela é visual/mock. O botão de compensação está preparado para rota futura, sem cálculo real ou persistência.
      </Card>

      <BancoHorasSummaryCard />
      <BancoHorasExtrato />
    </div>
  );
}

