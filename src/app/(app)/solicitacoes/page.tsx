import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  listarSolicitacoesDoUsuario,
  listarSolicitacoesGlobais,
  listarSolicitacoesParaChefia,
} from "@/modules/solicitacoes/infrastructure/repositories/solicitacao.repository";
import { SolicitacoesTable } from "@/modules/solicitacoes/presentation/components/solicitacoes-table";

export default async function SolicitacoesPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "solicitacoes:consultar:proprio",
    "solicitacoes:visualizar:proprio",
    "solicitacoes:analisar:chefia",
    "solicitacoes:consultar:global",
  ]);

  const session = await auth();
  const permissoes = session?.user.perfilAtivo?.permissoes ?? [];
  const podeConsultarGlobal = permissoes.includes(
    "solicitacoes:consultar:global",
  );
  const podeAnalisarChefia = permissoes.includes(
    "solicitacoes:analisar:chefia",
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
      <Breadcrumb items={[{ label: "Solicitacoes" }]} />

      <PageHeader
        icon={ClipboardList}
        titulo="Solicitacoes"
        descricao="Solicite ajustes, compensacoes, justificativas, abonos, atividades externas, capacitacoes e viagens a servico."
        artigo="Arts. 8, 9, 10, 13, 14 e 18"
        regraTitulo="Comunicacao, autorizacao e correcao de frequencia"
        regraDescricao="As solicitacoes registram comunicacoes e pedidos que impactam a jornada, como ajuste de ponto, compensacao, abono, atividade externa, capacitacao e autorizacao previa de horas."
        actions={
          <Link
            href="/solicitacoes/nova"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
          >
            <Plus className="size-4" aria-hidden="true" />
            Nova solicitacao
          </Link>
        }
      />

      <SolicitacoesTable solicitacoes={solicitacoes} />
    </div>
  );
}
