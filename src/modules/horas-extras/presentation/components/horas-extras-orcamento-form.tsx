"use client";

import { useActionState } from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { registrarParecerOrcamentarioHorasExtrasAction } from "../../application/actions/registrar-parecer-orcamentario-horas-extras.action";
import type { RegistrarParecerOrcamentarioHorasExtrasFormState } from "../../application/schemas/horas-extras-orcamento.schema";

const estadoInicial: RegistrarParecerOrcamentarioHorasExtrasFormState = {
  sucesso: false,
};

function erro(
  estado: RegistrarParecerOrcamentarioHorasExtrasFormState,
  campo: string,
) {
  return estado.erros?.[campo]?.[0];
}

export function HorasExtrasOrcamentoForm({
  requestId,
  totalMinutos,
}: {
  requestId: string;
  totalMinutos: number;
}) {
  const [estado, formAction, pendente] = useActionState(
    registrarParecerOrcamentarioHorasExtrasAction,
    estadoInicial,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parecer orçamentário</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />

          {estado.mensagem && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950">
              {estado.mensagem}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="result">Resultado</Label>
              <Select
                id="result"
                name="result"
                defaultValue={estado.campos?.result ?? "AVAILABLE"}
              >
                <option value="AVAILABLE">Disponibilidade integral</option>
                <option value="PARTIALLY_AVAILABLE">Disponibilidade parcial</option>
                <option value="UNAVAILABLE">Indisponibilidade</option>
                <option value="NEEDS_INFORMATION">Necessita complementação</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approvedMinutes">Minutos cobertos</Label>
              <Input
                id="approvedMinutes"
                name="approvedMinutes"
                type="number"
                min={0}
                step={1}
                defaultValue={String(estado.campos?.approvedMinutes ?? totalMinutos)}
              />
              {erro(estado, "approvedMinutes") && (
                <p className="text-xs text-red-700">{erro(estado, "approvedMinutes")}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="estimatedAmount">Valor estimado</Label>
              <Input
                id="estimatedAmount"
                name="estimatedAmount"
                inputMode="decimal"
                defaultValue={estado.campos?.estimatedAmount ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="availableAmount">Valor disponível</Label>
              <Input
                id="availableAmount"
                name="availableAmount"
                inputMode="decimal"
                defaultValue={estado.campos?.availableAmount ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reservedAmount">Valor reservado</Label>
              <Input
                id="reservedAmount"
                name="reservedAmount"
                inputMode="decimal"
                defaultValue={estado.campos?.reservedAmount ?? ""}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budgetActionCode">Ação orçamentária</Label>
              <Input
                id="budgetActionCode"
                name="budgetActionCode"
                defaultValue={estado.campos?.budgetActionCode ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgetPlanCode">Plano orçamentário</Label>
              <Input
                id="budgetPlanCode"
                name="budgetPlanCode"
                defaultValue={estado.campos?.budgetPlanCode ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commitmentReference">Referência de empenho</Label>
              <Input
                id="commitmentReference"
                name="commitmentReference"
                defaultValue={estado.campos?.commitmentReference ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seiProcessReference">Processo SEI</Label>
              <Input
                id="seiProcessReference"
                name="seiProcessReference"
                defaultValue={estado.campos?.seiProcessReference ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={estado.campos?.notes ?? ""}
              aria-invalid={Boolean(erro(estado, "notes"))}
            />
            {erro(estado, "notes") && (
              <p className="text-xs text-red-700">{erro(estado, "notes")}</p>
            )}
          </div>

          <Button type="submit" loading={pendente}>
            Registrar parecer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

