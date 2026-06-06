import {
  minutosParaHoraBanco,
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
}: {
  movimentos: MovimentoBancoHorasItem[];
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b p-5 md:flex-row md:items-start">
        <div>
          <h2 className="text-lg font-bold">Movimentos do banco de horas</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Cada linha mostra a origem do credito, debito ou compensacao da
            competencia selecionada. Os saldos ao lado resumem o impacto dos
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
            status, expiracao e descricao.
          </caption>
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Origem</th>
              <th className="px-5 py-3">Horas</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Expiracao</th>
              <th className="px-5 py-3">Descricao</th>
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

                <td className="px-5 py-4">{movimento.origem}</td>

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
              </tr>
            ))}

            {movimentos.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhum movimento de banco de horas encontrado para a
                  competencia selecionada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
