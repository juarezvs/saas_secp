import { FileUp } from "lucide-react";

import { Card, HelpText, Input, Label } from "@/components/ui";

type AnexoComprovanteMockProps = {
  value: string;
  onChange: (value: string) => void;
};

export function AnexoComprovanteMock({ value, onChange }: AnexoComprovanteMockProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <FileUp className="size-5 text-secp-blue-700" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Comprovante opcional</h2>
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="anexoNome">Nome do arquivo</Label>
        <Input
          id="anexoNome"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ex.: declaracao-atendimento.pdf"
        />
        <HelpText>Mock visual. Nenhum arquivo será enviado nesta etapa.</HelpText>
      </div>
    </Card>
  );
}

