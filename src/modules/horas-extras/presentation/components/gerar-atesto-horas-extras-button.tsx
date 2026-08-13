"use client";

import { useActionState } from "react";
import { FileCheck2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  gerarAtestoHorasExtrasAction,
  type GerarAtestoHorasExtrasFormState,
} from "../../application/actions/gerar-atesto-horas-extras.action";

const estadoInicial: GerarAtestoHorasExtrasFormState = {
  sucesso: false,
  mensagem: "",
};

export function GerarAtestoHorasExtrasButton({
  autorizacaoId,
}: {
  autorizacaoId: string;
}) {
  const [state, formAction, pending] = useActionState(
    gerarAtestoHorasExtrasAction,
    estadoInicial,
  );

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="autorizacaoId" value={autorizacaoId} />
      <Button
        type="submit"
        size="sm"
        variant="success"
        loading={pending}
        leftIcon={<FileCheck2 className="size-4" />}
      >
        Atestar
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
