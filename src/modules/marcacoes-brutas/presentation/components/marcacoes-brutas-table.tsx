type MarcacaoBrutaItem = {
  id: string;
  cpf: string | null;
  matricula: string | null;
  dataHora: Date | string | null;
  equipamentoCodigo: string | null;
  origem: string;
  nsr: string | null;
  codigoExterno: string | null;
  processada: boolean;
  processadaEm: Date | null;
  arquivoAfd?: {
    nomeOriginal: string;
  } | null;
  servidor: {
    matricula: string;
    usuario: {
      nome: string;
    };
  } | null;
  marcacao: {
    tipo: string;
    status: string;
  } | null;
};

function formatarDataHoraSegura(valor: Date | string | null | undefined) {
  if (!valor) {
    return "-";
  }

  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Manaus",
  }).format(data);
}

export function MarcacoesBrutasTable({
  marcacoes,
}: {
  marcacoes: MarcacaoBrutaItem[];
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Marcações brutas</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Fonte oficial e imutável das marcações recebidas pelo SECP.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Data/hora</th>
              <th className="px-5 py-3">Origem</th>
              <th className="px-5 py-3">CPF/Matrícula</th>
              <th className="px-5 py-3">Servidor vinculado</th>
              <th className="px-5 py-3">Equipamento</th>
              <th className="px-5 py-3">NSR/Código</th>
              <th className="px-5 py-3">Processamento</th>
              <th className="px-5 py-3">Marcação</th>
            </tr>
          </thead>

          <tbody>
            {marcacoes.map((item) => (
              <tr key={item.id} className="border-b last:border-b-0">
                <td className="px-5 py-4">
                  {formatarDataHoraSegura(item.dataHora)}
                </td>

                <td className="px-5 py-4">
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {item.origem}
                  </span>
                  {item.arquivoAfd && (
                    <div className="mt-2 max-w-60 truncate text-xs text-(--muted-foreground)">
                      {item.arquivoAfd.nomeOriginal}
                    </div>
                  )}
                </td>

                <td className="px-5 py-4 font-mono text-xs">
                  <div>CPF: {item.cpf ?? "-"}</div>
                  <div>Matrícula: {item.matricula ?? "-"}</div>
                </td>

                <td className="px-5 py-4">
                  {item.servidor ? (
                    <>
                      <div className="font-semibold">
                        {item.servidor.usuario.nome}
                      </div>
                      <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
                        {item.servidor.matricula}
                      </div>
                    </>
                  ) : (
                    <span className="text-[var(--muted-foreground)]">
                      Não vinculado
                    </span>
                  )}
                </td>

                <td className="px-5 py-4 font-mono text-xs">
                  {item.equipamentoCodigo ?? "-"}
                </td>

                <td className="px-5 py-4 font-mono text-xs">
                  <div>NSR: {item.nsr ?? "-"}</div>
                  <div>Código: {item.codigoExterno ?? "-"}</div>
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      item.processada
                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                    }`}
                  >
                    {item.processada ? "Processada" : "Pendente"}
                  </span>
                </td>

                <td className="px-5 py-4">
                  {item.marcacao ? (
                    <>
                      <div className="font-semibold">{item.marcacao.tipo}</div>
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {item.marcacao.status}
                      </div>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}

            {marcacoes.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhuma marcação bruta encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
