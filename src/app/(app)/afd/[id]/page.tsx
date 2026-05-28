import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import {
  buscarImportacaoAfdPorId,
  listarMarcacoesBrutasPorImportacaoAfd,
} from "@/modules/afd/infrastructure/repositories/afd.repository";
import { MarcacoesBrutasTable } from "@/modules/marcacoes-brutas/presentation/components/marcacoes-brutas-table";

type AfdDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AfdDetalhePage({ params }: AfdDetalhePageProps) {
  const { id } = await params;

  const [importacao, marcacoesBrutas] = await Promise.all([
    buscarImportacaoAfdPorId(id),
    listarMarcacoesBrutasPorImportacaoAfd(id),
  ]);

  if (!importacao) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Importação AFD", href: "/afd" },
          { label: importacao.id.slice(0, 8) },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Detalhe da importação AFD
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Importação {importacao.id.slice(0, 8)}
          </h1>

          <p className="mt-2 font-mono text-xs text-[var(--muted-foreground)]">
            {importacao.id}
          </p>
        </div>

        <Link
          href="/afd"
          className="rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
        >
          Voltar
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Resumo label="Status" value={importacao.status} />
        <Resumo label="Arquivos" value={importacao.quantidadeArquivos} />
        <Resumo label="Linhas" value={importacao.totalLinhas} />
        <Resumo label="Processadas" value={importacao.totalProcessadas} />
        <Resumo label="Brutas" value={importacao.totalMarcacoesBrutas} />
        <Resumo label="Duplicadas" value={importacao.totalDuplicadas} />
        <Resumo label="Pendentes" value={importacao.totalPendentes} />
        <Resumo label="Erros" value={importacao.totalErros} />
      </section>

      {importacao.observacao && (
        <section className="rounded-xl border bg-yellow-50 p-5 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300">
          {importacao.observacao}
        </section>
      )}

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-bold">Arquivos da importação</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Arquivo</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Linhas</th>
                <th className="px-5 py-3">Brutas</th>
                <th className="px-5 py-3">Duplicadas</th>
                <th className="px-5 py-3">Processadas</th>
                <th className="px-5 py-3">Pendentes</th>
                <th className="px-5 py-3">Erros</th>
              </tr>
            </thead>

            <tbody>
              {importacao.arquivos.map((arquivo) => (
                <tr key={arquivo.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4">
                    <div className="font-semibold">{arquivo.nomeOriginal}</div>
                    {arquivo.erro && (
                      <div className="mt-1 text-xs text-red-600">
                        {arquivo.erro}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">{arquivo.status}</td>
                  <td className="px-5 py-4">{arquivo.totalLinhas}</td>
                  <td className="px-5 py-4">
                    {arquivo.totalMarcacoesBrutas}
                  </td>
                  <td className="px-5 py-4">{arquivo.totalDuplicadas}</td>
                  <td className="px-5 py-4">{arquivo.totalProcessadas}</td>
                  <td className="px-5 py-4">{arquivo.totalPendentes}</td>
                  <td className="px-5 py-4">{arquivo.totalErros}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <MarcacoesBrutasTable marcacoes={marcacoesBrutas} />
    </div>
  );
}

function Resumo({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-xl border bg-[var(--card)] p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </article>
  );
}