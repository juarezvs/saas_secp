import Link from "next/link";

type ArquivoAfdItem = {
  id: string;
  nomeOriginal: string;
  status: string;
  totalLinhas: number;
  totalMarcacoesBrutas: number;
  totalDuplicadas: number;
  totalProcessadas: number;
  totalPendentes: number;
  totalErros: number;
  erro: string | null;
};

type ImportacaoAfdItem = {
  id: string;
  status: string;
  quantidadeArquivos: number;
  totalLinhas: number;
  totalMarcacoesBrutas: number;
  totalDuplicadas: number;
  totalProcessadas: number;
  totalPendentes: number;
  totalErros: number;
  criadoEm: Date;
  finalizadoEm: Date | null;
  arquivos: ArquivoAfdItem[];
};

export function AfdImportacoesTable({
  importacoes,
}: {
  importacoes: ImportacaoAfdItem[];
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Importações recentes</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Acompanhe o processamento assíncrono dos arquivos AFD enviados.
        </p>
      </div>

      <div className="divide-y">
        {importacoes.map((importacao) => (
          <article key={importacao.id} className="p-5">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
              <div>
                <Link
                  href={`/afd/${importacao.id}`}
                  className="font-semibold text-blue-900 hover:underline dark:text-blue-300"
                >
                  Importação {importacao.id.slice(0, 8)}
                </Link>

                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Criada em{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(importacao.criadoEm)}
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${classeStatus(
                  importacao.status,
                )}`}
              >
                {importacao.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
              <Resumo label="Arquivos" value={importacao.quantidadeArquivos} />
              <Resumo label="Linhas" value={importacao.totalLinhas} />
              <Resumo label="Brutas" value={importacao.totalMarcacoesBrutas} />
              <Resumo label="Duplicadas" value={importacao.totalDuplicadas} />
              <Resumo label="Processadas" value={importacao.totalProcessadas} />
              <Resumo label="Pendentes" value={importacao.totalPendentes} />
              <Resumo label="Erros" value={importacao.totalErros} />
              <Resumo
                label="Finalizada"
                value={importacao.finalizadoEm ? "Sim" : "Não"}
              />
            </div>

            {importacao.arquivos.length > 0 && (
              <div className="mt-5 overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-4 py-3">Arquivo</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Linhas</th>
                      <th className="px-4 py-3">Brutas</th>
                      <th className="px-4 py-3">Duplicadas</th>
                      <th className="px-4 py-3">Processadas</th>
                      <th className="px-4 py-3">Pendentes</th>
                      <th className="px-4 py-3">Erros</th>
                    </tr>
                  </thead>

                  <tbody>
                    {importacao.arquivos.map((arquivo) => (
                      <tr key={arquivo.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3">
                          <div className="font-semibold">
                            {arquivo.nomeOriginal}
                          </div>
                          {arquivo.erro && (
                            <div className="mt-1 text-xs text-red-600">
                              {arquivo.erro}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${classeStatus(
                              arquivo.status,
                            )}`}
                          >
                            {arquivo.status}
                          </span>
                        </td>

                        <td className="px-4 py-3">{arquivo.totalLinhas}</td>
                        <td className="px-4 py-3">
                          {arquivo.totalMarcacoesBrutas}
                        </td>
                        <td className="px-4 py-3">{arquivo.totalDuplicadas}</td>
                        <td className="px-4 py-3">
                          {arquivo.totalProcessadas}
                        </td>
                        <td className="px-4 py-3">{arquivo.totalPendentes}</td>
                        <td className="px-4 py-3">{arquivo.totalErros}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        ))}

        {importacoes.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            Nenhuma importação AFD encontrada.
          </div>
        )}
      </div>
    </section>
  );
}

function Resumo({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-[var(--muted)] p-3">
      <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function classeStatus(status: string) {
  if (["PROCESSADA", "PROCESSADO"].includes(status)) {
    return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
  }

  if (["ERRO"].includes(status)) {
    return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
  }

  if (
    ["EM_PROCESSAMENTO", "PROCESSANDO", "RECEBIDA", "RECEBIDO"].includes(status)
  ) {
    return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
  }

  return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
}
