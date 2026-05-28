type LogIntegracaoItem = {
  id: string;
  tipo: string;
  direcao: string;
  status: string;
  entidade: string | null;
  entidadeId: string | null;
  mensagem: string | null;
  erro: string | null;
  iniciadoEm: Date;
  finalizadoEm: Date | null;
  duracaoMs: number | null;
  integracao: {
    nome: string;
  } | null;
};

export function LogsIntegracaoTable({ logs }: { logs: LogIntegracaoItem[] }) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Últimos logs de integração</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Início</th>
              <th className="px-5 py-3">Integração</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Direção</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Mensagem</th>
              <th className="px-5 py-3">Duração</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b last:border-b-0">
                <td className="px-5 py-4">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "medium",
                  }).format(log.iniciadoEm)}
                </td>

                <td className="px-5 py-4">{log.integracao?.nome ?? "-"}</td>

                <td className="px-5 py-4">{log.tipo}</td>
                <td className="px-5 py-4">{log.direcao}</td>

                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      log.status === "SUCESSO"
                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : log.status === "ERRO"
                          ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                          : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                    }`}
                  >
                    {log.status}
                  </span>
                </td>

                <td className="px-5 py-4 text-[var(--muted-foreground)]">
                  {log.erro ?? log.mensagem ?? "-"}
                </td>

                <td className="px-5 py-4">
                  {log.duracaoMs ? `${log.duracaoMs} ms` : "-"}
                </td>
              </tr>
            ))}

            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhum log de integração encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
