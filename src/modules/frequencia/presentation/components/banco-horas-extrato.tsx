import { Card, Badge } from "@/components/ui";
import { extratoBancoHorasMock } from "../data/espelho-banco-horas.mock";

export function BancoHorasExtrato() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-5">
        <h2 className="text-lg font-semibold">Extrato de créditos e débitos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Movimentos mockados do banco de horas.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <caption className="sr-only">
            Extrato do banco de horas com data, tipo, horas, status,
            vencimento e descricao.
          </caption>
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Horas</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Vencimento</th>
              <th className="px-5 py-3">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {extratoBancoHorasMock.map((movimento) => (
              <tr key={movimento.id} className="border-t border-border">
                <td className="px-5 py-4">{movimento.data}</td>
                <td className="px-5 py-4 font-semibold">{movimento.tipo}</td>
                <td className="px-5 py-4 font-mono font-bold">{movimento.horas}</td>
                <td className="px-5 py-4"><Badge variant={movimento.status === "Pendente" ? "pendente" : "regular"}>{movimento.status}</Badge></td>
                <td className="px-5 py-4">{movimento.vencimento}</td>
                <td className="px-5 py-4 text-muted-foreground">{movimento.descricao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
