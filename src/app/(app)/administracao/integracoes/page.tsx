import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Cpu,
  Database,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { testarIntegracaoSeccionalAction } from "@/modules/integracoes/application/actions/testar-integracao-seccional.action";
import { obterConfiguracaoLdapActiveDirectory } from "@/modules/integracoes/application/services/ldap-active-directory-config.service";
import { ActiveDirectoryTestFields } from "@/modules/integracoes/presentation/components/active-directory-test-fields";
import { obterConfiguracaoSarhOracle } from "@/modules/integracoes/sarh/application/services/sarh-oracle-config.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

type AdministracaoIntegracoesPageProps = {
  searchParams?: Promise<{
    orgaoId?: string;
    teste?: string;
    tipoTeste?: string;
    erroTeste?: string;
  }>;
};

type StatusVisual = "ok" | "pendente" | "atencao";

function statusClasses(status: StatusVisual) {
  const classes: Record<StatusVisual, string> = {
    ok: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300",
    pendente:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
    atencao:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  };

  return classes[status];
}

function statusLabel(status: StatusVisual) {
  const labels: Record<StatusVisual, string> = {
    ok: "Pronto",
    pendente: "Pendente",
    atencao: "Atenção",
  };

  return labels[status];
}

function montarHref(path: string, orgaoId: string | null) {
  if (!orgaoId) return path;

  const query = new URLSearchParams({ orgaoId });
  return `${path}?${query.toString()}`;
}

function FluxoCard({
  indice,
  titulo,
  descricao,
  status,
  statusDescricao,
  icon: Icon,
  href,
  acao,
  detalhes,
  orgaoId,
  tipoTeste,
  camposTeste,
}: {
  indice: string;
  titulo: string;
  descricao: string;
  status: StatusVisual;
  statusDescricao: string;
  icon: typeof Database;
  href: string;
  acao: string;
  detalhes: string[];
  orgaoId: string | null;
  tipoTeste: "SARH" | "LDAP" | "EQUIPAMENTO_BIOMETRICO";
  camposTeste?: ReactNode;
}) {
  return (
    <article
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {indice}
          </span>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
            status,
          )}`}
        >
          {statusLabel(status)}
        </span>
      </div>

      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
        {statusDescricao}
      </div>

      <h2 className="mt-4 text-base font-semibold text-slate-950 dark:text-slate-50">
        {titulo}
      </h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {descricao}
      </p>

      <div className="mt-4 space-y-2">
        {detalhes.map((detalhe) => (
          <div
            key={detalhe}
            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
          >
            <CheckCircle2
              className="size-4 shrink-0 text-green-600 dark:text-green-400"
              aria-hidden="true"
            />
            <span>{detalhe}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-900">
        <Link
          href={href}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-3 py-2 font-semibold text-white hover:bg-blue-950"
        >
          {acao}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>

        <form
          action={testarIntegracaoSeccionalAction}
          className="flex flex-wrap items-end justify-end gap-2"
        >
          <input type="hidden" name="orgaoId" value={orgaoId ?? ""} />
          <input type="hidden" name="tipo" value={tipoTeste} />
          {camposTeste}
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 font-semibold hover:bg-[var(--muted)]"
          >
            <Activity className="size-4" aria-hidden="true" />
            Testar
          </button>
        </form>
      </div>
    </article>
  );
}

function Indicador({
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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {titulo}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">
            {valor}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 p-2 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {descricao}
      </p>
    </div>
  );
}

export default async function AdministracaoIntegracoesPage({
  searchParams,
}: AdministracaoIntegracoesPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "integracoes:consultar:global",
    "integracoes:gerenciar:global",
    "integracoes-sarh:consultar:global",
    "integracoes-sarh:configurar:global",
  ]);

  const params = searchParams ? await searchParams : {};
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaos = escopoOrgao.global
    ? await prisma.orgao.findMany({
        where: { ativo: true },
        select: { id: true, sigla: true, nome: true },
        orderBy: [{ sigla: "asc" }, { nome: "asc" }],
      })
    : escopoOrgao.orgaos;
  const orgaoSelecionado =
    orgaos.find((orgao) => orgao.id === params.orgaoId)?.id ??
    (orgaos[0]?.id ?? null);
  const orgaoAtual =
    orgaos.find((orgao) => orgao.id === orgaoSelecionado) ?? null;

  const [
    sarhConfig,
    ldapConfig,
    integracoes,
    equipamentos,
    ultimaExecucaoSarh,
  ] = await Promise.all([
    obterConfiguracaoSarhOracle(orgaoSelecionado),
    obterConfiguracaoLdapActiveDirectory(orgaoSelecionado),
    prisma.integracaoSistema.findMany({
      where: { orgaoId: orgaoSelecionado },
      orderBy: [{ tipo: "asc" }, { nome: "asc" }],
    }),
    prisma.equipamentoBiometrico.findMany({
      where: {
        unidade: orgaoSelecionado ? { orgaoId: orgaoSelecionado } : undefined,
      },
      select: {
        ativo: true,
        ultimoHeartbeatEm: true,
      },
    }),
    prisma.integracaoSarhExecucao.findFirst({
      where: {
        integracao: { orgaoId: orgaoSelecionado },
      },
      orderBy: { iniciadoEm: "desc" },
      select: { iniciadoEm: true, status: true },
    }),
  ]);

  const limiteOnline = new Date();
  limiteOnline.setMinutes(limiteOnline.getMinutes() - 5);
  const equipamentosAtivos = equipamentos.filter((item) => item.ativo);
  const equipamentosOnline = equipamentosAtivos.filter(
    (item) => item.ultimoHeartbeatEm && item.ultimoHeartbeatEm >= limiteOnline,
  );
  const integracaoSarh = integracoes.find((item) => item.tipo === "SARH");
  const integracaoLdap = integracoes.find((item) => item.tipo === "LDAP");
  const integracaoRelogios = integracoes.find(
    (item) => item.tipo === "EQUIPAMENTO_BIOMETRICO",
  );
  const sarhPronto =
    sarhConfig.ativo &&
    Boolean(sarhConfig.username && sarhConfig.password && sarhConfig.connectString);
  const ldapPronto =
    ldapConfig.ativo && Boolean(ldapConfig.authUrl || ldapConfig.ldapUrl);
  const relogiosProntos = equipamentosAtivos.length > 0;
  const pendencias = [
    !sarhPronto,
    !ldapPronto,
    !relogiosProntos,
    !integracaoRelogios,
  ].filter(Boolean).length;
  const sarhStatus: StatusVisual = integracaoSarh?.status === "ERRO"
    ? "atencao"
    : sarhPronto
      ? "ok"
      : "pendente";
  const ldapStatus: StatusVisual = integracaoLdap?.status === "ERRO"
    ? "atencao"
    : ldapPronto
      ? "ok"
      : "pendente";
  const relogiosStatus: StatusVisual = integracaoRelogios?.status === "ERRO"
    ? "atencao"
    : relogiosProntos
      ? "ok"
      : "pendente";
  const labelTipoTeste: Record<string, string> = {
    SARH: "Conexão Oracle SARH",
    LDAP: "Active Directory",
    EQUIPAMENTO_BIOMETRICO: "Relógios de ponto",
  };
  const mensagemTesteErro =
    params.erroTeste ||
    (params.tipoTeste === "SARH"
      ? integracaoSarh?.ultimoErro
      : params.tipoTeste === "LDAP"
        ? integracaoLdap?.ultimoErro
        : params.tipoTeste === "EQUIPAMENTO_BIOMETRICO"
          ? integracaoRelogios?.ultimoErro
          : null);
  const nomeTipoTeste = params.tipoTeste
    ? (labelTipoTeste[params.tipoTeste] ?? params.tipoTeste)
    : null;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Integrações por seccional" },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <PageHeader
          icon={SlidersHorizontal}
          titulo="Configuração por seccional"
          descricao="Centralize conexões, credenciais e execução operacional das integrações no escopo institucional correto."
          artigo="Governança operacional"
          regraTitulo="Escopo institucional"
          regraDescricao="Cada configuração fica vinculada ao órgão/seccional selecionado, preservando a separação entre SARH, Active Directory e relógios de ponto."
        />
      </section>

      {params.teste && (
        <section
          role="status"
          className={`rounded-lg border p-3 text-sm ${
            params.teste === "ok"
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
          }`}
        >
          {params.teste === "erro" && mensagemTesteErro && (
            <p className="mb-2 font-semibold">
              Falha no teste{nomeTipoTeste ? ` de ${nomeTipoTeste}` : ""}:{" "}
              {mensagemTesteErro}
            </p>
          )}
          <div className="flex items-center gap-2">
            {params.teste === "ok" ? (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            ) : (
              <AlertTriangle className="size-4" aria-hidden="true" />
            )}
            <span>
              {params.teste === "ok"
                ? "Teste concluído com sucesso. O status da integração foi atualizado."
                : "O teste encontrou uma falha. Veja o card correspondente para o status atualizado."}
            </span>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <form className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <label htmlFor="orgaoId" className="text-sm font-semibold">
              Seccional ativa
            </label>
            <select
              id="orgaoId"
              name="orgaoId"
              defaultValue={orgaoSelecionado ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            >
              {orgaos.map((orgao) => (
                <option key={orgao.id} value={orgao.id}>
                  {orgao.sigla} - {orgao.nome}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md bg-blue-900 px-5 text-sm font-semibold text-white transition hover:bg-blue-950"
          >
            Carregar seccional
          </button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Indicador
          titulo="Seccional"
          valor={orgaoAtual?.sigla ?? "-"}
          descricao={orgaoAtual?.nome ?? "Nenhum órgão disponível no escopo."}
          icon={Building2}
        />
        <Indicador
          titulo="Pendências"
          valor={pendencias}
          descricao="Itens de conexão ou cadastro ainda não prontos."
          icon={ShieldCheck}
        />
        <Indicador
          titulo="Relógios ativos"
          valor={equipamentosAtivos.length}
          descricao={`${equipamentosOnline.length} equipamento(s) online nos últimos 5 minutos.`}
          icon={Cpu}
        />
        <Indicador
          titulo="Última execução SARH"
          valor={ultimaExecucaoSarh?.status ?? "-"}
          descricao={
            ultimaExecucaoSarh
              ? new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(ultimaExecucaoSarh.iniciadoEm)
              : "Sem execução registrada para a seccional."
          }
          icon={RefreshCw}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <FluxoCard
          indice="01"
          titulo="Conexão Oracle SARH"
          descricao="Defina a origem oficial da carga cadastral e funcional da seccional."
          status={sarhStatus}
          statusDescricao={`${orgaoAtual?.sigla ?? "Seccional"} · ${
            sarhStatus === "ok"
              ? "operacional"
              : sarhStatus === "atencao"
                ? "precisa de atenção"
                : "pendente de configuração"
          }`}
          icon={Database}
          href={montarHref("/administracao/integracoes/sarh", orgaoSelecionado)}
          acao="Configurar SARH"
          detalhes={[
            `Seccional: ${orgaoAtual?.sigla ?? "-"}`,
            `Status: ${integracaoSarh?.status ?? "não configurada"}`,
            `Localidade: ${sarhConfig.siglaLocalidade ?? "-"}`,
            sarhConfig.connectString ? "String Oracle cadastrada" : "String Oracle pendente",
            integracaoSarh?.ultimoErro
              ? `Erro: ${integracaoSarh.ultimoErro}`
              : integracaoSarh?.ultimoSucessoEm
                ? `Último teste: ${new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(integracaoSarh.ultimoSucessoEm)}`
                : "Sem teste operacional",
          ]}
          orgaoId={orgaoSelecionado}
          tipoTeste="SARH"
        />

        <FluxoCard
          indice="02"
          titulo="Active Directory"
          descricao="Vincule a autenticação institucional usada pelos servidores da seccional."
          status={ldapStatus}
          statusDescricao={`${orgaoAtual?.sigla ?? "Seccional"} · ${
            ldapStatus === "ok"
              ? "operacional"
              : ldapStatus === "atencao"
                ? "precisa de atenção"
                : "pendente de configuração"
          }`}
          icon={KeyRound}
          href={montarHref("/administracao/integracoes/ldap", orgaoSelecionado)}
          acao="Configurar AD"
          detalhes={[
            `Seccional: ${orgaoAtual?.sigla ?? "-"}`,
            `Status: ${integracaoLdap?.status ?? "não configurada"}`,
            ldapConfig.modoAutenticacao === "LDAP_BIND"
              ? "Modo LDAP bind"
              : "Modo API HTTP",
            ldapConfig.authUrl || ldapConfig.ldapUrl
              ? "Destino cadastrado"
              : "Destino pendente",
            integracaoLdap?.ultimoErro
              ? `Erro: ${integracaoLdap.ultimoErro}`
              : integracaoLdap?.ultimoSucessoEm
                ? `Último teste: ${new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(integracaoLdap.ultimoSucessoEm)}`
                : "Sem teste operacional",
          ]}
          orgaoId={orgaoSelecionado}
          tipoTeste="LDAP"
          camposTeste={<ActiveDirectoryTestFields />}
        />

        <FluxoCard
          indice="03"
          titulo="Relógios de ponto"
          descricao="Cadastre os equipamentos vinculados às unidades da seccional."
          status={relogiosStatus}
          statusDescricao={`${orgaoAtual?.sigla ?? "Seccional"} · ${
            relogiosStatus === "ok"
              ? "operacional"
              : relogiosStatus === "atencao"
                ? "precisa de atenção"
                : "pendente de equipamento"
          }`}
          icon={Cpu}
          href={montarHref("/equipamentos", orgaoSelecionado)}
          acao="Gerenciar relógios"
          detalhes={[
            `Seccional: ${orgaoAtual?.sigla ?? "-"}`,
            `Integração: ${integracaoRelogios?.status ?? "criada ao salvar"}`,
            `${equipamentosAtivos.length} equipamento(s) ativo(s)`,
            `${equipamentosOnline.length} equipamento(s) online`,
            integracaoRelogios?.ultimoErro
              ? `Erro: ${integracaoRelogios.ultimoErro}`
              : integracaoRelogios?.ultimoSucessoEm
                ? `Último teste: ${new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(integracaoRelogios.ultimoSucessoEm)}`
                : "Sem teste operacional",
          ]}
          orgaoId={orgaoSelecionado}
          tipoTeste="EQUIPAMENTO_BIOMETRICO"
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">
              Execução operacional
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              A sincronização SARH e as operações dos relógios usam apenas as
              configurações vinculadas à seccional ativa.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={montarHref(
                "/administracao/integracoes/sarh",
                orgaoSelecionado,
              )}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Executar SARH
            </Link>
            <Link
              href={montarHref("/equipamentos", orgaoSelecionado)}
              className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)]"
            >
              <Activity className="size-4" aria-hidden="true" />
              Operações dos relógios
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
