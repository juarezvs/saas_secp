"use client";

import { useActionState } from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Textarea,
} from "@/components/ui";
import { analisarHorasExtrasChefiaAction } from "../../application/actions/analisar-horas-extras-chefia.action";
import {
  acoesAnaliseChefiaHorasExtras,
  type AnalisarHorasExtrasChefiaFormState,
  type AnalisarHorasExtrasChefiaInput,
} from "../../application/schemas/horas-extras-analise-chefia.schema";

const estadoInicial: AnalisarHorasExtrasChefiaFormState = {
  sucesso: false,
};

type AcaoAnaliseChefia = AnalisarHorasExtrasChefiaInput["action"];

type AcaoDisponivel = {
  actionCode: AcaoAnaliseChefia;
  toStepCode: string | null;
};

const acoesChefia = new Set<string>(acoesAnaliseChefiaHorasExtras);

const rotulosAcao: Record<AcaoAnaliseChefia, string> = {
  APPROVE: "Deferir",
  REJECT: "Indeferir",
};

const variantesAcao: Record<
  AcaoAnaliseChefia,
  "primary" | "outline" | "danger"
> = {
  APPROVE: "primary",
  REJECT: "danger",
};

function erro(estado: AnalisarHorasExtrasChefiaFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

export function HorasExtrasChefiaAnaliseForm({
  requestId,
  acoesDisponiveis,
}: {
  requestId: string;
  acoesDisponiveis: AcaoDisponivel[];
}) {
  const [estado, formAction, pendente] = useActionState(
    analisarHorasExtrasChefiaAction,
    estadoInicial,
  );
  const acoesRenderizadas = acoesDisponiveis.filter((acao) =>
    acoesChefia.has(acao.actionCode),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analise da chefia</CardTitle>
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
            <Label htmlFor="reason">Justificativa da analise</Label>
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
            {acoesRenderizadas.length > 0 ? (
              acoesRenderizadas.map((acao) => (
                <Button
                  key={`${acao.actionCode}-${acao.toStepCode ?? "terminal"}`}
                  type="submit"
                  name="action"
                  value={acao.actionCode}
                  variant={variantesAcao[acao.actionCode]}
                  loading={pendente}
                >
                  {rotulosAcao[acao.actionCode]}
                </Button>
              ))
            ) : (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950">
                A solicitacao nao esta pendente de analise da chefia.
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
