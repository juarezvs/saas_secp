import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import {
  listarSolicitacoesDoUsuario,
  listarSolicitacoesGlobais,
  listarSolicitacoesParaChefia,
} from "@/modules/solicitacoes/infrastructure/repositories/solicitacao.repository";
import { SolicitacoesTable } from "@/modules/solicitacoes/presentation/components/solicitacoes-table";

export default async function SolicitacoesPage() {
  const session = await auth();

  const permissoes = session?.user.perfilAtivo?.permissoes ?? [];

  const podeConsultarGlobal = permissoes.includes(
    "solicitacoes:consultar:global"
  );
  const podeAnalisarChefia = permissoes.includes(
    "solicitacoes:analisar:chefia"
  );

  const solicitacoes = session?.user
    ? podeConsultarGlobal
      ? await listarSolicitacoesGlobais()
      : podeAnalisarChefia
        ? await listarSolicitacoesParaChefia(session.user.id)
        : await listarSolicitacoesDoUsuario(session.user.id)
    : [];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Solicitações" }]} />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Solicitações e aprovações
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Solicitações
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
            Solicite ajustes, compensações, justificativas, abonos, atividades
            externas, capacitações e viagens a serviço.
          </p>
        </div>

        <Link
          href="/solicitacoes/nova"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nova solicitação
        </Link>
      </section>

      <RegraPortariaCard
        artigo="Arts. 8º, 9º, 10, 13, 14 e 18"
        titulo="Comunicação, autorização e correção de frequência"
        descricao="As solicitações registram comunicações e pedidos que impactam a jornada, como ajuste de ponto, compensação, abono, atividade externa, capacitação e autorização prévia de horas."
      />

      <SolicitacoesTable solicitacoes={solicitacoes} />
    </div>
  );
}