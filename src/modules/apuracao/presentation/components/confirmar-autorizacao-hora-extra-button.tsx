"use client";

import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button, Modal } from "@/components/ui";

export function ConfirmarAutorizacaoHoraExtraButton() {
  const [open, setOpen] = useState(false);
  const [tempo, setTempo] = useState("00:00");
  const [submetendo, setSubmetendo] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  function abrirConfirmacao(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;

    if (!form?.reportValidity()) {
      return;
    }

    const dados = new FormData(form);
    formRef.current = form;
    setTempo(String(dados.get("tempoAutorizado") ?? "00:00"));
    setOpen(true);
  }

  function confirmarAutorizacao() {
    if (!formRef.current) {
      setOpen(false);
      return;
    }

    setSubmetendo(true);
    formRef.current.requestSubmit();
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 px-3 text-xs"
        onClick={abrirConfirmacao}
      >
        Autorizar
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Confirmar autorização"
        description="Confirme a conversão da hora extra não autorizada em crédito de banco de horas."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              loading={submetendo}
              leftIcon={<CheckCircle2 className="size-4" aria-hidden="true" />}
              onClick={confirmarAutorizacao}
            >
              Confirmar autorização
            </Button>
          </>
        }
      >
        <div className="rounded-md border bg-[var(--muted)] p-4 text-sm leading-6">
          <p>
            Será autorizada <strong>{tempo}</strong> de hora extra para este dia.
          </p>
          <p className="mt-2 text-[var(--muted-foreground)]">
            Após confirmar, o SECP registrará a autorização e recalculará a
            competência do servidor.
          </p>
        </div>
      </Modal>
    </>
  );
}
