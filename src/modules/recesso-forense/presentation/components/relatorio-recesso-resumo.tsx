import { FileText } from "lucide-react";

import { Button, Card } from "@/components/ui";

export function RelatorioRecessoResumo() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-secp-blue-700" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Resumo do recesso</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Relatório visual para acompanhar convocações, pecúnia e folgas sem gerar cálculo real.
          </p>
        </div>
        <Button variant="outline">Exportar relatório mock</Button>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <Resumo label="Convocados" value="10" />
        <Resumo label="Pecúnia" value="4 servidores" />
        <Resumo label="Folgas" value="6 servidores" />
      </div>
    </Card>
  );
}

function Resumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

