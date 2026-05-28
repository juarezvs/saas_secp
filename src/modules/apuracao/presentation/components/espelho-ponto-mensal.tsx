import { minutosParaTexto } from "../../application/services/calcular-tempo.service";

type ApuracaoMensalItem = {
  id: string;
  dataReferencia: Date | string;
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosCredito: number;
  minutosDebito: number;
  resultado: string;
  status: string;
};

type MarcacaoItem = {
  id: string;
  dataHora: Date | string;
  tipo: string;
  status: string;
};

export function EspelhoPontoMensal({
  apuracoes,
  marcacoes,
}: {
  apuracoes: ApuracaoMensalItem[];
  marcacoes: MarcacaoItem[];
}) {
  const marcacoesPorDia = agruparMarcacoesPorDiaManaus(marcacoes);

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
    },
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
        <Resumo
          label="Crédito"
          value={minutosParaTexto(totais.credito)}
          destaque="credito"
        />
        <Resumo
          label="Débito"
          value={minutosParaTexto(totais.debito)}
          destaque="debito"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Marcações</th>
              <th className="px-5 py-3">Previsto</th>
              <th className="px-5 py-3">Trabalhado</th>
              <th className="px-5 py-3">Crédito</th>
              <th className="px-5 py-3">Débito</th>
              <th className="px-5 py-3">Resultado</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {apuracoes.map((item) => {
              const chaveReferencia = chaveDataReferenciaUtc(
                item.dataReferencia,
              );
              const marcacoesDoDia = marcacoesPorDia.get(chaveReferencia) ?? [];

              return (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-medium">
                    {formatarDataReferenciaUtc(item.dataReferencia)}
                  </td>

                  <td className="px-5 py-4">
                    {marcacoesDoDia.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {marcacoesDoDia.map((marcacao) => (
                          <span
                            key={marcacao.id}
                            className="rounded-full border bg-[var(--muted)] px-2 py-1 font-mono text-xs"
                            title={`${marcacao.tipo} • ${marcacao.status}`}
                          >
                            {formatarHoraManaus(marcacao.dataHora)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">-</span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {minutosParaTexto(item.cargaPrevistaMinutos)}
                  </td>

                  <td className="px-5 py-4">
                    {minutosParaTexto(item.minutosTrabalhados)}
                  </td>

                  <td className="px-5 py-4">
                    <ValorTempo tipo="credito" minutos={item.minutosCredito} />
                  </td>

                  <td className="px-5 py-4">
                    <ValorTempo tipo="debito" minutos={item.minutosDebito} />
                  </td>

                  <td className="px-5 py-4">{item.resultado}</td>

                  <td className="px-5 py-4">
                    <span className="rounded-full border px-2 py-1 text-xs font-semibold">
                      {item.status}
                    </span>
                  </td>
                </tr>
              );
            })}

            {apuracoes.length === 0 && (
              <tr>
                <td
                  colSpan={8}
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

function Resumo({
  label,
  value,
  destaque,
}: {
  label: string;
  value: string;
  destaque?: "credito" | "debito";
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        destaque === "credito"
          ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
          : destaque === "debito"
            ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            : "bg-[var(--muted)]"
      }`}
    >
      <p className="text-xs font-semibold uppercase opacity-80">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}

function ValorTempo({
  minutos,
  tipo,
}: {
  minutos: number;
  tipo: "credito" | "debito";
}) {
  const temValor = minutos > 0;

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
        !temValor
          ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
          : tipo === "credito"
            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
            : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
      }`}
    >
      {minutosParaTexto(minutos)}
    </span>
  );
}

function agruparMarcacoesPorDiaManaus(marcacoes: MarcacaoItem[]) {
  const mapa = new Map<string, MarcacaoItem[]>();

  for (const marcacao of marcacoes) {
    const chave = chaveDataHoraManaus(marcacao.dataHora);
    const atual = mapa.get(chave) ?? [];
    atual.push(marcacao);
    mapa.set(chave, atual);
  }

  return mapa;
}

function chaveDataReferenciaUtc(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

function chaveDataHoraManaus(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

function formatarDataReferenciaUtc(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(data);
}

function formatarHoraManaus(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Manaus",
  }).format(data);
}
