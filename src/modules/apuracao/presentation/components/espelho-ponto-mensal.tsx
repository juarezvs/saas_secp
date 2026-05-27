import { minutosParaTexto } from "../../application/services/calcular-tempo.service";

type ApuracaoMensalItem = {
  id: string;
  dataReferencia: Date;
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosCredito: number;
  minutosDebito: number;
  resultado: string;
  status: string;
};

export function EspelhoPontoMensal({
  apuracoes,
}: {
  apuracoes: ApuracaoMensalItem[];
}) {
  const totais = apuracoes.reduce(
    (acc, item) => {
      acc.previsto += item.cargaPrevistaMinutos;
      acc.trabalhado += item.minutosTrabalhados;
      acc.credito += item.minutosCredito;
      acc.debito += item.minutosDebito;
      return acc;
    },
    {
      previsto: 0,
      trabalhado: 0,
      credito: 0,
      debito: 0,
    }
  );

  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Espelho mensal</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Consolidação preliminar das apurações diárias calculadas.
        </p>
      </div>

      <div className="grid gap-4 border-b p-5 md:grid-cols-4">
        <Resumo label="Previsto" value={minutosParaTexto(totais.previsto)} />
        <Resumo
          label="Trabalhado"
          value={minutosParaTexto(totais.trabalhado)}
        />
        <Resumo label="Crédito" value={minutosParaTexto(totais.credito)} />
        <Resumo label="Débito" value={minutosParaTexto(totais.debito)} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Previsto</th>
              <th className="px-5 py-3">Trabalhado</th>
              <th className="px-5 py-3">Crédito</th>
              <th className="px-5 py-3">Débito</th>
              <th className="px-5 py-3">Resultado</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {apuracoes.map((item) => (
              <tr key={item.id} className="border-b last:border-b-0">
                <td className="px-5 py-4">
                  {new Intl.DateTimeFormat("pt-BR").format(
                    item.dataReferencia
                  )}
                </td>
                <td className="px-5 py-4">
                  {minutosParaTexto(item.cargaPrevistaMinutos)}
                </td>
                <td className="px-5 py-4">
                  {minutosParaTexto(item.minutosTrabalhados)}
                </td>
                <td className="px-5 py-4">
                  {minutosParaTexto(item.minutosCredito)}
                </td>
                <td className="px-5 py-4">
                  {minutosParaTexto(item.minutosDebito)}
                </td>
                <td className="px-5 py-4">{item.resultado}</td>
                <td className="px-5 py-4">{item.status}</td>
              </tr>
            ))}

            {apuracoes.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhuma apuração calculada para o mês.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Resumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-[var(--muted)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}