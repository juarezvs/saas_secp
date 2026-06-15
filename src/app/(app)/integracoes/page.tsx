import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Cable,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Fingerprint,
  FileText,
  KeyRound,
  Network,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell } from "@/components/listagens";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { listarIntegracoesSistemaPaginado } from "@/modules/integracoes/infrastructure/repositories/integracoes.repository";
import { IntegracoesListagemControles } from "@/modules/integracoes/presentation/components/integracoes-listagem-controles";

type StatusVisual = "disponivel" | "planejado" | "atencao" | "inativo";

type IntegracoesPageProps = {
  searchParams?: Promise<{
    busca?: string;
    tipo?: string;
    status?: string;
    direcao?: string;
    ativo?: string;
    pagina?: string;
    itensPorPagina?: string;
  }>;
};

function formatarData(data: Date | string | null | undefined) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

function obterBadgeStatus(status: StatusVisual) {
  const classes: Record<StatusVisual, string> = {
    disponivel:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300",
    planejado:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
    atencao:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    inativo:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  };

  const labels: Record<StatusVisual, string> = {
    disponivel: "Disponível",
    planejado: "Planejado",
    atencao: "Atenção",
    inativo: "Inativo",
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${classes[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function StatusResumoCard({
  titulo,
  valor,
  descricao,
  icon: Icon,
}: {
  titulo: string;
  valor: string | number;
  descricao: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {titulo}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">
            {valor}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 p-2 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {descricao}
      </p>
    </div>
  );
}

function IntegracaoCard({
  titulo,
  descricao,
  href,
  status,
  icon: Icon,
  detalhes,
}: {
  titulo: string;
  descricao: string;
  href?: string;
  status: StatusVisual;
  icon: typeof Activity;
  detalhes: string[];
}) {
  const conteudo = (
    <div className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-800">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-xl bg-blue-50 p-3 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        {obterBadgeStatus(status)}
      </div>

      <div className="mt-4 flex-1">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
          {titulo}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {descricao}
        </p>

        <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          {detalhes.map((detalhe) => (
            <li key={detalhe} className="flex gap-2">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400"
                aria-hidden="true"
              />
              <span>{detalhe}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm dark:border-slate-900">
        <span
          className={
            href
              ? "font-medium text-blue-700 dark:text-blue-300"
              : "text-slate-400"
          }
        >
          {href ? "Acessar integracao" : "Aguardando implementacao"}
        </span>
        {href ? (
          <ArrowRight
            className="h-4 w-4 text-blue-700 transition group-hover:translate-x-0.5 dark:text-blue-300"
            aria-hidden="true"
          />
        ) : (
          <Clock3 className="h-4 w-4 text-slate-400" aria-hidden="true" />
        )}
      </div>
    </div>
  );

  if (!href) return conteudo;

  return (
    <Link href={href} className="block h-full" aria-label={`Acessar ${titulo}`}>
      {conteudo}
    </Link>
  );
}

export default async function IntegracoesPage({
  searchParams,
}: IntegracoesPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "integracoes:consultar:global",
    "integracoes:gerenciar:global",
  ]);

  const params = searchParams ? await searchParams : {};
  const pagina = Number(params.pagina ?? 1);
  const itensPorPagina = Number(params.itensPorPagina ?? 10);

  const [
    resultado,
    integracoesResumo,
    ultimaExecucaoSarh,
    conflitosPendentesSarh,
    itensComErroSarh,
  ] = await Promise.all([
    listarIntegracoesSistemaPaginado({
      busca: params.busca ?? "",
      tipo: params.tipo ?? "",
      status: params.status ?? "",
      direcao: params.direcao ?? "",
      ativo: params.ativo ?? "",
      pagina,
      itensPorPagina,
    }),
    prisma.integracaoSistema.findMany({
      orderBy: [{ tipo: "asc" }, { nome: "asc" }],
    }),
    prisma.integracaoSarhExecucao.findFirst({
      orderBy: { iniciadoEm: "desc" },
    }),
    prisma.integracaoSarhConflito.count({
      where: { status: "PENDENTE" },
    }),
    prisma.integracaoSarhItem.count({
      where: { status: "ERRO" },
    }),
  ]);

  const sarh = integracoesResumo.find((integracao) => integracao.tipo === "SARH");
  const integracoesAtivas = integracoesResumo.filter(
    (integracao) => integracao.ativo,
  ).length;
  const integracoesComErro = integracoesResumo.filter(
    (integracao) => integracao.status === "ERRO",
  ).length;

  const statusSarh: StatusVisual = !sarh
    ? "atencao"
    : sarh.status === "ATIVA"
      ? "disponivel"
      : sarh.status === "ERRO"
        ? "atencao"
        : "inativo";

  const exportParams = new URLSearchParams();

  for (const chave of ["busca", "tipo", "status", "direcao", "ativo"] as const) {
    if (params[chave]) {
      exportParams.set(chave, params[chave]!);
    }
  }

  const baseParams = new URLSearchParams(exportParams);
  baseParams.set("itensPorPagina", String(resultado.itensPorPagina));

  function montarHrefPagina(novaPagina: number) {
    const query = new URLSearchParams(baseParams);
    query.set("pagina", String(novaPagina));
    return `/integracoes?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Integrações" },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Administração
          </p>

          <PageHeader
            icon={Cable}
            titulo="Integrações do SECP"
            descricao="Acompanhe fontes externas, sincronizações, disponibilidade, conflitos, erros operacionais e evolução dos conectores do sistema."
            artigo="Governança operacional"
            regraTitulo="Integrações institucionais"
            regraDescricao="As integracoes apoiam o controle eletrônico de frequência, a conferência cadastral, a rastreabilidade das sincronizações e a governança operacional do SECP."
          />
        </div>

        <Link
          href="/administracao/integracoes/sarh"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Sincronizar SARH
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusResumoCard
          titulo="Integrações cadastradas"
          valor={integracoesResumo.length}
          descricao="Total de integracoes registradas em Administração."
          icon={Network}
        />
        <StatusResumoCard
          titulo="Integrações ativas"
          valor={integracoesAtivas}
          descricao="Conectores habilitados para uso operacional."
          icon={Activity}
        />
        <StatusResumoCard
          titulo="Conflitos SARH"
          valor={conflitosPendentesSarh}
          descricao="Pendências que exigem decisao administrativa."
          icon={AlertTriangle}
        />
        <StatusResumoCard
          titulo="Itens SARH com erro"
          valor={itensComErroSarh}
          descricao="Registros que precisam de análise ou reprocessamento."
          icon={DatabaseZap}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-4">
        <IntegracaoCard
          titulo="SARH"
          descricao="Integração com o Sistema de Gestão de Recursos Humanos para carga e sincronização de órgãos, lotações, cargos, servidores e vínculos."
          href="/administracao/integracoes/sarh"
          status={statusSarh}
          icon={UsersRound}
          detalhes={[
            `Status: ${sarh?.status ?? "não configurada"}`,
            `Ultima execucao: ${formatarData(ultimaExecucaoSarh?.iniciadoEm)}`,
            `Base URL: ${sarh?.baseUrl ?? "SARH_BASE_URL pendente"}`,
          ]}
        />

        <IntegracaoCard
          titulo="SEI"
          descricao="Conector previsto para documentos, boletins de frequência e processos administrativos relacionados ao ponto."
          status="planejado"
          icon={FileText}
          detalhes={[
            "Futura vinculacao de boletins",
            "Consulta de processos administrativos",
            "Registro de referencias documentais",
          ]}
        />

        <IntegracaoCard
          titulo="Equipamentos biométricos"
          descricao="Integração com relógios, totens e dispositivos biométricos para ingestão de marcações e eventos operacionais."
          href="/equipamentos"
          status="disponivel"
          icon={Fingerprint}
          detalhes={[
            "Cadastro de equipamentos",
            "Vínculo por código ou número de série",
            "Associacao automatica na importação AFD",
          ]}
        />

        <IntegracaoCard
          titulo="LDAP / Active Directory"
          descricao="Integração com a rede Windows institucional para autenticação, identificação por matrícula e grupos administrativos."
          status="planejado"
          icon={KeyRound}
          detalhes={[
            "Login com matrícula e senha de rede",
            "Mapeamento de grupos para perfis",
            "Suporte futuro a multiplos provedores",
          ]}
        />
      </section>

      <DataTableShell
        title="Integrações registradas"
        description="Visão técnica dos conectores cadastrados na tabela de integracoes do SECP."
        total={resultado.total}
        pagina={resultado.pagina}
        totalPaginas={resultado.totalPaginas}
        itensPorPagina={resultado.itensPorPagina}
        montarHrefPagina={montarHrefPagina}
        toolbar={
          <IntegracoesListagemControles
            exportCsvHref={`/api/integracoes/export?${exportParams.toString()}`}
            exportPdfHref={`/api/integracoes/export/pdf?${exportParams.toString()}`}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <caption className="sr-only">
              Listagem de integracoes com nome, tipo, status, direção, ativo,
              último sucesso, último erro e contadores.
            </caption>
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Direção</th>
                <th className="px-5 py-3">Ativa</th>
                <th className="px-5 py-3">Logs</th>
                <th className="px-5 py-3">Equip.</th>
                <th className="px-5 py-3">Último sucesso</th>
                <th className="px-5 py-3">Último erro</th>
              </tr>
            </thead>
            <tbody>
              {resultado.integracoes.map((integracao) => (
                <tr key={integracao.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-semibold">
                    {integracao.nome}
                  </td>
                  <td className="px-5 py-4">{integracao.tipo}</td>
                  <td className="px-5 py-4">{integracao.status}</td>
                  <td className="px-5 py-4">{integracao.direcao}</td>
                  <td className="px-5 py-4">
                    {integracao.ativo ? "Sim" : "Não"}
                  </td>
                  <td className="px-5 py-4">{integracao._count.logs}</td>
                  <td className="px-5 py-4">
                    {integracao._count.equipamentos}
                  </td>
                  <td className="px-5 py-4">
                    {formatarData(integracao.ultimoSucessoEm)}
                  </td>
                  <td className="px-5 py-4">
                    {integracao.ultimoErro ? (
                      <span
                        className="line-clamp-1 max-w-[260px]"
                        title={integracao.ultimoErro}
                      >
                        {integracao.ultimoErro}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}

              {resultado.integracoes.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhuma integracao encontrada para os filtros informados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>

      {integracoesComErro > 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Existem {integracoesComErro} integracao(oes) com status de erro.
          Verifique os logs antes de executar novas sincronizações.
        </section>
      ) : null}
    </div>
  );
}
