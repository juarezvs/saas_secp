import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
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
          { label: "Administração", href: "/administracao" },
          { label: "Servidores", href: "/servidores" },
          { label: "Novo servidor" },
        ]}
      />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Cadastro funcional
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Novo servidor
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Cadastre o servidor e crie o usuário associado que será usado para
          autenticação e autorização no SECP.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Arts. 4º e 8º"
        titulo="Cadastro funcional e apuração"
        descricao="O cadastro do servidor será usado para definir jornada, lotação, apuração mensal, banco de horas e acesso ao espelho de frequência."
      />

      <ServidorForm
        action={criarServidorAction}
        orgaos={orgaos}
        modo="criar"
        valoresIniciais={{
          ativo: true,
          vinculo: "EFETIVO",
        }}
      />
    </div>
  );
}
