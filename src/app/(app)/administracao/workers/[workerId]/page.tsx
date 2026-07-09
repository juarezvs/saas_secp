import Link from "next/link";
import { ArrowLeft, ServerCog } from "lucide-react";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  obterSaudeWorkerDetalhe,
  type WorkerHealthStatus,
} from "@/modules/workers-health/application/services/workers-health.service";

const PERMISSOES_WORKERS = [
  "configuracoes:gerenciar:global",
  "integracoes:gerenciar:global",
];

type WorkerDetalhePageProps = {
  params: Promise<{
    workerId: string;
  }>;
};

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

function formatarData(data?: Date | null) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Manaus",
  }).format(data);
}

function serializar(valor: unknown) {
  if (valor === undefined || valor === null || valor === "") return "-";

  try {
    return JSON.stringify(valor, null, 2);
  } catch {
    return String(valor);
  }
}

export default async function WorkerDetalhePage({
  params,
}: WorkerDetalhePageProps) {
  await exigirUmaDasPermissoesOuRedirecionar(PERMISSOES_WORKERS);

  const { workerId } = await params;
  const worker = await obterSaudeWorkerDetalhe(workerId);

  if (!worker) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Saúde dos Workers", href: "/administracao/workers" },
          { label: worker.nome },
        ]}
      />

      <PageHeader
        icon={ServerCog}
        titulo={worker.nome}
        descricao={worker.descricao}
        regraTitulo="Detalhe operacional"
        regraDescricao={worker.detalheOperacional}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/administracao/workers"
          className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-[var(--muted)]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar
        </Link>

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
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-[var(--card)] p-5">
          <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
            Tipo
          </p>
          <p className="mt-2 font-semibold">
            {worker.queueName ? "Fila BullMQ" : "Processo contínuo"}
          </p>
          {worker.queueName && (
            <p className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
              {worker.queueName}
            </p>
          )}
        </div>

        <div className="rounded-lg border bg-[var(--card)] p-5">
          <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
            Processo
          </p>
          <p className="mt-2 font-semibold">
            {worker.ativoNoProcesso ? "Ativo neste processo" : "Não ativo"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Última atividade: {formatarData(worker.ultimaAtividadeEm)}
          </p>
        </div>

        <div className="rounded-lg border bg-[var(--card)] p-5">
          <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
            Fila
          </p>
          {worker.counts ? (
            <p className="mt-2 text-sm leading-6">
              Ativos {worker.counts.active} · Aguardando {worker.counts.waiting}{" "}
              · Agendados {worker.counts.delayed} · Falhas{" "}
              {worker.counts.failed}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Este worker não usa fila.
            </p>
          )}
        </div>
      </section>

      {worker.motivoAtencao && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-bold">Ponto de atenção</p>
          <p className="mt-2">{worker.motivoAtencao}</p>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-[var(--card)] p-5">
          <h2 className="font-bold">Onde é usado</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]">
            {worker.ondeUsa.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border bg-[var(--card)] p-5">
          <h2 className="font-bold">Quando é usado</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]">
            {worker.quandoUsa.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-[var(--card)] shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="font-bold">Últimas informações de execução</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Para workers com fila, são exibidos os últimos jobs. Para workers
            contínuos, são exibidos os eventos operacionais disponíveis no
            processo.
          </p>
        </div>

        {worker.logs.length > 0 ? (
          <div className="divide-y">
            {worker.logs.map((log) => (
              <article key={log.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {log.nome ? `${log.nome} · ` : ""}
                      {log.estado}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {formatarData(log.data)}
                    </p>
                  </div>
                  <span className="rounded-full border px-2 py-1 font-mono text-xs">
                    {log.id}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6">{log.mensagem}</p>

                {(log.progresso !== undefined || log.dados !== undefined) && (
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <pre className="max-h-72 overflow-auto rounded-md bg-[var(--muted)] p-3 text-xs">
                      {serializar(log.progresso)}
                    </pre>
                    <pre className="max-h-72 overflow-auto rounded-md bg-[var(--muted)] p-3 text-xs">
                      {serializar(log.dados)}
                    </pre>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="p-5 text-sm text-[var(--muted-foreground)]">
            Nenhuma informação recente de execução encontrada.
          </p>
        )}
      </section>
    </div>
  );
}
