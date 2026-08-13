"use client";

import { useActionState } from "react";
import { CircleDollarSign } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  calcularAutorizacaoHorasExtrasSecapAction,
  type CalcularAutorizacaoHorasExtrasSecapFormState,
} from "../../application/actions/calcular-autorizacao-horas-extras-secap.action";

const estadoInicial: CalcularAutorizacaoHorasExtrasSecapFormState = {
  sucesso: false,
  mensagem: "",
};

export function CalcularAutorizacaoHorasExtrasButton({
  autorizacaoId,
}: {
  autorizacaoId: string;
}) {
  const [state, formAction, pending] = useActionState(
    calcularAutorizacaoHorasExtrasSecapAction,
    estadoInicial,
  );

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="autorizacaoId" value={autorizacaoId} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        loading={pending}
        leftIcon={<CircleDollarSign className="size-4" />}
      >
        Calcular
      </Button>
      {state.mensagem && (
        <p
          className={
            state.sucesso
              ? "max-w-48 text-xs text-green-700"
              : "max-w-48 text-xs text-amber-700"
          }
        >
          {state.mensagem}
        </p>
      )}
    </form>
  );
}
