import Link from "next/link";
import Image from "next/image";
import { Plus, Users, Eye } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiAlgumaPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS } from "@/modules/auth/domain/constants/perfis-sistema";
import { perfilAtivoEhChefia } from "@/modules/auth/application/services/perfil-chefia.service";
import {
  buscarServidorComUsuarioPorUsuarioId,
  listarServidoresParaEspelhoPonto,
} from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";
import {
  aplicarEscopoOrgaoId,
  obterEscopoOrgaoDaSessao,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import {
  buscarFotosServidoresDataUrl,
  normalizarCpfFoto,
} from "@/modules/servidores/application/services/foto-servidor.service";
import {
  descricaoCargoServidor,
  descricaoFuncaoServidor,
} from "@/modules/servidores/application/services/funcao-cargo-servidor.service";
import { listarOrgaosAtivos } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";
import {
  listarLotacoesAtivasParaFiltro,
  listarServidoresParaFiltro,
  listarServidoresPaginado,
} from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { ServidoresListagemControles } from "@/modules/servidores/presentation/components/servidores-listagem-controles";

type ServidoresPageProps = {
  searchParams?: Promise<{
    busca?: string;
    matricula?: string;
    cpf?: string;
    pis?: string;
    nome?: string;
    tipoUsuario?: string;
    orgaoId?: string;
    vinculo?: string;
    lotacao?: string;
    status?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

type TipoPessoaPonto = "SERVIDOR" | "ESTAGIARIO" | "PRESTADOR" | "VOLUNTARIO";

const CONTEXTOS_PESSOA: Record<
  TipoPessoaPonto,
  {
    hrefBase: string;
    breadcrumb: string;
    eyebrow: string;
    titulo: string;
    descricao: string;
    regraTitulo: string;
    regraDescricao: string;
    novoLabel: string;
    tabelaTitulo: string;
    colunaPessoa: string;
  }
> = {
  SERVIDOR: {
    hrefBase: "/servidores",
    breadcrumb: "Servidores",
    eyebrow: "Cadastro funcional",
    titulo: "Servidores",
    descricao:
      "Gerencie servidores, vinculos funcionais, usuarios relacionados e lotacoes em unidades organizacionais.",
    regraTitulo: "Servidor, jornada, frequencia e consulta",
    regraDescricao:
      "O cadastro funcional sustenta a jornada, a apuracao mensal, o banco de horas, a homologacao pela chefia e a consulta da propria frequencia pelo servidor.",
    novoLabel: "Novo servidor",
    tabelaTitulo: "Servidores cadastrados",
    colunaPessoa: "Servidor",
  },
  ESTAGIARIO: {
    hrefBase: "/estagiarios",
    breadcrumb: "Estagiarios",
    eyebrow: "Cadastro de estagiarios",
    titulo: "Estagiarios",
    descricao:
      "Gerencie estagiarios controlados pelo ponto, com lotacao, jornada e usuario de acesso por seccional.",
    regraTitulo: "Estagio, jornada e frequencia",
    regraDescricao:
      "Estagiarios podem registrar ponto e compor espelhos e homologacao; regras de banco de horas e creditos devem ser habilitadas apenas quando houver norma aplicavel.",
    novoLabel: "Novo estagiario",
    tabelaTitulo: "Estagiarios cadastrados",
    colunaPessoa: "Estagiario",
  },
  PRESTADOR: {
    hrefBase: "/prestadores",
    breadcrumb: "Prestadores",
    eyebrow: "Cadastro de prestadores",
    titulo: "Prestadores",
    descricao:
      "Gerencie prestadores controlados pelo ponto, respeitando a seccional e a unidade de atuacao.",
    regraTitulo: "Prestador, jornada e frequencia",
    regraDescricao:
      "Prestadores podem ser acompanhados no ponto; regras de creditos, debitos e horas extras devem permanecer condicionadas a autorizacao normativa.",
    novoLabel: "Novo prestador",
    tabelaTitulo: "Prestadores cadastrados",
    colunaPessoa: "Prestador",
  },
  VOLUNTARIO: {
    hrefBase: "/voluntarios",
    breadcrumb: "Voluntarios",
    eyebrow: "Cadastro de voluntarios",
    titulo: "Voluntarios",
    descricao:
      "Gerencie voluntarios controlados pelo ponto, com vinculo operacional por seccional.",
    regraTitulo: "Voluntario, jornada e frequencia",
    regraDescricao:
      "Voluntarios podem registrar ponto e ter frequencia acompanhada; aplicacao de banco de horas e creditos deve ser explicitamente autorizada.",
    novoLabel: "Novo voluntario",
    tabelaTitulo: "Voluntarios cadastrados",
    colunaPessoa: "Voluntario",
  },
};

function normalizarTipoUsuario(valor?: string | null): TipoPessoaPonto {
  return valor === "ESTAGIARIO" ||
    valor === "PRESTADOR" ||
    valor === "VOLUNTARIO"
    ? valor
    : "SERVIDOR";
}

function obterContextoPessoa(tipoUsuario: TipoPessoaPonto) {
  return CONTEXTOS_PESSOA[tipoUsuario];
}

export default async function ServidoresPage({
  searchParams,
}: ServidoresPageProps) {
  const permissoesSessao = await exigirUmaDasPermissoesOuRedirecionar([
    "servidores:gerenciar:global",
    "servidores:consultar:global",
    "servidores:gerenciar:seccional",
    "servidores:consultar:seccional",
    "homologacao:gerenciar:chefia",
    "minha-equipe:consultar:chefia",
    ...PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS,
  ]);
  const podeGerenciarServidor = usuarioPossuiAlgumaPermissaoNoPerfil(
    permissoesSessao.perfilAtivoCodigo,
    permissoesSessao.permissoes,
    ["servidores:gerenciar:global", "servidores:gerenciar:seccional"],
  );
  const podeExportarServidores = usuarioPossuiAlgumaPermissaoNoPerfil(
    permissoesSessao.perfilAtivoCodigo,
    permissoesSessao.permissoes,
    [
      "servidores:gerenciar:global",
      "servidores:consultar:global",
      "servidores:gerenciar:seccional",
      "servidores:consultar:seccional",
    ],
  );

  const params = searchParams ? await searchParams : {};
  const tipoUsuario = normalizarTipoUsuario(params.tipoUsuario);
  const contextoPessoa = obterContextoPessoa(tipoUsuario);
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const perfilChefiaAtivo = perfilAtivoEhChefia({
    perfilAtivoCodigo: permissoesSessao.perfilAtivoCodigo,
    permissoes: permissoesSessao.permissoes,
  });
  const servidoresChefia = perfilChefiaAtivo
    ? await listarServidoresParaEspelhoPonto({
        usuarioId: permissoesSessao.usuarioId,
        escopo: "chefia",
      })
    : [];
  const servidorProprio = perfilChefiaAtivo
    ? await buscarServidorComUsuarioPorUsuarioId(
        permissoesSessao.usuarioId ?? "",
      )
    : null;
  const servidorIdsPermitidosChefia = perfilChefiaAtivo
    ? Array.from(
        new Set([
          ...(servidorProprio ? [servidorProprio.id] : []),
          ...servidoresChefia.map((servidor) => servidor.id),
        ]),
      )
    : undefined;
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);
  const statusFiltro =
    tipoUsuario === "SERVIDOR" ? (params.status ?? "ativo") : "ativo";
  const filtrosEscopados = aplicarEscopoOrgaoId(
    {
      busca: params.busca ?? "",
      matricula: params.matricula ?? "",
      cpf: params.cpf ?? "",
      pis: params.pis ?? "",
      nome: params.nome ?? "",
      tipoUsuario,
      orgaoId: params.orgaoId ?? "",
      vinculo: params.vinculo ?? "",
      lotacao: params.lotacao ?? "",
      status: statusFiltro,
      servidorIdsPermitidos: servidorIdsPermitidosChefia,
      pagina,
      itensPorPagina,
    },
    escopoOrgao,
  );

  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds;
  const [orgaos, resultado, servidoresFiltro, lotacoesFiltro] =
    await Promise.all([
      listarOrgaosAtivos(aplicarEscopoOrgaoId({ orgaoId: "" }, escopoOrgao)),
      listarServidoresPaginado(filtrosEscopados),
      listarServidoresParaFiltro({
        orgaoIdsPermitidos,
        servidorIdsPermitidos: servidorIdsPermitidosChefia,
        tipoUsuario,
      }),
      listarLotacoesAtivasParaFiltro({
        orgaoIdsPermitidos,
        servidorIdsPermitidos: servidorIdsPermitidosChefia,
        tipoUsuario,
      }),
    ]);
  const servidoresOptions = servidoresFiltro.map((servidor) => {
    const nome = nomeServidor(servidor) || servidor.matricula;
    const lotacao = servidor.lotacoes[0]?.unidade;

    return {
      value: nome,
      label: `${nome} (${servidor.matricula})`,
      searchText: `${servidor.matricula} ${lotacao?.sigla ?? ""} ${
        lotacao?.nome ?? ""
      }`,
    };
  });
  const lotacoesOptions = lotacoesFiltro.map((lotacao) => ({
    value: lotacao.sigla,
    label: `${lotacao.sigla} - ${lotacao.nome}`,
    searchText: lotacao.nome,
  }));
  const fotosServidores = await buscarFotosServidoresDataUrl(
    resultado.servidores.map(
      (servidor) => servidor.cpf ?? servidor.usuario.cpf,
    ),
  );

  const exportParams = new URLSearchParams();

  for (const chave of [
    "busca",
    "matricula",
    "cpf",
    "pis",
    "nome",
    "tipoUsuario",
    "orgaoId",
    "vinculo",
    "lotacao",
    "status",
  ] as const) {
    if (chave === "status") {
      exportParams.set(chave, statusFiltro);
    } else if (chave === "tipoUsuario") {
      exportParams.set(chave, tipoUsuario);
    } else if (params[chave]) {
      exportParams.set(chave, params[chave]!);
    }
  }

  const baseParams = new URLSearchParams(exportParams);
  baseParams.set("itensPorPagina", String(resultado.itensPorPagina));

  function montarHrefPagina(novaPagina: number) {
    const query = new URLSearchParams(baseParams);
    query.set("pagina", String(novaPagina));
    return `${contextoPessoa.hrefBase}?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: contextoPessoa.breadcrumb },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            {contextoPessoa.eyebrow}
          </p>

          <PageHeader
            icon={Users}
            titulo={contextoPessoa.titulo}
            descricao={contextoPessoa.descricao}
            artigo="Arts. 4, 8, 16 e 19"
            regraTitulo={contextoPessoa.regraTitulo}
            regraDescricao={contextoPessoa.regraDescricao}
          />
        </div>

        {podeGerenciarServidor && (
          <Link
            href={`/servidores/novo?${new URLSearchParams({
              tipoUsuario,
            }).toString()}`}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus className="size-4" aria-hidden="true" />
            {contextoPessoa.novoLabel}
          </Link>
        )}
      </section>

      <DataTableShell
        title={contextoPessoa.tabelaTitulo}
        description="Use a pesquisa geral ou filtre diretamente pelas colunas da tabela."
        total={resultado.total}
        pagina={resultado.pagina}
        totalPaginas={resultado.totalPaginas}
        itensPorPagina={resultado.itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={
          <ServidoresListagemControles
            orgaos={orgaos}
            servidores={servidoresOptions}
            lotacoes={lotacoesOptions}
            tipoUsuarioFixo={tipoUsuario}
            exportCsvHref={
              podeExportarServidores
                ? `/api/servidores/export?${exportParams.toString()}`
                : undefined
            }
            exportPdfHref={
              podeExportarServidores
                ? `/api/servidores/export/pdf?${exportParams.toString()}`
                : undefined
            }
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <caption className="sr-only">
              Listagem de pessoas com matrícula, CPF, nome, órgão, vínculo,
              lotação atual, contadores, status e ações.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Matrícula</th>
                <th className="px-5 py-3">CPF</th>
                <th className="px-5 py-3">PIS/PASEP</th>
                <th className="px-5 py-3">{contextoPessoa.colunaPessoa}</th>
                <th className="px-5 py-3">Órgão</th>
                <th className="px-5 py-3">Vínculo</th>
                <th className="px-5 py-3">Lotação atual</th>
                <th className="px-5 py-3">Lotações</th>
                <th className="px-5 py-3">Gestores</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {resultado.servidores.map((servidor) => {
                const lotacaoAtual = servidor.lotacoes[0];
                const fotoCpf = servidor.cpf ?? servidor.usuario.cpf;
                const fotoSrc = fotoCpf
                  ? fotosServidores.get(normalizarCpfFoto(fotoCpf) ?? "")
                  : null;
                const cargo = descricaoCargoServidor(servidor);
                const funcao = descricaoFuncaoServidor(servidor);

                return (
                  <tr key={servidor.id} className="border-b last:border-b-0">
                    <td className="px-5 py-4 font-mono text-xs font-semibold">
                      {servidor.matricula}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {servidor.cpf ?? servidor.usuario.cpf ?? "-"}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {servidor.pis ?? "-"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {fotoSrc ? (
                          <Image
                            src={fotoSrc}
                            alt=""
                            width={64}
                            height={64}
                            unoptimized
                            className="size-16 rounded-full border-2 border-white bg-slate-100 object-cover shadow-sm ring-2 ring-blue-100 dark:border-slate-950 dark:bg-slate-800 dark:ring-blue-900/60"
                          />
                        ) : (
                          <span className="flex size-16 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-sm font-bold text-slate-600 shadow-sm ring-2 ring-blue-100 dark:border-slate-950 dark:bg-slate-800 dark:text-slate-300 dark:ring-blue-900/60">
                            {servidor.matricula.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold">
                            {nomeServidor(servidor)}
                          </div>
                          {cargo && (
                            <div className="mt-1 max-w-72 truncate text-xs text-[var(--muted-foreground)]">
                              {cargo}
                            </div>
                          )}
                          {funcao && (
                            <div className="mt-1 max-w-72 truncate text-xs font-semibold text-blue-900 dark:text-blue-300">
                              {funcao}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">{servidor.orgao.sigla}</td>
                    <td className="px-5 py-4 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                      <div>{servidor.vinculo}</div>
                      {servidor.descricaoProvimentoSarh && (
                        <div className="mt-1 max-w-32 truncate text-[10px] normal-case text-[var(--muted-foreground)]">
                          {servidor.descricaoProvimentoSarh}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {lotacaoAtual ? lotacaoAtual.unidade.sigla : "-"}
                    </td>
                    <td className="px-5 py-4">{servidor._count.lotacoes}</td>
                    <td className="px-5 py-4">{servidor._count.gestores}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          servidor.ativo
                            ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {servidor.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/servidores/${servidor.id}`}
                        className="inline-flex items-center justify-end gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-blue-900 transition hover:bg-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-blue-300"
                      >
                        <Eye className="size-4" aria-hidden="true" />
                        Detalhar
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {resultado.servidores.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum registro encontrado para os filtros informados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}
