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
import { registrarDeliberacaoHorasExtrasAction } from "../../application/actions/registrar-deliberacao-horas-extras.action";
import type { RegistrarDeliberacaoHorasExtrasFormState } from "../../application/schemas/horas-extras-deliberacao.schema";

const estadoInicial: RegistrarDeliberacaoHorasExtrasFormState = {
  sucesso: false,
};

function erro(estado: RegistrarDeliberacaoHorasExtrasFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

function formatarMinutos(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${horas}h${String(resto).padStart(2, "0")}`;
}

export function HorasExtrasDeliberacaoForm({
  requestId,
  totalMinutos,
  limiteOrcamentarioMinutos,
}: {
  requestId: string;
  totalMinutos: number;
  limiteOrcamentarioMinutos: number;
}) {
  const [estado, formAction, pendente] = useActionState(
    registrarDeliberacaoHorasExtrasAction,
    estadoInicial,
  );
  const valorPadraoMinutos =
    estado.campos?.approvedMinutes ?? Math.min(totalMinutos, limiteOrcamentarioMinutos);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deliberação final</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />

          {estado.mensagem && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950">
              {estado.mensagem}
            </div>
          )}

          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p>
              <span className="font-semibold">Solicitado:</span>{" "}
              {formatarMinutos(totalMinutos)}
            </p>
            <p>
              <span className="font-semibold">Limite orçamentário:</span>{" "}
              {formatarMinutos(limiteOrcamentarioMinutos)}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="result">Resultado</Label>
              <Select
                id="result"
                name="result"
                defaultValue={estado.campos?.result ?? "APPROVED"}
              >
                <option value="APPROVED">Aprovar integralmente</option>
                <option value="PARTIALLY_APPROVED">Aprovar parcialmente</option>
                <option value="REJECTED">Rejeitar</option>
                <option value="RETURNED">Devolver à chefia</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approvedMinutes">Minutos aprovados</Label>
              <Input
                id="approvedMinutes"
                name="approvedMinutes"
                type="number"
                min={0}
                max={Math.min(totalMinutos, limiteOrcamentarioMinutos)}
                step={1}
                defaultValue={String(valorPadraoMinutos)}
              />
              {erro(estado, "approvedMinutes") && (
                <p className="text-xs text-red-700">
                  {erro(estado, "approvedMinutes")}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="estimatedAmount">Valor estimado deliberado</Label>
              <Input
                id="estimatedAmount"
                name="estimatedAmount"
                inputMode="decimal"
                defaultValue={estado.campos?.estimatedAmount ?? ""}
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
            <Label htmlFor="justification">Justificativa da decisão</Label>
            <Textarea
              id="justification"
              name="justification"
              rows={5}
              defaultValue={estado.campos?.justification ?? ""}
              aria-invalid={Boolean(erro(estado, "justification"))}
            />
            {erro(estado, "justification") && (
              <p className="text-xs text-red-700">{erro(estado, "justification")}</p>
            )}
          </div>

          <Button type="submit" loading={pendente}>
            Registrar deliberação
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
