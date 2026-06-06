import { Users } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarServidorAction } from "@/modules/servidores/application/actions/criar-servidor.action";
import { listarOrgaosAtivosParaServidor } from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { ServidorForm } from "@/modules/servidores/presentation/components/servidor-form";

export default async function NovoServidorPage() {
  await exigirPermissaoOuRedirecionar("servidores:gerenciar:global");

  const orgaos = await listarOrgaosAtivosParaServidor();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administracao", href: "/administracao" },
          { label: "Servidores", href: "/servidores" },
          { label: "Novo servidor" },
        ]}
      />

      <PageHeader
        icon={Users}
        titulo="Novo servidor"
        descricao="Cadastre o servidor e crie o usuario associado que sera usado para autenticacao e autorizacao no SECP."
        artigo="Arts. 4 e 8"
        regraTitulo="Cadastro funcional e apuracao"
        regraDescricao="O cadastro do servidor sera usado para definir jornada, lotacao, apuracao mensal, banco de horas e acesso ao espelho de frequencia."
      />

      <ServidorForm
        action={criarServidorAction}
        orgaos={orgaos}
        modo="criar"
        valoresIniciais={{
          cpf: "",
          ativo: true,
          vinculo: "EFETIVO",
        }}
      />
    </div>
  );
}
