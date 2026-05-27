import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { atualizarPerfilAction } from "@/modules/perfis/application/actions/atualizar-perfil.action";
import {
  buscarPerfilPorId,
  listarPermissoesOrdenadas,
} from "@/modules/perfis/infrastructure/repositories/perfil.repository";
import { PerfilForm } from "@/modules/perfis/presentation/components/perfil-form";

type EditarPerfilPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditarPerfilPage({
  params,
}: EditarPerfilPageProps) {
  await exigirPermissaoOuRedirecionar("perfis:gerenciar:global");

  const { id } = await params;

  const [perfil, permissoes] = await Promise.all([
    buscarPerfilPorId(id),
    listarPermissoesOrdenadas(),
  ]);

  if (!perfil) {
    notFound();
  }

  const action = atualizarPerfilAction.bind(null, perfil.id);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Perfis e permissões", href: "/perfis" },
          { label: perfil.nome, href: `/perfis/${perfil.id}` },
          { label: "Editar" },
        ]}
      />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Controle de acesso
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Editar perfil
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Atualize os dados do perfil e suas permissões vinculadas.
        </p>
      </section>

      <RegraPortariaCard
        artigo="RBAC dinâmico do SECP"
        titulo="Permissões por perfil"
        descricao="Alterações em perfis impactam os acessos disponíveis aos usuários após atualização da sessão ou novo login."
      />

      <PerfilForm
        action={action}
        permissoes={permissoes}
        modo="editar"
        valoresIniciais={{
          codigo: perfil.codigo,
          nome: perfil.nome,
          descricao: perfil.descricao,
          ativo: perfil.ativo,
          permissoes: perfil.permissoes.map((item) => item.permissaoId),
        }}
      />
    </div>
  );
}
