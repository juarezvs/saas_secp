"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Send } from "lucide-react";

import { Button, Modal } from "@/components/ui";
import { enviarEspelhoHomologacaoAction } from "../../application/actions/enviar-espelho-homologacao.action";

type EnviarEspelhoHomologacaoModalProps = {
  anoReferencia: number;
  mesReferencia: number;
};

function BotaoConfirmarEnvio() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="danger"
      loading={pending}
      leftIcon={<Send className="size-4" aria-hidden="true" />}
    >
      Confirmar envio irreversível
    </Button>
  );
}

export function EnviarEspelhoHomologacaoModal({
  anoReferencia,
  mesReferencia,
}: EnviarEspelhoHomologacaoModalProps) {
  const [open, setOpen] = useState(false);
  const competencia = `${String(mesReferencia).padStart(2, "0")}/${anoReferencia}`;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        leftIcon={<Send className="size-4" aria-hidden="true" />}
      >
        Enviar para homologação
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Confirmar envio para homologação"
        description={`Você está prestes a enviar o espelho de ponto da competência ${competencia} para a chefia.`}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <form action={enviarEspelhoHomologacaoAction}>
              <input type="hidden" name="anoReferencia" value={anoReferencia} />
              <input type="hidden" name="mesReferencia" value={mesReferencia} />
              <BotaoConfirmarEnvio />
            </form>
          </>
        }
      >
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">Esta ação é irreversível.</p>
              <p className="mt-1">
                Depois do envio, você não poderá criar solicitações de ajuste,
                justificativa, compensação ou qualquer outro pedido que possa
                alterar este espelho de ponto. A competência ficará aguardando a
                análise e homologação da chefia.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
