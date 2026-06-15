"use client";

import Link from "next/link";
import { CalendarCheck, FileText } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Button, Card } from "@/components/ui";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { homologacaoChefiaMock } from "../data/homologacao-chefia.mock";
import { HomologacaoQueue } from "./homologacao-queue";

export function DashboardChefiaPage() {
  const primeiro = homologacaoChefiaMock.servidores[0];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Homologação" }]} />
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase text-secp-blue-700">Homologação da chefia</p>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">Fila mensal da unidade {homologacaoChefiaMock.unidade}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Priorize pendências críticas, análise solicitações e homologue a frequência mensal da equipe.
          </p>
        </div>
        <Link href="/homologacao/mock-junho-2026" className="inline-flex h-10 items-center justify-center rounded-md bg-secp-blue-900 px-4 text-sm font-semibold text-white hover:bg-secp-blue-800">
          Abrir homologação mensal
        </Link>
      </section>

      <RegraPortariaCard
        artigo="Homologação mensal"
        titulo="Prazo de análise da chefia"
        descricao="A chefia deve homologar a frequência até o 2º dia útil e encaminhar o boletim até o dia 10."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <PrazoCard icon={CalendarCheck} titulo="Prazo de homologação" valor={homologacaoChefiaMock.prazos.homologacao} destaque />
        <PrazoCard icon={FileText} titulo="Boletim de frequência" valor={homologacaoChefiaMock.prazos.boletim} />
        <Metrica label="Servidores" value={homologacaoChefiaMock.metricas.total} />
        <Metrica label="Críticos" value={homologacaoChefiaMock.metricas.criticos} />
        <Metrica label="Pendentes" value={homologacaoChefiaMock.metricas.pendentes} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.35fr]">
        <HomologacaoQueue servidores={homologacaoChefiaMock.servidores} selecionadoId={primeiro.id} onSelecionar={() => undefined} />
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Como decidir agora</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Comece pelos servidores críticos. Em seguida, resolva pendentes, homologue regulares e prepare o boletim.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Button>Analisar</Button>
            <Button variant="outline">Devolver para ajuste</Button>
            <Button variant="success">Homologar</Button>
          </div>
        </Card>
      </section>
    </div>
  );
}

function PrazoCard({ icon: Icon, titulo, valor, destaque = false }: { icon: typeof CalendarCheck; titulo: string; valor: string; destaque?: boolean }) {
  return (
    <Card className={destaque ? "border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950" : "p-5"}>
      <Icon className="size-5 text-secp-blue-700" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-lg font-bold">{valor}</p>
    </Card>
  );
}

function Metrica({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </Card>
  );
}
