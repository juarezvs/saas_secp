import { ClipboardCheck } from "lucide-react";

import { Card } from "@/components/ui";
import type { SolicitacaoAjustePonto } from "../data/solicitacao-ajuste-ponto.mock";

type RevisaoSolicitacaoProps = {
  dados: SolicitacaoAjustePonto;
};

export function RevisaoSolicitacao({ dados }: RevisaoSolicitacaoProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="size-5 text-secp-blue-700" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Revise antes de enviar</h2>
      </div>

      <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
        <Item label="Tipo" value="Ajuste de ponto" />
        <Item label="Data" value={dados.dataMarcacao || "Não informado"} />
        <Item label="Marcação" value={dados.tipoMarcacao || "Não informado"} />
        <Item label="Horário" value={dados.horarioSolicitado || "Não informado"} />
        <Item label="Anexo" value={dados.anexoNome || "Sem anexo"} />
        <Item label="Quem analisará" value="Chefia imediata da unidade" />
      </dl>

      <div className="mt-4 rounded-md bg-muted p-4 text-sm leading-6 text-muted-foreground">
        <strong>Justificativa:</strong> {dados.justificativa || "Não informada"}
      </div>
    </Card>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{value}</dd>
    </div>
  );
}

