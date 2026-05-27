import { encaminharBoletimFrequenciaAction } from "../../application/actions/encaminhar-boletim-frequencia.action";
import { receberBoletimFrequenciaAction } from "../../application/actions/receber-boletim-frequencia.action";

export function BoletimAcoesCard({
  boletimId,
  status,
}: {
  boletimId: string;
  status: string;
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <h2 className="text-lg font-bold">Ações do boletim</h2>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <form action={encaminharBoletimFrequenciaAction} className="space-y-3">
          <input type="hidden" name="boletimId" value={boletimId} />

          <h3 className="font-semibold">Encaminhar à SECAP/NUCGP</h3>

          <input
            name="processoSei"
            placeholder="Processo SEI"
            className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          />

          <input
            name="numeroSei"
            placeholder="Documento SEI"
            className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          />

          <textarea
            name="observacao"
            rows={3}
            placeholder="Observação do encaminhamento"
            className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
          />

          <button
            type="submit"
            disabled={status !== "GERADO"}
            className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Encaminhar boletim
          </button>
        </form>

        <form action={receberBoletimFrequenciaAction} className="space-y-3">
          <input type="hidden" name="boletimId" value={boletimId} />

          <h3 className="font-semibold">Registro SECAP/NUCGP</h3>

          <select
            name="status"
            defaultValue="RECEBIDO_SECAP"
            className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          >
            <option value="RECEBIDO_SECAP">Recebido pela SECAP/NUCGP</option>
            <option value="CONFERIDO">Conferido</option>
          </select>

          <textarea
            name="observacao"
            rows={3}
            placeholder="Observação da conferência"
            className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
          />

          <button
            type="submit"
            disabled={!["ENCAMINHADO_SECAP", "RECEBIDO_SECAP"].includes(status)}
            className="rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Registrar recebimento/conferência
          </button>
        </form>
      </div>
    </section>
  );
}
