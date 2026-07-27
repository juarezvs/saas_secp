"use client";

import { useActionState, useState } from "react";
import { Clock3, PenLine } from "lucide-react";

import { Button, Modal } from "@/components/ui";
import { registrarMarcacaoWebAutorizadaAction } from "@/modules/marcacoes-brutas/application/actions/registrar-marcacao-web.action";

export function RegistrarPontoCard() {
  const [aberto, setAberto] = useState(false);
  const [estado, formAction, pendente] = useActionState(
    registrarMarcacaoWebAutorizadaAction,
    { erro: null, sucesso: null },
  );

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-start gap-3">
        <div className="secp-theme-icon rounded-lg p-3">
          <Clock3 className="size-5" aria-hidden="true" />
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-bold">Registro web autorizado</h2>

          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Use esta opção apenas quando houver permissão específica para
            registro de ponto pelo sistema web. A marcação será gravada como
            dado bruto e processada pelo SECP.
          </p>

          <Button
            type="button"
            className="mt-4"
            onClick={() => setAberto(true)}
            leftIcon={<Clock3 className="size-4" aria-hidden="true" />}
          >
            Registrar marcação via web
          </Button>
        </div>
      </div>

      <Modal
        open={aberto}
        onOpenChange={setAberto}
        title="Assinatura de Documento"
        description="Assine para registrar a marcação pelo sistema web."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              loading={pendente}
              leftIcon={<PenLine className="size-4" aria-hidden="true" />}
              onClick={(event) => {
                const modal = event.currentTarget.closest('[role="dialog"]');
                const form = modal?.querySelector("form");
                if (form instanceof HTMLFormElement) {
                  form.requestSubmit();
                }
              }}
            >
              Assinar e registrar
            </Button>
          </>
        }
      >
        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="senhaAssinaturaMarcacaoWebCard"
              className="text-sm font-semibold"
            >
              Senha
            </label>
            <input
              id="senhaAssinaturaMarcacaoWebCard"
              name="senhaAssinatura"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            />
            {estado.erro ? (
              <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">
                {estado.erro}
              </p>
            ) : null}
            {estado.sucesso ? (
              <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {estado.sucesso}
              </p>
            ) : null}
          </div>
        </form>
      </Modal>
    </section>
  );
}
