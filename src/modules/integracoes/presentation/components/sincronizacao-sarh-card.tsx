import { RefreshCw } from "lucide-react";
import { sincronizarServidoresSarhAction } from "../../application/actions/sincronizar-servidores-sarh.action";

export function SincronizacaoSarhCard() {
  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <h2 className="text-lg font-bold">Sincronização SARH</h2>

      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
        Use esta ação para sincronizar servidores a partir da API do SARH. Em
        desenvolvimento, a sincronização pode usar o modo mock configurado no
        arquivo <code>.env</code>.
      </p>

      <form action={sincronizarServidoresSarhAction} className="mt-4">
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <RefreshCw className="size-4" />
          Sincronizar servidores
        </button>
      </form>
    </section>
  );
}
