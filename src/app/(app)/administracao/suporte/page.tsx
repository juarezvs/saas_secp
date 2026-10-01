import { LifeBuoy } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarConfiguracoesSuporteLogin } from "@/modules/suporte/application/services/suporte-login-config.service";
import { SuporteLoginConfigForm } from "@/modules/suporte/presentation/components/suporte-login-config-form";

export default async function AdministracaoSuportePage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "configuracoes:gerenciar:global",
    "configuracoes:gerenciar:seccional",
  ]);
  const { orgaos, configuracoes } = await listarConfiguracoesSuporteLogin();

  return (
    <main className="space-y-6 p-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Suporte do login" },
        ]}
      />

      <PageHeader
        icon={LifeBuoy}
        titulo="Suporte do login"
        descricao="Configure a URL aberta pelo botão Solicitar Suporte na tela de login, com opção global ou específica por seccional."
      />

      <SuporteLoginConfigForm orgaos={orgaos} configuracoes={configuracoes} />
    </main>
  );
}
