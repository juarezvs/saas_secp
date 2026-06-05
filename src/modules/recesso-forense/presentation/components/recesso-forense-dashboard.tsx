import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Card } from "@/components/ui";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import {
  convocadosRecessoMock,
  espelhoRecessoMock,
  periodosRecessoMock,
} from "../data/recesso-forense.mock";
import { ChefiaRecessoSelectorMock } from "./chefia-recesso-selector-mock";
import { ConvocadosTable } from "./convocados-table";
import { EspelhoRecessoServidor } from "./espelho-recesso-servidor";
import { FluxoRecessoTimeline } from "./fluxo-recesso-timeline";
import { PeriodoRecessoCard } from "./periodo-recesso-card";
import { RelatorioRecessoResumo } from "./relatorio-recesso-resumo";

export function RecessoForenseDashboard() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Recesso forense" }]} />
      <section>
        <p className="text-sm font-semibold uppercase text-secp-blue-700">Recesso forense</p>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">Acompanhamento do recesso 20/12 a 06/01</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Visual separado do ponto ordinário para convocação, fechamento, homologação, pecúnia e folgas.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Recesso forense"
        titulo="Tratamento separado da frequência ordinária"
        descricao="Dias não convocados devem ser identificados como Recesso forense e não como ausência."
      />

      <Card className="p-4 text-sm leading-6 text-muted-foreground">
        Dezembro e janeiro são homologados separadamente. Esta tela é somente UI/mock e não calcula pecúnia ou folga.
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        {periodosRecessoMock.map((periodo) => <PeriodoRecessoCard key={periodo.id} periodo={periodo} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <ConvocadosTable convocados={convocadosRecessoMock} />
        <div className="space-y-4">
          <ChefiaRecessoSelectorMock />
          <FluxoRecessoTimeline />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <EspelhoRecessoServidor dias={espelhoRecessoMock} />
        <RelatorioRecessoResumo />
      </section>
    </div>
  );
}

