import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { buscarEventoAuditoriaPorId } from "@/modules/auditoria/infrastructure/repositories/auditoria.repository";
import { AuditoriaDetalheCard } from "@/modules/auditoria/presentation/components/auditoria-detalhe-card";

type AuditoriaDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AuditoriaDetalhePage({
  params,
}: AuditoriaDetalhePageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "auditoria:consultar:global",
    "auditoria:detalhar:global",
  ]);

  const { id } = await params;
  const evento = await buscarEventoAuditoriaPorId(id);

  if (!evento) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Auditoria", href: "/auditoria" },
          { label: evento.acao },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Evento de auditoria
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {evento.acao}
          </h1>

          <p className="mt-2 max-w-4xl font-mono text-xs text-[var(--muted-foreground)]">
            {evento.id}
          </p>
        </div>

        <Link
          href="/auditoria"
          className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
        >
          Voltar para auditoria
        </Link>
      </section>

      <RegraPortariaCard
        artigo="Trilha de controle"
        titulo="Detalhamento do evento"
        descricao="Este detalhamento permite conferir o estado anterior, o estado posterior, metadados, usuário responsável, origem técnica da requisição e identificação da entidade afetada."
      />

      <AuditoriaDetalheCard evento={evento} />
    </div>
  );
}
