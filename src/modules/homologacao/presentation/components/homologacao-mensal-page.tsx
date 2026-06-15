"use client";

import { useState } from "react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Card } from "@/components/ui";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { homologacaoChefiaMock, type ServidorHomologacaoMock } from "../data/homologacao-chefia.mock";
import { AnaliseFrequenciaServidor } from "./analise-frequencia-servidor";
import { ApprovalFlow } from "./approval-flow";
import { HomologacaoQueue } from "./homologacao-queue";
import { TimelineAuditoriaMock } from "./timeline-auditoria-mock";

export function HomologacaoMensalPage() {
  const [selecionado, setSelecionado] = useState<ServidorHomologacaoMock>(homologacaoChefiaMock.servidores[0]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Homologação", href: "/homologacao" }, { label: homologacaoChefiaMock.competencia }]} />
      <section>
        <p className="text-sm font-semibold uppercase text-secp-blue-700">Homologação mensal</p>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">{homologacaoChefiaMock.unidade} • {homologacaoChefiaMock.competencia}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Análise cada servidor, devolva inconsistências e homologue apenas frequências aptas.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Homologação mensal"
        titulo="Responsabilidade da chefia"
        descricao="A decisão da chefia será auditável e servirá de base para o boletim de frequência."
      />

      <Card className="grid gap-3 p-4 text-sm md:grid-cols-2">
        <p><strong>Prazo de homologação:</strong> {homologacaoChefiaMock.prazos.homologacao}</p>
        <p><strong>Boletim:</strong> {homologacaoChefiaMock.prazos.boletim}</p>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.4fr]">
        <HomologacaoQueue servidores={homologacaoChefiaMock.servidores} selecionadoId={selecionado.id} onSelecionar={setSelecionado} />
        <div className="space-y-4">
          <AnaliseFrequenciaServidor servidor={selecionado} />
          <div className="grid gap-4 lg:grid-cols-2">
            <ApprovalFlow />
            <TimelineAuditoriaMock />
          </div>
        </div>
      </section>
    </div>
  );
}

