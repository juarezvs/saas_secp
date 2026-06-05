import { Card, Badge } from "@/components/ui";
import type { ConvocadoRecesso } from "../data/recesso-forense.mock";
import { EscolhaPecuniaOuFolgaBadge } from "./escolha-pecunia-ou-folga-badge";

type ConvocadosTableProps = {
  convocados: ConvocadoRecesso[];
};

export function ConvocadosTable({ convocados }: ConvocadosTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-5">
        <h2 className="text-lg font-semibold">Convocados no recesso</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tabela visual, separada do ponto ordinário.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <caption className="sr-only">
            Servidores convocados no recesso forense, dias convocados, chefia,
            escolha e status.
          </caption>
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Servidor</th>
              <th className="px-5 py-3">Dias convocados</th>
              <th className="px-5 py-3">Chefia do recesso</th>
              <th className="px-5 py-3">Escolha</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {convocados.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-5 py-4">
                  <p className="font-semibold">{item.nome}</p>
                  <p className="text-xs text-muted-foreground">{item.matricula}</p>
                </td>
                <td className="px-5 py-4">{item.diasConvocados.length ? item.diasConvocados.join(", ") : "Não convocado"}</td>
                <td className="px-5 py-4">{item.chefia}</td>
                <td className="px-5 py-4"><EscolhaPecuniaOuFolgaBadge escolha={item.escolha} /></td>
                <td className="px-5 py-4"><Badge variant={item.status === "homologado" ? "homologado" : "recesso"}>{item.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
