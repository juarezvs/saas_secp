import { KeyRound } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { atualizarLdapActiveDirectoryAction } from "@/modules/integracoes/application/actions/atualizar-ldap-active-directory.action";
import { obterConfiguracaoLdapActiveDirectory } from "@/modules/integracoes/application/services/ldap-active-directory-config.service";
import { LdapActiveDirectoryForm } from "@/modules/integracoes/presentation/components/ldap-active-directory-form";
import { prisma } from "@/shared/infrastructure/database/prisma";

type IntegracaoLdapActiveDirectoryPageProps = {
  searchParams?: Promise<{
    orgaoId?: string;
  }>;
};

export default async function IntegracaoLdapActiveDirectoryPage({
  searchParams,
}: IntegracaoLdapActiveDirectoryPageProps) {
  await exigirPermissaoOuRedirecionar("integracoes:gerenciar:global");

  const params = searchParams ? await searchParams : {};
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaos = escopoOrgao.global
    ? await prisma.orgao.findMany({
        where: { ativo: true },
        select: {
          id: true,
          sigla: true,
          nome: true,
        },
        orderBy: [{ sigla: "asc" }, { nome: "asc" }],
      })
    : escopoOrgao.orgaos;
  const orgaoSelecionado = orgaos.some((orgao) => orgao.id === params.orgaoId)
    ? params.orgaoId
    : escopoOrgao.global
      ? null
      : (orgaos[0]?.id ?? null);
  const configuracao =
    await obterConfiguracaoLdapActiveDirectory(orgaoSelecionado);
  const integracoesHref = orgaoSelecionado
    ? `/administracao/integracoes?${new URLSearchParams({
        orgaoId: orgaoSelecionado,
      }).toString()}`
    : "/administracao/integracoes";

  return (
    <main className="space-y-6 p-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Integrações por seccional", href: integracoesHref },
          { label: "LDAP / Active Directory" },
        ]}
      />

      <PageHeader
        icon={KeyRound}
        titulo="LDAP / Active Directory"
        descricao="Configure a origem externa usada pelo login institucional do SECP para validar matrícula e senha de rede."
        artigo="Autenticação institucional"
        regraTitulo="Login integrado"
        regraDescricao="A autenticação externa é usada antes da senha local. Se a integração estiver inativa ou indisponível, o SECP preserva o fallback por senha local cadastrada."
      />

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
        <h2 className="font-semibold">Como o login usa estes parâmetros</h2>
        <p className="mt-1">
          No modo API HTTP, o SECP envia matrícula e senha para a URL
          configurada e espera retorno autenticado do Active Directory. No modo
          bind LDAP, o sistema conecta ao servidor LDAP/AD e valida a senha com
          bind direto do usuário, usando domínio, DN padrão ou busca por base DN
          quando configurados.
        </p>
      </section>

      <form className="rounded-xl border bg-card p-4 shadow-sm">
        <label htmlFor="orgaoFiltro" className="text-sm font-semibold">
          Editar configuração de
        </label>
        <div className="mt-2 flex flex-col gap-3 md:flex-row">
          <select
            id="orgaoFiltro"
            name="orgaoId"
            defaultValue={orgaoSelecionado ?? ""}
            className="h-11 flex-1 rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          >
            <option value="">Padrão do sistema</option>
            {orgaos.map((orgao) => (
              <option key={orgao.id} value={orgao.id}>
                {orgao.sigla} - {orgao.nome}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md bg-blue-900 px-5 text-sm font-semibold text-white transition hover:bg-blue-950"
          >
            Carregar
          </button>
        </div>
      </form>

      <LdapActiveDirectoryForm
        action={atualizarLdapActiveDirectoryAction}
        valoresIniciais={{
          ...configuracao,
          orgaoId: configuracao.orgaoId ?? "",
          possuiBindPassword: Boolean(configuracao.bindPassword),
        }}
        orgaos={orgaos}
      />
    </main>
  );
}
