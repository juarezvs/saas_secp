import { Clock3 } from "lucide-react";
import { registrarMarcacaoWebAutorizadaAction } from "@/modules/marcacoes-brutas/application/actions/registrar-marcacao-web.action";

export function RegistrarPontoCard() {
  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-50 p-3 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
          <Clock3 className="size-5" aria-hidden="true" />
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-bold">Registro web autorizado</h2>

          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Use esta opção apenas quando houver permissão específica para
            registro de ponto pelo sistema web. A marcação será gravada como
            dado bruto e processada pelo SECP.
          </p>

          <form action={registrarMarcacaoWebAutorizadaAction} className="mt-4">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
            >
              <Clock3 className="size-4" aria-hidden="true" />
              Registrar marcação via web
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
