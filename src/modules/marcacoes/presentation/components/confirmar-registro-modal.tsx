"use client";

import { Clock } from "lucide-react";

import { Button, Modal } from "@/components/ui";

type ConfirmarRegistroModalProps = {
  open: boolean;
  proximaMarcacao: string;
  exigeBiometria: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmar: () => void;
};

export function ConfirmarRegistroModal({
  open,
  proximaMarcacao,
  exigeBiometria,
  onOpenChange,
  onConfirmar,
}: ConfirmarRegistroModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Confirmar registro"
      description={`Confirme a marcação: ${proximaMarcacao}.`}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirmar} leftIcon={<Clock className="size-4" aria-hidden="true" />}>
            Confirmar registro
          </Button>
        </>
      }
    >
      <div className="rounded-md bg-muted p-4 text-sm leading-6 text-muted-foreground">
        {exigeBiometria
          ? "O reconhecimento facial visual foi validado no mock. Nenhum dado biométrico real será capturado nesta etapa."
          : "O horário será simulado localmente e exibido em um comprovante visual."}
      </div>
    </Modal>
  );
}

