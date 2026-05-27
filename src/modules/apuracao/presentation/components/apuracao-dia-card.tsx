import { Calculator } from "lucide-react";
import { minutosParaTexto } from "../../application/services/calcular-tempo.service";

type ApuracaoDiaCardProps = {
  apuracao: {
    dataReferencia: Date;
    cargaPrevistaMinutos: number;
    minutosTrabalhados: number;
    minutosIntervalo: number;
    minutosCredito: number;
    minutosDebito: number;
    resultado: string;
    status: string;
    ocorrencias: {
      id: string;
      tipo: string;
      descricao: string;
      minutos: number;
    }[];
  } | null;
};

export function ApuracaoDiaCard({ apuracao }: ApuracaoDiaCardProps) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-center gap-2 border-b p-5">
        <Calculator className="size-5 text-blue-900 dark:text-blue-300" />
        <h2 className="text-lg font-bold">Apuração do dia</h2>
      </div>

      {!apuracao ? (
        <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
          Nenhuma apuração calculada para esta data.
        </div>
      ) : (
        <div className="space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-5">
            <Info
              label="Previsto"
              value={minutosParaTexto(apuracao.cargaPrevistaMinutos)}
            />
            <Info
              label="Trabalhado"
              value={minutosParaTexto(apuracao.minutosTrabalhados)}
            />
            <Info
              label="Intervalo"
              value={minutosParaTexto(apuracao.minutosIntervalo)}
            />
            <Info
              label="Crédito"
              value={minutosParaTexto(apuracao.minutosCredito)}
            />
            <Info
              label="Débito"
              value={minutosParaTexto(apuracao.minutosDebito)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
              {apuracao.resultado}
            </span>

            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                apuracao.status === "CALCULADA"
                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
              }`}
            >
              {apuracao.status}
            </span>
          </div>

          {apuracao.ocorrencias.length > 0 && (
            <div className="rounded-lg border bg-[var(--muted)] p-4">
              <h3 className="font-semibold">Ocorrências</h3>

              <div className="mt-3 space-y-3">
                {apuracao.ocorrencias.map((ocorrencia) => (
                  <div key={ocorrencia.id} className="text-sm">
                    <p className="font-semibold">{ocorrencia.tipo}</p>
                    <p className="mt-1 text-[var(--muted-foreground)]">
                      {ocorrencia.descricao}
                    </p>
                    {ocorrencia.minutos > 0 && (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        Minutos: {ocorrencia.minutos}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-[var(--muted)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}