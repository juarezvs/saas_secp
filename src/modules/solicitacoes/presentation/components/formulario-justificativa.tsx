import { MessageSquareText } from "lucide-react";

import { Card, HelpText, Label, Textarea } from "@/components/ui";

type FormularioJustificativaProps = {
  value: string;
  erro?: string;
  onChange: (value: string) => void;
};

export function FormularioJustificativa({ value, erro, onChange }: FormularioJustificativaProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <MessageSquareText className="size-5 text-secp-blue-700" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Justificativa</h2>
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="justificativa">Explique a ocorrência</Label>
        <Textarea
          id="justificativa"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ex.: esqueci de registrar a saída para intervalo no horário correto."
          rows={6}
        />
        {erro && <p className="text-sm text-secp-danger">{erro}</p>}
        <HelpText>Use uma justificativa objetiva. A chefia analisará o pedido antes da homologação.</HelpText>
      </div>
    </Card>
  );
}

