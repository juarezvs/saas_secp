import {
  escolherCompensacaoRecessoAction,
  fecharRecessoServidorAction,
} from "../../application/actions/recesso-forense.actions";
import {
  formatarDataRecesso,
  formatarPeriodoRecesso,
} from "../../application/services/recesso-forense.service";
import { RecessoStatusBadge } from "./recesso-status-badge";

type RecessoEspelhoRealProps = {
  recesso: {
    id: string;
    ano: number;
    dataInicio: Date;
    dataFim: Date;
  };
  servidor: {
    id: string;
    matricula: string;
    usuario: { nome: string };
  };
  dias: Array<{
    id: string;
    dataReferencia: Date;
    status: string;
    escolha: string;
    minutosTrabalhados: number;
    convocado: { id: string } | null;
  }>;
};

export function EspelhoRecessoReal({
  recesso,
  servidor,
  dias,
}: RecessoEspelhoRealProps) {
  const diasConvocados = dias.filter((dia) => dia.convocado);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
        <h2 className="text-lg font-bold">Espelho do recesso</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {servidor.usuario.nome} - {servidor.matricula} -{" "}
          {formatarPeriodoRecesso(recesso.dataInicio, recesso.dataFim)}
        </p>
      </section>

      <section className="rounded-xl border bg-[var(--card)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Situacao</th>
                <th className="px-5 py-3">Escolha</th>
                <th className="px-5 py-3">Minutos</th>
                <th className="px-5 py-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {dias.map((dia) => (
                <tr key={dia.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4">
                    {formatarDataRecesso(dia.dataReferencia)}
                  </td>
                  <td className="px-5 py-4">
                    <RecessoStatusBadge status={dia.status} />
                  </td>
                  <td className="px-5 py-4">
                    <RecessoStatusBadge status={dia.escolha} />
                  </td>
                  <td className="px-5 py-4">{dia.minutosTrabalhados}</td>
                  <td className="px-5 py-4">
                    {dia.convocado ? (
                      <form action={escolherCompensacaoRecessoAction} className="flex gap-2">
                        <input type="hidden" name="convocadoId" value={dia.convocado.id} />
                        <button
                          type="submit"
                          name="escolha"
                          value="PECUNIA"
                          className="rounded-md border px-3 py-1 text-xs font-semibold hover:bg-[var(--muted)]"
                        >
                          Pecúnia
                        </button>
                        <button
                          type="submit"
                          name="escolha"
                          value="FOLGA"
                          className="rounded-md border px-3 py-1 text-xs font-semibold hover:bg-[var(--muted)]"
                        >
                          Folga
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        Não convocado
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {dias.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[var(--muted-foreground)]">
                    Nenhum dia de recesso encontrado para este servidor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {[12, 1].map((mes) => (
          <form
            key={mes}
            action={fecharRecessoServidorAction}
            className="rounded-xl border bg-[var(--card)] p-5 shadow-sm"
          >
            <input type="hidden" name="recessoId" value={recesso.id} />
            <input type="hidden" name="servidorId" value={servidor.id} />
            <input type="hidden" name="mesReferencia" value={mes} />

            <h3 className="font-bold">
              Fechar {mes === 12 ? "dezembro" : "janeiro"}
            </h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {diasConvocados.filter((dia) => dia.dataReferencia.getUTCMonth() + 1 === mes).length}{" "}
              dia(s) convocado(s).
            </p>
            <textarea
              name="observacaoServidor"
              rows={3}
              className="mt-4 w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
              placeholder="Observacao opcional"
            />
            <button
              type="submit"
              className="mt-4 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
            >
              Fechar período
            </button>
          </form>
        ))}
      </section>
    </div>
  );
}
