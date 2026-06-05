import { ArrowRight, Info } from "lucide-react";

import { Card, Badge } from "@/components/ui";
import type { MarcacaoDia } from "../data/dashboard-servidor.mock";

type MarcacoesDoDiaTimelineProps = {
  marcacoes: MarcacaoDia[];
};

export function MarcacoesDoDiaTimeline({ marcacoes }: MarcacoesDoDiaTimelineProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Marcações de hoje</h2>
        <a href="/marcacoes" className="text-sm font-semibold text-secp-blue-700 hover:underline">Ver todas</a>
      </div>

      <ol className="mt-5 space-y-4">
        {marcacoes.map((marcacao, index) => (
          <li key={marcacao.rotulo} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={index === 0 ? "flex size-8 items-center justify-center rounded-full bg-secp-green-700 text-white" : "flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground"}>
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
              {index < marcacoes.length - 1 && <span className="h-7 border-l border-dashed border-border" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{marcacao.rotulo}</p>
                {marcacao.status === "pendente" && <Badge variant="pendente">Pendente</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{marcacao.horario}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex gap-3 rounded-md bg-muted p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-secp-blue-700" aria-hidden="true" />
        <p>Registre seus horários ao iniciar, sair e retornar do intervalo ou finalizar sua jornada.</p>
      </div>
    </Card>
  );
}

