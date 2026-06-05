import { CalendarDays, Clock } from "lucide-react";

import { Card, HelpText, Input, Label, Select } from "@/components/ui";
import { tiposMarcacaoMock, type SolicitacaoAjustePonto } from "../data/solicitacao-ajuste-ponto.mock";

type SeletorDataMarcacaoProps = {
  value: SolicitacaoAjustePonto;
  onChange: (value: Partial<SolicitacaoAjustePonto>) => void;
  erros: Partial<Record<keyof SolicitacaoAjustePonto, string>>;
};

export function SeletorDataMarcacao({ value, onChange, erros }: SeletorDataMarcacaoProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-5 text-secp-blue-700" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Data e marcação</h2>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="dataMarcacao">Data da ocorrência</Label>
          <Input id="dataMarcacao" type="date" value={value.dataMarcacao} onChange={(event) => onChange({ dataMarcacao: event.target.value })} />
          {erros.dataMarcacao && <p className="text-sm text-secp-danger">{erros.dataMarcacao}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipoMarcacao">Marcação</Label>
          <Select id="tipoMarcacao" value={value.tipoMarcacao} onChange={(event) => onChange({ tipoMarcacao: event.target.value })}>
            <option value="">Selecione</option>
            {tiposMarcacaoMock.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
          </Select>
          {erros.tipoMarcacao && <p className="text-sm text-secp-danger">{erros.tipoMarcacao}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="horarioSolicitado">Horário solicitado</Label>
          <Input id="horarioSolicitado" type="time" value={value.horarioSolicitado} onChange={(event) => onChange({ horarioSolicitado: event.target.value })} />
          {erros.horarioSolicitado && <p className="text-sm text-secp-danger">{erros.horarioSolicitado}</p>}
        </div>
      </div>

      <HelpText>
        <Clock className="sr-only" aria-hidden="true" />
        Informe apenas a marcação que faltou ou ficou incorreta.
      </HelpText>
    </Card>
  );
}

