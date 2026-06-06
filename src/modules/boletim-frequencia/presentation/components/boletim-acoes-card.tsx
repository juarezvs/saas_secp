import { encaminharBoletimFrequenciaAction } from "../../application/actions/encaminhar-boletim-frequencia.action";
import { receberBoletimFrequenciaAction } from "../../application/actions/receber-boletim-frequencia.action";

export function BoletimAcoesCard({
  boletimId,
  status,
}: {
  boletimId: string;
  status: string;
}) {
  const podeEncaminhar = status === "GERADO";
  const podeRegistrarSecap = ["ENCAMINHADO_SECAP", "RECEBIDO_SECAP"].includes(
    status,
  );

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 className="text-lg font-bold">Acoes do boletim</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Registre o encaminhamento para a SECAP/NUCGP e, na etapa seguinte,
            o recebimento ou conferencia administrativa do boletim.
          </p>
        </div>

        <span className="w-fit rounded-full border px-3 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
          Fluxo Chefia -&gt; SECAP
        </span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <form
          action={encaminharBoletimFrequenciaAction}
          className="space-y-3 rounded-lg border p-4"
        >
          <input type="hidden" name="boletimId" value={boletimId} />

          <div>
            <h3 className="font-semibold">Encaminhar a SECAP/NUCGP</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Disponivel quando o boletim estiver gerado pela chefia.
            </p>
          </div>

          <input
            name="processoSei"
            placeholder="Processo SEI"
            disabled={!podeEncaminhar}
            className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          />

          <input
            name="numeroSei"
            placeholder="Documento SEI"
            disabled={!podeEncaminhar}
            className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          />

          <textarea
            name="observacao"
            rows={3}
            placeholder="Observacao do encaminhamento"
            disabled={!podeEncaminhar}
            className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={!podeEncaminhar}
            className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Encaminhar boletim
          </button>
        </form>

        <form
          action={receberBoletimFrequenciaAction}
          className="space-y-3 rounded-lg border p-4"
        >
          <input type="hidden" name="boletimId" value={boletimId} />

          <div>
            <h3 className="font-semibold">Registro SECAP/NUCGP</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Use esta etapa para confirmar recebimento e conferencia do
              boletim encaminhado.
            </p>
          </div>

          <select
            name="status"
            defaultValue="RECEBIDO_SECAP"
            disabled={!podeRegistrarSecap}
            className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="RECEBIDO_SECAP">Recebido pela SECAP/NUCGP</option>
            <option value="CONFERIDO">Conferido</option>
          </select>

          <textarea
            name="observacao"
            rows={3}
            placeholder="Observacao da conferencia"
            disabled={!podeRegistrarSecap}
            className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={!podeRegistrarSecap}
            className="rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Registrar recebimento/conferencia
          </button>
        </form>
      </div>
    </section>
  );
}
