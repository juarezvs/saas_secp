import Link from "next/link";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

function formatarData(data: Date | null) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

export default async function ResumoErrosExecucaoSarhPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "integracoes-sarh:consultar:global",
    "integracoes-sarh:executar:global",
    "integracoes-sarh:configurar:global",
    "integracoes:gerenciar:global",
  ]);

  const { id } = await params;
  const execucao = await prisma.integracaoSarhExecucao.findUnique({
    where: { id },
    include: {
      itens: {
        where: { status: "ERRO" },
        orderBy: { criadoEm: "asc" },
      },
    },
  });

  if (!execucao) {
    notFound();
  }

  const totalErros = Math.max(
    execucao.totalErros,
    execucao.itens.length + (execucao.mensagemErro ? 1 : 0),
  );

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Administração / Integrações / SARH
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            Resumo dos erros
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Execução iniciada em {formatarData(execucao.iniciadoEm)}.
          </p>
        </div>

        <Link
          href="/administracao/integracoes/sarh"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar ao histórico
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
          <p className="mt-1 font-semibold text-slate-950 dark:text-slate-50">
            {execucao.status}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm text-slate-500 dark:text-slate-400">Tipo</p>
          <p className="mt-1 font-semibold text-slate-950 dark:text-slate-50">
            {execucao.tipo}
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">
            Erros registrados
          </p>
          <p className="mt-1 text-2xl font-semibold text-red-900 dark:text-red-100">
            {totalErros}
          </p>
        </div>
      </section>

      {execucao.mensagemErro && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
          <div className="flex items-center gap-2 text-red-900 dark:text-red-100">
            <CircleAlert className="size-5" aria-hidden="true" />
            <h2 className="font-semibold">Falha geral da execução</h2>
          </div>
          <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs text-red-800 dark:text-red-200">
            {execucao.mensagemErro}
          </pre>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
          Itens com erro
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Registros que não puderam ser processados nesta execução.
        </p>

        {execucao.itens.length === 0 ? (
          <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            Nenhum erro individual foi registrado.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Endpoint</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Chave externa</th>
                  <th className="py-2 pr-3">Erro</th>
                </tr>
              </thead>
              <tbody>
                {execucao.itens.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 align-top dark:border-slate-900"
                  >
                    <td className="py-3 pr-3">
                      {formatarData(item.criadoEm)}
                    </td>
                    <td className="py-3 pr-3">{item.endpoint}</td>
                    <td className="py-3 pr-3">{item.tipoRegistro}</td>
                    <td className="py-3 pr-3 font-mono text-xs">
                      {item.chaveExterna}
                    </td>
                    <td className="max-w-xl whitespace-pre-wrap py-3 pr-3 text-red-700 dark:text-red-300">
                      {item.erro ?? item.mensagem ?? "Erro não detalhado."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
