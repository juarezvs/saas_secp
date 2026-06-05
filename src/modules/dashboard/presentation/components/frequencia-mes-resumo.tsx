import { FileCheck2 } from "lucide-react";

import { Card } from "@/components/ui";

type FrequenciaMesResumoProps = {
  resumo: {
    mes: string;
    diasUteis: number;
    regular: number;
    pendente: number;
    falta: number;
    recesso: number;
    aguardando: number;
  };
};

export function FrequenciaMesResumo({ resumo }: FrequenciaMesResumoProps) {
  const total = resumo.regular + resumo.pendente + resumo.falta + resumo.recesso + resumo.aguardando;
  const regularPercent = Math.round((resumo.regular / total) * 100);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Frequência do mês</h2>
        <a href="/espelho-ponto" className="text-sm font-semibold text-secp-blue-700 hover:underline">Ver espelho</a>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-[10rem_1fr] sm:items-center">
        <div className="grid aspect-square place-items-center rounded-full bg-[conic-gradient(var(--secp-green-700)_0_67%,var(--secp-warning)_67%_81%,var(--secp-danger)_81%_86%,#d1d5db_86%_95%,var(--secp-info)_95%_100%)] p-5">
          <div className="grid size-full place-items-center rounded-full bg-card text-center">
            <div>
              <p className="text-xs text-muted-foreground">{resumo.mes}</p>
              <p className="text-3xl font-bold">{resumo.diasUteis}</p>
              <p className="text-xs text-muted-foreground">dias úteis</p>
            </div>
          </div>
        </div>
        <dl className="space-y-2 text-sm">
          <Linha label="Regulares" valor={resumo.regular} cor="bg-secp-green-700" />
          <Linha label="Pendentes" valor={resumo.pendente} cor="bg-secp-warning" />
          <Linha label="Faltas" valor={resumo.falta} cor="bg-secp-danger" />
          <Linha label="Recesso/feriado" valor={resumo.recesso} cor="bg-slate-300" />
          <Linha label="Aguard. homologação" valor={resumo.aguardando} cor="bg-secp-info" />
        </dl>
      </div>

      <div className="mt-5 flex gap-3 rounded-md bg-muted p-3 text-sm">
        <FileCheck2 className="mt-0.5 size-5 shrink-0 text-secp-blue-700" aria-hidden="true" />
        <p><strong>Status da frequência:</strong> {regularPercent}% dos registros do mês estão regulares.</p>
      </div>
    </Card>
  );
}

function Linha({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-muted-foreground">
        <span className={`size-2.5 rounded-full ${cor}`} aria-hidden="true" />
        {label}
      </dt>
      <dd className="font-bold">{valor}</dd>
    </div>
  );
}

