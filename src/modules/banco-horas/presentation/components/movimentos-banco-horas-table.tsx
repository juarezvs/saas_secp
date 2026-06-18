import { Trash2 } from "lucide-react";

import { excluirAjusteManualBancoHorasAction } from "../../application/actions/excluir-ajuste-manual-banco-horas.action";
import {
  minutosParaHoraBanco,
  rotuloOrigemMovimentoBancoHoras,
  rotuloTipoMovimentoBancoHoras,
} from "../../application/services/formatar-banco-horas.service";

type MovimentoBancoHorasItem = {
  id: string;
  dataReferencia: Date;
  tipo: string;
  origem: string;
  status: string;
  minutos: number;
  descricao: string | null;
  expiraEm: Date | null;
};

export function MovimentosBancoHorasTable({
  movimentos,
  podeGerenciar = false,
}: {
  movimentos: MovimentoBancoHorasItem[];
  podeGerenciar?: boolean;
}) {
  const colSpan = podeGerenciar ? 8 : 7;

  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b p-5 md:flex-row md:items-start">
        <div>
          <h2 className="text-lg font-bold">Movimentos do banco de horas</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Cada linha mostra a origem do crédito, débito ou compensação da
            competência selecionada. Os saldos ao lado resumem o impacto dos
            movimentos listados.
          </p>
        </div>

        <span className="inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
          {movimentos.length} registro{movimentos.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <caption className="sr-only">
            Movimentos do banco de horas com data, tipo, origem, minutos,
            status, expiracao e descrição.
          </caption>
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Origem</th>
              <th className="px-5 py-3">Horas</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Expiracao</th>
              <th className="px-5 py-3">Descrição</th>
              {podeGerenciar && <th className="px-5 py-3">Acoes</th>}
            </tr>
          </thead>

          <tbody>
            {movimentos.map((movimento) => (
              <tr key={movimento.id} className="border-b last:border-b-0">
                <td className="px-5 py-4">
                  {new Intl.DateTimeFormat("pt-BR").format(
                    movimento.dataReferencia,
                  )}
                </td>

                <td className="px-5 py-4 font-semibold">
                  {rotuloTipoMovimentoBancoHoras(movimento.tipo)}
                </td>

                <td className="px-5 py-4">
                  {rotuloOrigemMovimentoBancoHoras(movimento.origem)}
                </td>

                <td className="px-5 py-4 font-mono font-semibold">
                  {minutosParaHoraBanco(movimento.minutos)}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      movimento.status === "VALIDADO"
                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : movimento.status === "PENDENTE"
                          ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {movimento.status}
                  </span>
                </td>

                <td className="px-5 py-4">
                  {movimento.expiraEm
                    ? new Intl.DateTimeFormat("pt-BR").format(
                        movimento.expiraEm,
                      )
                    : "-"}
                </td>

                <td className="px-5 py-4 text-[var(--muted-foreground)]">
                  {movimento.descricao ?? "-"}
                </td>

                {podeGerenciar && (
                  <td className="px-5 py-4">
                    {movimentoPodeSerExcluido(movimento) ? (
                      <form action={excluirAjusteManualBancoHorasAction}>
                        <input
                          type="hidden"
                          name="movimentoId"
                          value={movimento.id}
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Excluir
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        -
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}

            {movimentos.length === 0 && (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhum movimento de banco de horas encontrado para a
                  competência selecionada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function movimentoPodeSerExcluido(movimento: MovimentoBancoHorasItem) {
  return (
    movimento.origem === "AJUSTE_ADMINISTRATIVO" &&
    !["ESTORNADO", "DESCONSIDERADO", "EXPIRADO"].includes(movimento.status)
  );
}
