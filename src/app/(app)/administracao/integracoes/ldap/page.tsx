import { KeyRound } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { atualizarLdapActiveDirectoryAction } from "@/modules/integracoes/application/actions/atualizar-ldap-active-directory.action";
import { obterConfiguracaoLdapActiveDirectory } from "@/modules/integracoes/application/services/ldap-active-directory-config.service";
import { LdapActiveDirectoryForm } from "@/modules/integracoes/presentation/components/ldap-active-directory-form";

export default async function IntegracaoLdapActiveDirectoryPage() {
  await exigirPermissaoOuRedirecionar("integracoes:gerenciar:global");

  const configuracao = await obterConfiguracaoLdapActiveDirectory();

  return (
    <main className="space-y-6 p-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Integrações", href: "/administracao/integracoes" },
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

      <LdapActiveDirectoryForm
        action={atualizarLdapActiveDirectoryAction}
        valoresIniciais={{
          ...configuracao,
          possuiBindPassword: Boolean(configuracao.bindPassword),
        }}
      />
    </main>
  );
}
