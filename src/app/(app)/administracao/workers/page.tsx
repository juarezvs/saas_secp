import Link from "next/link";
import { Activity, ExternalLink, ServerCog } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  listarSaudeWorkers,
  type WorkerHealthStatus,
} from "@/modules/workers-health/application/services/workers-health.service";

const PERMISSOES_WORKERS = [
  "configuracoes:gerenciar:global",
  "integracoes:gerenciar:global",
];

function statusClassName(status: WorkerHealthStatus) {
  if (status === "online") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200";
  }

  if (status === "parado") {
    return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
  }

  return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200";
}

function statusDotClassName(status: WorkerHealthStatus) {
  if (status === "online") return "bg-emerald-500";
  if (status === "parado") return "bg-slate-400";
  return "bg-amber-500";
}

export default async function SaudeWorkersPage() {
  await exigirUmaDasPermissoesOuRedirecionar(PERMISSOES_WORKERS);

  const workers = await listarSaudeWorkers();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Saúde dos Workers" },
        ]}
      />

      <PageHeader
        icon={ServerCog}
        titulo="Saúde dos Workers"
        descricao="Acompanhe workers automáticos, filas de processamento e rotinas assíncronas do SECP."
        regraTitulo="Monitoramento operacional"
        regraDescricao="O painel consolida estado do processo, fila, últimos jobs e pontos de uso das rotinas em segundo plano."
      />

      <section className="overflow-hidden rounded-lg border bg-[var(--card)] shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="font-bold">Workers do SECP</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            O semáforo considera processo ativo, conectividade com Redis e
            falhas recentes de jobs.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y text-sm">
            <thead className="bg-[var(--muted)] text-left text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Worker</th>
                <th className="px-5 py-3">Semáforo</th>
                <th className="px-5 py-3">Onde é usado</th>
                <th className="px-5 py-3">Quando é usado</th>
                <th className="px-5 py-3">Fila</th>
                <th className="px-5 py-3 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {workers.map((worker) => (
                <tr key={worker.id} className="align-top">
                  <td className="px-5 py-4">
                    <p className="font-bold">{worker.nome}</p>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--muted-foreground)]">
                      {worker.descricao}
                    </p>
                    {worker.motivoAtencao && (
                      <p className="mt-2 max-w-sm text-xs font-semibold text-amber-700 dark:text-amber-300">
                        {worker.motivoAtencao}
                      </p>
                    )}
                    {worker.container && (
                      <p className="mt-2 font-mono text-xs text-[var(--muted-foreground)]">
                        Docker: {worker.container.containerName} ·{" "}
                        {worker.container.status ?? "indisponivel"}
                        {worker.container.health
                          ? `/${worker.container.health}`
                          : ""}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${statusClassName(
                        worker.status,
                      )}`}
                    >
                      <span
                        className={`size-2.5 rounded-full ${statusDotClassName(
                          worker.status,
                        )}`}
                        aria-hidden="true"
                      />
                      {worker.statusLabel}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <ul className="space-y-1 text-xs leading-5">
                      {worker.ondeUsa.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-5 py-4">
                    <ul className="max-w-md space-y-1 text-xs leading-5 text-[var(--muted-foreground)]">
                      {worker.quandoUsa.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-5 py-4">
                    {worker.queueName ? (
                      <div className="space-y-1 text-xs">
                        <p className="font-mono">{worker.queueName}</p>
                        {worker.counts && (
                          <p className="text-[var(--muted-foreground)]">
                            Ativos {worker.counts.active} · Aguardando{" "}
                            {worker.counts.waiting} · Falhas{" "}
                            {worker.counts.failed}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        Processo contínuo
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/administracao/workers/${worker.id}`}
                      className="inline-flex size-9 items-center justify-center rounded-md border hover:bg-[var(--muted)]"
                      aria-label={`Detalhes do worker ${worker.nome}`}
                      title={`Detalhes do worker ${worker.nome}`}
                    >
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border bg-[var(--card)] p-5 text-sm text-[var(--muted-foreground)]">
        <p className="flex items-center gap-2 font-semibold text-[var(--foreground)]">
          <Activity className="size-4" aria-hidden="true" />
          Leitura do semáforo
        </p>
        <p className="mt-2 leading-6">
          Online indica worker ativo e fila acessível. Parado indica worker não
          iniciado ou desabilitado. Atenção indica falha recente, erro de
          consulta ou condição operacional que merece verificação.
        </p>
      </section>
    </div>
  );
}
