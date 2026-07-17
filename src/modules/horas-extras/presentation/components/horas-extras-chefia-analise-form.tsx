"use client";

import { useActionState } from "react";

import { Button, Card, CardContent, CardHeader, CardTitle, Label, Textarea } from "@/components/ui";
import { analisarHorasExtrasChefiaAction } from "../../application/actions/analisar-horas-extras-chefia.action";
import type { AnalisarHorasExtrasChefiaFormState } from "../../application/schemas/horas-extras-analise-chefia.schema";

const estadoInicial: AnalisarHorasExtrasChefiaFormState = {
  sucesso: false,
};

function erro(estado: AnalisarHorasExtrasChefiaFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

export function HorasExtrasChefiaAnaliseForm({
  requestId,
}: {
  requestId: string;
}) {
  const [estado, formAction, pendente] = useActionState(
    analisarHorasExtrasChefiaAction,
    estadoInicial,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise da chefia</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />

          {estado.mensagem && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950">
              {estado.mensagem}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Justificativa da análise</Label>
            <Textarea
              id="reason"
              name="reason"
              rows={4}
              defaultValue={estado.campos?.reason ?? ""}
              aria-invalid={Boolean(erro(estado, "reason"))}
            />
            {erro(estado, "reason") && (
              <p className="text-xs text-red-700">{erro(estado, "reason")}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              name="action"
              value="FORWARD_BUDGET"
              loading={pendente}
            >
              Encaminhar ao orçamento
            </Button>
            <Button
              type="submit"
              name="action"
              value="RETURN"
              variant="outline"
              loading={pendente}
            >
              Devolver
            </Button>
            <Button
              type="submit"
              name="action"
              value="REJECT"
              variant="danger"
              loading={pendente}
            >
              Rejeitar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

