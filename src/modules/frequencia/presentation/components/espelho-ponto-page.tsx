"use client";

import { useMemo, useState } from "react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Card } from "@/components/ui";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { espelhoPontoMock } from "../data/espelho-banco-horas.mock";
import { EspelhoFiltros } from "./espelho-filtros";
import { EspelhoPontoTable } from "./espelho-ponto-table";

export function EspelhoPontoPageMock() {
  const [filtros, setFiltros] = useState({ mes: "Junho/2026", status: "Todos", tipo: "Todos" });
  const diasFiltrados = useMemo(() => {
    return espelhoPontoMock.filter((dia) => {
      const statusOk = filtros.status === "Todos" || filtros.status.toLowerCase().includes(dia.situacao);
      const tipoOk = filtros.tipo === "Todos" || filtros.tipo.toLowerCase().includes(dia.tipo);
      return statusOk && tipoOk;
    });
  }, [filtros]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Espelho de ponto" }]} />
      <section>
        <p className="text-sm font-semibold uppercase text-secp-blue-700">Frequência mensal</p>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">Espelho de ponto</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Consulte marcações, créditos, débitos e situações do mês antes da homologação.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Arts. 8º, 16 e 17"
        titulo="Conferência e homologação"
        descricao="O espelho permite consulta pelo servidor e apoia a homologação mensal pela chefia."
      />

      <Card className="p-4 text-sm leading-6 text-muted-foreground">
        Durante o recesso, dias não convocados aparecem como <strong className="text-foreground">Recesso forense</strong>, não como ausência.
      </Card>

      <EspelhoFiltros {...filtros} onChange={(valor) => setFiltros((atual) => ({ ...atual, ...valor }))} />
      <EspelhoPontoTable dias={diasFiltrados} />
    </div>
  );
}

