"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button, Modal } from "@/components/ui";

type ExcluirRascunhoHorasExtrasButtonProps = {
  action: () => Promise<void>;
  requestNumber: string;
};

export function ExcluirRascunhoHorasExtrasButton({
  action,
  requestNumber,
}: ExcluirRascunhoHorasExtrasButtonProps) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        Excluir
      </button>

      <Modal
        open={aberto}
        onOpenChange={setAberto}
        title="Excluir rascunho"
        description={`Confirme a exclus\u00e3o do rascunho ${requestNumber}. Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita.`}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
            <form action={action}>
              <Button type="submit" variant="danger">
                <Trash2 className="size-4" aria-hidden="true" />
                Excluir rascunho
              </Button>
            </form>
          </>
        }
      >
        <p className="text-sm leading-6 text-muted-foreground">
          Apenas rascunhos que ainda n&atilde;o foram enviados podem ser
          exclu&iacute;dos. A solicita&ccedil;&atilde;o ser&aacute; removida
          junto com os dias informados.
        </p>
      </Modal>
    </>
  );
}
