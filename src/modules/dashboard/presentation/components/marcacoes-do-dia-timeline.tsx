import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Monitor,
  MoreVertical,
  Smartphone,
} from "lucide-react";

import { Badge, Card } from "@/components/ui";
import type { MarcacaoDia } from "../data/dashboard-servidor.config";

type MarcacoesDoDiaTimelineProps = {
  marcacoes: MarcacaoDia[];
};

export function MarcacoesDoDiaTimeline({
  marcacoes,
}: MarcacoesDoDiaTimelineProps) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-black text-blue-950">
          <CalendarDays className="size-4 text-blue-700" aria-hidden="true" />
          Marcações de hoje
        </h2>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
            {marcacoes.length} marcações
          </span>
          <Link
            href="/marcacoes"
            className="grid size-7 place-items-center rounded-md text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="Ver marcações"
          >
            <MoreVertical className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {marcacoes.length > 0 ? (
        <ol className="mt-3 space-y-2">
          {marcacoes.map((marcacao, index) => {
            const registrada = marcacao.status === "registrada";
            const SourceIcon =
              index === marcacoes.length - 1
                ? Smartphone
                : index === marcacoes.length - 2
                  ? FileText
                  : Monitor;
            const origem =
              index === marcacoes.length - 1
                ? "App Mobile"
                : index === marcacoes.length - 2
                  ? "Sistema"
                  : "Web";

            return (
              <li key={`${marcacao.rotulo}-${index}`} className="flex gap-2.5">
                <div className="flex flex-col items-center pt-5">
                  <span
                    className={
                      registrada
                        ? "flex size-3 rounded-full bg-emerald-500"
                        : "flex size-3 rounded-full bg-red-500"
                    }
                  />
                  {index < marcacoes.length - 1 ? (
                    <span className="h-12 border-l border-slate-200" />
                  ) : null}
                </div>
                <div className="grid min-h-14 flex-1 grid-cols-[2rem_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  <span
                    className={
                      registrada
                        ? "grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700"
                        : "grid size-8 place-items-center rounded-lg bg-red-50 text-red-700"
                    }
                  >
                    {registrada ? (
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                    ) : (
                      <Clock3 className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-blue-950">
                      {marcacao.rotulo}
                    </p>
                    <p className="font-mono text-xs font-semibold text-blue-900">
                      {marcacao.horario}
                    </p>
                  </div>
                  {registrada ? (
                    <Badge className="bg-emerald-50 text-emerald-700">
                      Registrada
                    </Badge>
                  ) : (
                    <Badge variant="pendente">Pendente</Badge>
                  )}
                  <span className="hidden items-center gap-1 text-[11px] font-medium text-slate-500 sm:inline-flex">
                    <SourceIcon className="size-3.5" aria-hidden="true" />
                    {origem}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="mt-3 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          Nenhuma jornada ativa encontrada para exibir as marcações de hoje.
        </div>
      )}

      <div className="mt-3 flex gap-2 rounded-md border border-dashed border-blue-100 bg-blue-50/40 p-2 text-xs leading-5 text-blue-900">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-100 text-base font-bold text-blue-700">
          +
        </span>
        <p>
          Qualquer quantidade de marcações pode ser registrada. O painel exibe
          todas as marcações do dia em ordem cronológica.
        </p>
      </div>
    </Card>
  );
}
