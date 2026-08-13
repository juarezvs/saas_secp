import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  listarSolicitacoesDoUsuarioPaginado,
  listarSolicitacoesGlobaisPaginado,
  listarSolicitacoesParaChefiaPaginado,
  listarServidoresFiltroSolicitacoesDoUsuario,
  listarServidoresFiltroSolicitacoesGlobais,
  listarServidoresFiltroSolicitacoesParaChefia,
} from "@/modules/solicitacoes/infrastructure/repositories/solicitacao.repository";
import { SolicitacoesTable } from "@/modules/solicitacoes/presentation/components/solicitacoes-table";

type SolicitacoesPageProps = {
  searchParams: Promise<{
    tipo?: string;
    servidor?: string;
    competencia?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

function competenciaAtual() {
  const hoje = new Date();

  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function normalizarCompetencia(competencia?: string) {
  return /^\d{4}-\d{2}$/.test(competencia ?? "")
    ? competencia!
    : competenciaAtual();
}

export default async function SolicitacoesPage({
  searchParams,
}: SolicitacoesPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "solicitacoes:consultar:proprio",
    "solicitacoes:visualizar:proprio",
    "solicitacoes:analisar:chefia",
    "solicitacoes:consultar:global",
  ]);

  const session = await auth();
  const params = await searchParams;
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const permissoes = session?.user.perfilAtivo?.permissoes ?? [];
  const podeConsultarGlobal = permissoes.includes(
    "solicitacoes:consultar:global",
  );
  const podeAnalisarChefia = permissoes.includes(
    "solicitacoes:analisar:chefia",
  );
  const perfilAtivoServidor =
    session?.user.perfilAtivo?.codigo?.toUpperCase() === "SERVIDOR";
  const servidorFiltro = perfilAtivoServidor ? undefined : params.servidor;
  const competencia = normalizarCompetencia(params.competencia);
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);
  const filtros = {
    servidor: servidorFiltro,
    tipo: params.tipo,
    competencia,
    orgaoIdsPermitidos: escopoOrgao.global ? undefined : escopoOrgao.orgaoIds,
  };
  const paginacao = {
    pagina,
    itensPorPagina,
  };

  const resultado = session?.user
    ? podeConsultarGlobal
      ? await listarSolicitacoesGlobaisPaginado(filtros, paginacao)
      : podeAnalisarChefia
        ? await listarSolicitacoesParaChefiaPaginado(
            session.user.id,
            filtros,
            paginacao,
          )
        : await listarSolicitacoesDoUsuarioPaginado(
            session.user.id,
            filtros,
            paginacao,
          )
    : {
        solicitacoes: [],
        total: 0,
        pagina: 1,
        itensPorPagina,
        totalPaginas: 1,
      };
  const servidoresFiltro =
    session?.user && !perfilAtivoServidor
      ? podeConsultarGlobal
        ? await listarServidoresFiltroSolicitacoesGlobais({
            competencia,
            orgaoIdsPermitidos: escopoOrgao.global
              ? undefined
              : escopoOrgao.orgaoIds,
          })
        : podeAnalisarChefia
          ? await listarServidoresFiltroSolicitacoesParaChefia(
              session.user.id,
              { competencia },
            )
          : await listarServidoresFiltroSolicitacoesDoUsuario(session.user.id, {
              competencia,
            })
      : [];
  const baseParams = new URLSearchParams();

  if (params.tipo) {
    baseParams.set("tipo", params.tipo);
  }

  baseParams.set("competencia", competencia);

  if (servidorFiltro) {
    baseParams.set("servidor", servidorFiltro);
  }

  baseParams.set("itensPorPagina", String(resultado.itensPorPagina));

  function montarHrefPagina(novaPagina: number) {
    const query = new URLSearchParams(baseParams);
    query.set("pagina", String(novaPagina));
    return `/solicitacoes?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Solicitações" }]} />

      <PageHeader
        icon={ClipboardList}
        titulo="Solicitações"
        descricao="Solicite ajustes, compensações, justificativas, abonos, atividades externas, capacitações e viagens a serviço."
        artigo="Arts. 8, 9, 10, 13, 14 e 18"
        regraTitulo="Comunicação, autorização e correção de frequência"
        regraDescricao="As solicitações registram comunicações e pedidos que impactam a jornada, como ajuste de ponto, compensação, abono, atividade externa, capacitação e autorização prévia de horas."
        actions={
          <Link
            href="/solicitacoes/nova"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
          >
            <Plus className="size-4" aria-hidden="true" />
            Nova solicitação
          </Link>
        }
      />

      <SolicitacoesTable
        solicitacoes={resultado.solicitacoes}
        tipoSelecionado={params.tipo}
        competencia={competencia}
        servidorFiltro={servidorFiltro}
        servidoresFiltro={servidoresFiltro}
        mostrarFiltroServidor={!perfilAtivoServidor}
        usuarioIdAtual={session?.user.id}
        paginacao={{
          total: resultado.total,
          pagina: resultado.pagina,
          totalPaginas: resultado.totalPaginas,
          itensPorPagina: resultado.itensPorPagina,
          montarHrefPagina,
        }}
      />
    </div>
  );
}
