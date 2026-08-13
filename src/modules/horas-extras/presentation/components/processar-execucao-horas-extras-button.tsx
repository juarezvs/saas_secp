"use client";

import { useActionState } from "react";
import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  processarExecucaoHorasExtrasSecapAction,
  type ProcessarExecucaoHorasExtrasSecapFormState,
} from "../../application/actions/processar-execucao-horas-extras-secap.action";

const estadoInicial: ProcessarExecucaoHorasExtrasSecapFormState = {
  sucesso: false,
  mensagem: "",
};

export function ProcessarExecucaoHorasExtrasButton({
  autorizacaoId,
}: {
  autorizacaoId: string;
}) {
  const [state, formAction, pending] = useActionState(
    processarExecucaoHorasExtrasSecapAction,
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
        leftIcon={<Calculator className="size-4" />}
      >
        Processar
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
