import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { atualizarUsuarioAction } from "@/modules/usuarios/application/actions/atualizar-usuario.action";
import {
  buscarUsuarioPorId,
  listarPerfisAtivosParaUsuario,
} from "@/modules/usuarios/infrastructure/repositories/usuario.repository";
import { UsuarioForm } from "@/modules/usuarios/presentation/components/usuario-form";

type EditarUsuarioPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditarUsuarioPage({
  params,
}: EditarUsuarioPageProps) {
  await exigirPermissaoOuRedirecionar("usuarios:gerenciar:global");

  const { id } = await params;

  const [usuario, perfis] = await Promise.all([
    buscarUsuarioPorId(id),
    listarPerfisAtivosParaUsuario(),
  ]);

  if (!usuario) {
    notFound();
  }

  const action = atualizarUsuarioAction.bind(null, usuario.id);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Usuários", href: "/usuarios" },
          { label: usuario.nome, href: `/usuarios/${usuario.id}` },
          { label: "Editar" },
        ]}
      />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Administração de acessos
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Editar usuário
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Atualize os dados da conta, status, senha local e perfis de acesso.
        </p>
      </section>

      <RegraPortariaCard
        artigo="RBAC dinâmico do SECP"
        titulo="Atualização de perfis"
        descricao="Alterações em perfis impactam as permissões disponíveis ao usuário após novo login ou atualização da sessão."
      />

      <UsuarioForm
        action={action}
        perfis={perfis}
        modo="editar"
        valoresIniciais={{
          matricula: usuario.matricula,
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo,
          ativo: usuario.ativo,
          perfis: usuario.perfis
            .filter((item) => item.ativo)
            .map((item) => item.perfilId),
        }}
      />
    </div>
  );
}