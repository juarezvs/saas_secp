import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";

import { Badge, Card } from "@/components/ui";
import type { MarcacaoDia } from "../data/dashboard-servidor.mock";

type MarcacoesDoDiaTimelineProps = {
  marcacoes: MarcacaoDia[];
};

export function MarcacoesDoDiaTimeline({
  marcacoes,
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

      <ol className="mt-3 space-y-2">
        {marcacoes.map((marcacao, index) => (
          <li key={marcacao.rotulo} className="flex gap-2.5">
            <div className="flex flex-col items-center">
              <span
                className={
                  index === 0
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
    </Card>
  );
}
