import { Card, Badge } from "@/components/ui";
import type { DiaRecesso } from "../data/recesso-forense.mock";

type EspelhoRecessoServidorProps = {
  dias: DiaRecesso[];
};

export function EspelhoRecessoServidor({ dias }: EspelhoRecessoServidorProps) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-5">
        <h2 className="text-lg font-semibold">Espelho do recesso</h2>
        <p className="mt-1 text-sm text-muted-foreground">Dias não convocados aparecem como Recesso forense.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">
            Espelho do recesso forense com data, convocação, marcações e
            situacao.
          </caption>
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Convocação</th>
              <th className="px-5 py-3">Marcações</th>
              <th className="px-5 py-3">Situação</th>
            </tr>
          </thead>
          <tbody>
            {dias.map((dia) => (
              <tr key={dia.data} className="border-t border-border">
                <td className="px-5 py-4 font-semibold">{dia.data}</td>
                <td className="px-5 py-4">{dia.convocado ? "Convocado" : "Não convocado"}</td>
                <td className="px-5 py-4">
                  {dia.marcacoes.length ? dia.marcacoes.join(" • ") : "-"}
                </td>
                <td className="px-5 py-4">
                  <Badge variant={dia.situacao === "Recesso forense" ? "recesso" : "regular"}>{dia.situacao}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
