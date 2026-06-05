"use client";

import { RotateCcw, Send, ThumbsUp } from "lucide-react";

import { Button, Card } from "@/components/ui";
import type { ServidorHomologacaoMock } from "../data/homologacao-chefia.mock";
import { PendenciasServidorPanel } from "./pendencias-servidor-panel";

type AnaliseFrequenciaServidorProps = {
  servidor: ServidorHomologacaoMock;
};

export function AnaliseFrequenciaServidor({ servidor }: AnaliseFrequenciaServidorProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-xl font-bold">{servidor.nome}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{servidor.matricula} • competência Junho/2026</p>
        </div>
        <span className="rounded-md bg-muted px-3 py-2 text-sm font-semibold">Análise mensal</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <Resumo label="Comparecimentos" value={String(servidor.resumo.comparecimentos)} />
        <Resumo label="Ausências" value={String(servidor.resumo.ausencias)} />
        <Resumo label="Crédito" value={servidor.resumo.credito} />
        <Resumo label="Débito" value={servidor.resumo.debito} />
        <Resumo label="Solicitações" value={String(servidor.resumo.solicitacoes)} />
      </div>

      <div className="mt-5">
        <PendenciasServidorPanel pendencias={servidor.pendencias} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Button variant="outline" leftIcon={<Send className="size-4" aria-hidden="true" />}>Devolver para ajuste</Button>
        <Button variant="danger" leftIcon={<RotateCcw className="size-4" aria-hidden="true" />}>Bloquear por pendência</Button>
        <Button variant="success" leftIcon={<ThumbsUp className="size-4" aria-hidden="true" />}>Homologar frequência</Button>
      </div>
    </Card>
  );
}

function Resumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

