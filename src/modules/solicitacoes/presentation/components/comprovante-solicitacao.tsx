import { CheckCircle2 } from "lucide-react";

import { Card } from "@/components/ui";
import { comprovanteSolicitacaoMock } from "../data/solicitacao-ajuste-ponto.mock";

export function ComprovanteSolicitacao() {
  return (
    <Card className="border-green-200 bg-green-50 p-5 text-green-950 dark:border-green-900 dark:bg-green-950 dark:text-green-50">
      <div className="flex gap-3">
        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-secp-green-700" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-bold">Solicitação enviada</h2>
          <p className="mt-1 text-sm leading-6">Comprovante visual gerado. A solicitação seguirá para análise da chefia.</p>

          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <Item label="Protocolo" value={comprovanteSolicitacaoMock.protocolo} />
            <Item label="Data/hora" value={comprovanteSolicitacaoMock.dataEnvio} />
            <Item label="Próximo responsável" value={comprovanteSolicitacaoMock.responsavel} />
            <Item label="Status" value={comprovanteSolicitacaoMock.status} />
          </dl>
        </div>
      </div>
    </Card>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

