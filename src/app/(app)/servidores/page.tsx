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
  listarCategoriasPessoasAtivas,
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
    categoriaPessoaId?: string;
    orgaoId?: string;
    vinculo?: string;
    lotacao?: string;
    status?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

type TipoPessoaPonto = "SERVIDOR" | "ESTAGIARIO" | "PRESTADOR" | "VOLUNTARIO";
type TipoPessoaContexto = TipoPessoaPonto | "TODOS";

const CONTEXTOS_PESSOA: Record<
  TipoPessoaContexto,
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
  TODOS: {
    hrefBase: "/servidores",
    breadcrumb: "Pessoas",
    eyebrow: "Cadastro unificado",
    titulo: "Pessoas",
    descricao:
      "Gerencie pessoas, categorias, vínculos funcionais, usuários relacionados e lotações em unidades organizacionais.",
    regraTitulo: "Pessoa, categoria, jornada e frequência",
    regraDescricao:
      "O cadastro unificado sustenta a jornada, a apuração mensal, o banco de horas, a homologação pela chefia e a coleta pelos identificadores de ponto.",
    novoLabel: "Nova pessoa",
    tabelaTitulo: "Pessoas cadastradas",
    colunaPessoa: "Pessoa",
  },
  SERVIDOR: {
    hrefBase: "/servidores",
    breadcrumb: "Servidores",
    eyebrow: "Cadastro de servidores",
    titulo: "Servidores",
    descricao:
      "Gerencie servidores, vínculos funcionais, usuários relacionados e lotações em unidades organizacionais.",
    regraTitulo: "Servidor, categoria, jornada e frequência",
    regraDescricao:
      "O cadastro unificado sustenta a jornada, a apuração mensal, o banco de horas, a homologação pela chefia e a coleta pelos identificadores de ponto.",
    novoLabel: "Novo servidor",
    tabelaTitulo: "Servidores cadastrados",
    colunaPessoa: "Servidor",
  },
  ESTAGIARIO: {
    hrefBase: "/estagiarios",
    breadcrumb: "Estagiários",
    eyebrow: "Cadastro de estagiários",
    titulo: "Estagiários",
    descricao:
      "Gerencie estagiários controlados pelo ponto, com lotação, jornada e usuário de acesso por seccional.",
    regraTitulo: "Estágio, jornada e frequência",
    regraDescricao:
      "Estagiários podem registrar ponto e compor espelhos e homologação; regras de banco de horas e créditos devem ser habilitadas apenas quando houver norma aplicável.",
    novoLabel: "Novo estagiário",
    tabelaTitulo: "Estagiários cadastrados",
    colunaPessoa: "Estagiário",
  },
  PRESTADOR: {
    hrefBase: "/prestadores",
    breadcrumb: "Prestadores",
    eyebrow: "Cadastro de prestadores",
    titulo: "Prestadores",
    descricao:
      "Gerencie prestadores controlados pelo ponto, respeitando a seccional e a unidade de atuação.",
    regraTitulo: "Prestador, jornada e frequência",
    regraDescricao:
      "Prestadores podem ser acompanhados no ponto; regras de créditos, débitos e horas extras devem permanecer condicionadas a autorização normativa.",
    novoLabel: "Novo prestador",
    tabelaTitulo: "Prestadores cadastrados",
    colunaPessoa: "Prestador",
  },
  VOLUNTARIO: {
    hrefBase: "/voluntarios",
    breadcrumb: "Voluntários",
    eyebrow: "Cadastro de voluntários",
    titulo: "Voluntários",
    descricao:
      "Gerencie voluntários controlados pelo ponto, com vínculo operacional por seccional.",
    regraTitulo: "Voluntário, jornada e frequência",
    regraDescricao:
      "Voluntários podem registrar ponto e ter frequência acompanhada; aplicação de banco de horas e créditos deve ser explicitamente autorizada.",
    novoLabel: "Novo voluntário",
    tabelaTitulo: "Voluntários cadastrados",
    colunaPessoa: "Voluntário",
  },
};

function normalizarTipoUsuario(valor?: string | null): TipoPessoaPonto | "" {
  return valor === "ESTAGIARIO" ||
    valor === "SERVIDOR" ||
    valor === "PRESTADOR" ||
    valor === "VOLUNTARIO"
    ? valor
    : "";
}

function obterContextoPessoa(tipoUsuario: TipoPessoaPonto | "") {
  return CONTEXTOS_PESSOA[tipoUsuario || "TODOS"];
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
  const statusFiltro = "ativo";
  const filtrosEscopados = aplicarEscopoOrgaoId(
    {
      busca: params.busca ?? "",
      matricula: params.matricula ?? "",
      cpf: params.cpf ?? "",
      pis: params.pis ?? "",
      nome: params.nome ?? "",
      tipoUsuario: tipoUsuario || "",
      orgaoId: params.orgaoId ?? "",
      vinculo: params.vinculo ?? "",
      lotacao: params.lotacao ?? "",
      categoriaPessoaId: params.categoriaPessoaId ?? "",
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
  const [orgaos, categorias, resultado, servidoresFiltro, lotacoesFiltro] =
    await Promise.all([
      listarOrgaosAtivos(aplicarEscopoOrgaoId({ orgaoId: "" }, escopoOrgao)),
      listarCategoriasPessoasAtivas({ orgaoIdsPermitidos }),
      listarServidoresPaginado(filtrosEscopados),
      listarServidoresParaFiltro({
        orgaoIdsPermitidos,
        servidorIdsPermitidos: servidorIdsPermitidosChefia,
        semLimite: true,
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
      searchText: `${servidor.matricula} ${nome} ${lotacao?.sigla ?? ""} ${
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
    "categoriaPessoaId",
    "orgaoId",
    "vinculo",
    "lotacao",
    "status",
  ] as const) {
    if (chave === "status") {
      exportParams.set(chave, statusFiltro);
    } else if (chave === "tipoUsuario") {
      if (tipoUsuario) {
        exportParams.set(chave, tipoUsuario);
      }
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
            categorias={categorias.map((categoria) => ({
              value: categoria.id,
              label: categoria.nome,
              searchText: categoria.codigo,
            }))}
            tipoUsuarioFixo={tipoUsuario || undefined}
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
          <table className="w-full min-w-[1040px] text-left text-sm">
            <caption className="sr-only">
              Listagem de pessoas ativas com matrícula, CPF, PIS/PASEP, nome,
              órgão, lotação atual, contadores e ações.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Matrícula</th>
                <th className="px-5 py-3">CPF / PIS/PASEP</th>
                <th className="px-5 py-3">Categoria</th>
                <th className="px-5 py-3">{contextoPessoa.colunaPessoa}</th>
                <th className="px-5 py-3">Órgão</th>
                <th className="px-5 py-3">Lotação atual</th>
                <th className="px-5 py-3">Lotações</th>
                <th className="px-5 py-3">Gestores</th>
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
                      <div>{servidor.cpf ?? servidor.usuario.cpf ?? "-"}</div>
                      <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                        {servidor.pis
                          ? `PIS/PASEP ${servidor.pis}`
                          : "PIS/PASEP -"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {servidor.categoriaPessoa?.nome ?? "-"}
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
                    <td className="px-5 py-4">
                      {lotacaoAtual ? lotacaoAtual.unidade.sigla : "-"}
                    </td>
                    <td className="px-5 py-4">{servidor._count.lotacoes}</td>
                    <td className="px-5 py-4">{servidor._count.gestores}</td>
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
                    colSpan={9}
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
