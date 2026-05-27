import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { analisarSolicitacaoAction } from "@/modules/solicitacoes/application/actions/analisar-solicitacao.action";
import {
  classeStatusSolicitacao,
  rotuloStatusSolicitacao,
  rotuloTipoSolicitacao,
  solicitacaoPodeSerAnalisada,
} from "@/modules/solicitacoes/application/services/fluxo-solicitacao.service";
import { buscarSolicitacaoPorId } from "@/modules/solicitacoes/infrastructure/repositories/solicitacao.repository";
import { AnalisarSolicitacaoForm } from "@/modules/solicitacoes/presentation/components/analisar-solicitacao-form";
import { SolicitacaoStepper } from "@/modules/solicitacoes/presentation/components/solicitacao-stepper";
import { SolicitacaoTimeline } from "@/modules/solicitacoes/presentation/components/solicitacao-timeline";

type SolicitacaoDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SolicitacaoDetalhePage({
  params,
}: SolicitacaoDetalhePageProps) {
  const session = await auth();

  const { id } = await params;
  const solicitacao = await buscarSolicitacaoPorId(id);

  if (!solicitacao) {
    notFound();
  }

  const permissoes = session?.user.perfilAtivo?.permissoes ?? [];
  const podeAnalisar =
    solicitacaoPodeSerAnalisada(solicitacao.status) &&
    (permissoes.includes("solicitacoes:analisar:chefia") ||
      permissoes.includes("solicitacoes:consultar:global"));

  const action = analisarSolicitacaoAction.bind(null, solicitacao.id);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Solicitações", href: "/solicitacoes" },
          { label: solicitacao.titulo },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            {rotuloTipoSolicitacao(solicitacao.tipo)}
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {solicitacao.titulo}
          </h1>

          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Servidor: {solicitacao.servidor.usuario.nome} • Matrícula{" "}
            {solicitacao.servidor.matricula}
          </p>
        </div>

        <span
          className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${classeStatusSolicitacao(
            solicitacao.status
          )}`}
        >
          {rotuloStatusSolicitacao(solicitacao.status)}
        </span>
      </section>

      <RegraPortariaCard
        artigo="Arts. 9º, 10, 14, 16 e 18"
        titulo="Análise pela chefia"
        descricao="A chefia avalia a justificativa, autoriza ou indefere a solicitação e o resultado passa a compor a trilha de auditoria e a futura homologação mensal."
      />

      <SolicitacaoStepper status={solicitacao.status} />

      <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">Detalhes da solicitação</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Info label="Tipo" value={rotuloTipoSolicitacao(solicitacao.tipo)} />
          <Info label="Unidade" value={solicitacao.unidade?.sigla ?? "-"} />
          <Info
            label="Data de referência"
            value={
              solicitacao.dataReferencia
                ? new Intl.DateTimeFormat("pt-BR").format(
                    solicitacao.dataReferencia
                  )
                : "-"
            }
          />
          <Info
            label="Chefia responsável"
            value={
              solicitacao.chefiaResponsavel?.servidor.usuario.nome ??
              "Não identificada"
            }
          />
        </div>

        <div className="mt-5 rounded-lg border bg-[var(--muted)] p-4">
          <p className="text-sm font-semibold">Descrição</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted-foreground)]">
            {solicitacao.descricao}
          </p>
        </div>

        {solicitacao.justificativaAnalise && (
          <div className="mt-5 rounded-lg border bg-[var(--muted)] p-4">
            <p className="text-sm font-semibold">Justificativa da análise</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted-foreground)]">
              {solicitacao.justificativaAnalise}
            </p>
          </div>
        )}
      </section>

      {podeAnalisar && <AnalisarSolicitacaoForm action={action} />}

      <SolicitacaoTimeline eventos={solicitacao.eventos} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-[var(--muted)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}