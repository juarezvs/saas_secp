import { FileText } from "lucide-react";

import { Button, Card } from "@/components/ui";
import type { EspelhoDia } from "../data/espelho-banco-horas.mock";
import { StatusFrequenciaBadge } from "./status-frequencia-badge";

type EspelhoPontoTableProps = {
  dias: EspelhoDia[];
};

export function EspelhoPontoTable({ dias }: EspelhoPontoTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col justify-between gap-3 border-b border-border p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold">Espelho de ponto mensal</h2>
          <p className="mt-1 text-sm text-muted-foreground">Consulta visual com dados mockados.</p>
        </div>
        <Button
          leftIcon={<FileText className="size-4" aria-hidden="true" />}
          aria-label="Exportar espelho de ponto em PDF"
        >
          Exportar PDF
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <caption className="sr-only">
            Espelho de ponto mensal com data, jornada prevista, marcacoes,
            resultado, creditos, debitos, situacao e acoes.
          </caption>
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Jornada prevista</th>
              <th className="px-5 py-3">Marcações</th>
              <th className="px-5 py-3">Resultado</th>
              <th className="px-5 py-3">Crédito</th>
              <th className="px-5 py-3">Débito</th>
              <th className="px-5 py-3">Situação</th>
              <th className="px-5 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {dias.map((dia) => (
              <tr key={dia.id} className="border-t border-border">
                <td className="px-5 py-4 font-semibold">{dia.data}</td>
                <td className="px-5 py-4">{dia.jornadaPrevista}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {dia.marcacoes.length ? dia.marcacoes.map((hora) => (
                      <span key={hora} className="rounded-sm bg-muted px-2 py-1 font-mono text-xs">{hora}</span>
                    )) : <span className="text-muted-foreground">Sem marcação</span>}
                  </div>
                </td>
                <td className="px-5 py-4">{dia.resultado}</td>
                <td className="px-5 py-4 font-mono text-secp-green-700">{dia.credito}</td>
                <td className="px-5 py-4 font-mono text-secp-danger">{dia.debito}</td>
                <td className="px-5 py-4"><StatusFrequenciaBadge status={dia.situacao} /></td>
                <td className="px-5 py-4">
                  <Button variant="outline" size="sm">Detalhar</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
