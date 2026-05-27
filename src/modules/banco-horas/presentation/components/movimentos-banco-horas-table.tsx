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
        <div className="border-b p-5">
          <h2 className="text-lg font-bold">Movimentos do banco de horas</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Histórico de créditos, débitos, compensações e horas não computadas.
          </p>
        </div>
  
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Origem</th>
                <th className="px-5 py-3">Minutos</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Expiração</th>
                <th className="px-5 py-3">Descrição</th>
              </tr>
            </thead>
  
            <tbody>
              {movimentos.map((movimento) => (
                <tr key={movimento.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4">
                    {new Intl.DateTimeFormat("pt-BR").format(
                      movimento.dataReferencia
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
                          movimento.expiraEm
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
                    Nenhum movimento de banco de horas encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }