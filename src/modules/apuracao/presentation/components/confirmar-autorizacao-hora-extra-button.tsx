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
  const processoSeiRef = useRef<HTMLInputElement | null>(null);
  const documentoSeiRef = useRef<HTMLInputElement | null>(null);
  const autoridadeRef = useRef<HTMLInputElement | null>(null);
  const justificativaRef = useRef<HTMLTextAreaElement | null>(null);

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

    if (
      !justificativaRef.current?.reportValidity() ||
      !processoSeiRef.current?.reportValidity() ||
      !documentoSeiRef.current?.reportValidity() ||
      !autoridadeRef.current?.reportValidity()
    ) {
      return;
    }

    const campos = {
      processoSei: processoSeiRef.current?.value ?? "",
      documentoSei: documentoSeiRef.current?.value ?? "",
      autoridade: autoridadeRef.current?.value ?? "",
      justificativaProcedimento: justificativaRef.current?.value ?? "",
    };

    for (const [nome, valor] of Object.entries(campos)) {
      let input = formRef.current.elements.namedItem(nome) as
        | HTMLInputElement
        | null;

      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = nome;
        formRef.current.appendChild(input);
      }

      input.value = valor;
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
        <div className="mt-4 grid gap-3">
          <label className="space-y-1.5 text-sm">
            <span className="font-semibold">Justificativa administrativa</span>
            <textarea
              ref={justificativaRef}
              required
              minLength={10}
              rows={3}
              className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              placeholder="Informe o fundamento da autorização."
            />
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1.5 text-sm">
              <span className="font-semibold">Processo SEI</span>
              <input
                ref={processoSeiRef}
                required
                className="h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                placeholder="Obrigatório"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-semibold">Documento/ato</span>
              <input
                ref={documentoSeiRef}
                required
                className="h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                placeholder="Obrigatório"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-semibold">Autoridade</span>
              <input
                ref={autoridadeRef}
                className="h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                placeholder="Opcional"
              />
            </label>
          </div>
        </div>
      </Modal>
    </>
  );
}
