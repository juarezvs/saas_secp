import Link from "next/link";
import { ArrowRight, Clock3, Info } from "lucide-react";

import { Badge, Card } from "@/components/ui";
import type {
  MarcacaoDia,
  PrevisaoJornadaDia,
} from "../data/dashboard-servidor.config";

type MarcacoesDoDiaTimelineProps = {
  marcacoes: MarcacaoDia[];
  previsao?: PrevisaoJornadaDia | null;
};

export function MarcacoesDoDiaTimeline({
  marcacoes,
  previsao,
}: MarcacoesDoDiaTimelineProps) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Marcações de hoje</h2>
        <Link
          href="/marcacoes"
          className="rounded-sm text-xs font-semibold text-secp-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Ver todas
        </Link>
      </div>

      {marcacoes.length > 0 ? (
        <ol className="mt-3 space-y-2">
          {marcacoes.map((marcacao, index) => (
            <li key={marcacao.rotulo} className="flex gap-2.5">
              <div className="flex flex-col items-center">
                <span
                  className={
                    marcacao.status === "registrada"
                      ? "flex size-6 items-center justify-center rounded-full bg-secp-green-700 text-white"
                      : "flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground"
                  }
                >
                  <ArrowRight className="size-3" aria-hidden="true" />
                </span>
                {index < marcacoes.length - 1 && (
                  <span className="h-4 border-l border-dashed border-border" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{marcacao.rotulo}</p>
                  {marcacao.status === "pendente" && (
                    <Badge variant="pendente">Pendente</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {marcacao.horario}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-3 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          Nenhuma jornada ativa encontrada para exibir as marcações de hoje.
        </div>
      )}

      <div className="mt-3 flex gap-2 rounded-md bg-muted p-2 text-xs leading-5 text-muted-foreground">
        <Info
          className="mt-0.5 size-4 shrink-0 text-secp-blue-700"
          aria-hidden="true"
        />
        <p>
          Registre seus horários ao iniciar, sair e retornar do intervalo ou
          finalizar sua jornada.
        </p>
      </div>

      {previsao && (
        <footer className="mt-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">
                Previsão da jornada hoje
              </p>
              <p className="mt-0.5 text-xs font-semibold text-foreground">
                {previsao.titulo}
              </p>
            </div>
            <Badge variant="regular">Carga {previsao.carga}</Badge>
          </div>

          {previsao.saidaEstimada && (
            <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              <div className="flex items-start gap-3">
                <span className="rounded-md bg-amber-200 p-2 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                  <Clock3 className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide">
                    Saída estimada
                  </p>
                  <p className="mt-1 text-xl font-black leading-none">
                    {previsao.saidaEstimada}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-5">
                    Entrada registrada às {previsao.entradaReferencia}. Ajuste sua
                    saída para cumprir a carga de {previsao.carga}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {previsao.horarios.length > 0 && (
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {previsao.horarios.map((item) => (
                <div
                  key={`${item.rotulo}-${item.horario}`}
                  className="rounded-md bg-muted px-2.5 py-2"
                >
                  <dt className="text-[11px] font-semibold uppercase text-muted-foreground">
                    {item.rotulo}
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm font-bold text-foreground">
                    {item.horario}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {previsao.indicativo && !previsao.saidaEstimada && (
            <p className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
              {previsao.indicativo}
            </p>
          )}
        </footer>
      )}
    </Card>
  );
}
