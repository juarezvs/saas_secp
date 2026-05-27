import {
  minutosParaHoraBoletim,
  rotuloTipoResumoServidor,
} from "../../application/services/formatar-boletim-frequencia.service";

type BoletimServidorItem = {
  id: string;
  tipoResumo: string;
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosCredito: number;
  minutosDebito: number;
  faltas: number;
  saldoBancoAntesMinutos: number;
  saldoBancoDepoisMinutos: number | null;
  observacaoChefia: string | null;
  servidor: {
    matricula: string;
    usuario: {
      nome: string;
    };
    lotacoes: {
      unidade: {
        sigla: string;
      };
    }[];
  };
};

export function BoletimServidoresTable({
  servidores,
}: {
  servidores: BoletimServidorItem[];
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Servidores consolidados</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Resumo mensal consolidado a partir da homologação.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Servidor</th>
              <th className="px-5 py-3">Lotação</th>
              <th className="px-5 py-3">Resumo</th>
              <th className="px-5 py-3">Previsto</th>
              <th className="px-5 py-3">Trabalhado</th>
              <th className="px-5 py-3">Crédito</th>
              <th className="px-5 py-3">Débito</th>
              <th className="px-5 py-3">Faltas</th>
              <th className="px-5 py-3">Banco final</th>
              <th className="px-5 py-3">Observação</th>
            </tr>
          </thead>

          <tbody>
            {servidores.map((item) => (
              <tr key={item.id} className="border-b last:border-b-0">
                <td className="px-5 py-4">
                  <div className="font-semibold">
                    {item.servidor.usuario.nome}
                  </div>
                  <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
                    {item.servidor.matricula}
                  </div>
                </td>

                <td className="px-5 py-4">
                  {item.servidor.lotacoes[0]?.unidade.sigla ?? "-"}
                </td>

                <td className="px-5 py-4 font-semibold">
                  {rotuloTipoResumoServidor(item.tipoResumo)}
                </td>

                <td className="px-5 py-4">
                  {minutosParaHoraBoletim(item.cargaPrevistaMinutos)}
                </td>

                <td className="px-5 py-4">
                  {minutosParaHoraBoletim(item.minutosTrabalhados)}
                </td>

                <td className="px-5 py-4">
                  {minutosParaHoraBoletim(item.minutosCredito)}
                </td>

                <td className="px-5 py-4">
                  {minutosParaHoraBoletim(item.minutosDebito)}
                </td>

                <td className="px-5 py-4">{item.faltas}</td>

                <td className="px-5 py-4">
                  {minutosParaHoraBoletim(
                    item.saldoBancoDepoisMinutos ?? item.saldoBancoAntesMinutos,
                  )}
                </td>

                <td className="px-5 py-4 text-[var(--muted-foreground)]">
                  {item.observacaoChefia ?? "-"}
                </td>
              </tr>
            ))}

            {servidores.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhum servidor consolidado no boletim.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
