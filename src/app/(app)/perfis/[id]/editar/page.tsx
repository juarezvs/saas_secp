import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { listarOrgaosAtivos } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";
import { atualizarPerfilAction } from "@/modules/perfis/application/actions/atualizar-perfil.action";
import {
  buscarPerfilPorId,
  listarPerfisParaFiltro,
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
  await exigirUmaDasPermissoesOuRedirecionar([
    "perfis:gerenciar:global",
    "perfis:gerenciar:seccional",
  ]);
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds;

  const { id } = await params;

  const [perfil, permissoes, perfis, orgaosPermitidos] = await Promise.all([
    buscarPerfilPorId(id),
    listarPermissoesOrdenadas(),
    listarPerfisParaFiltro({ orgaoIdsPermitidos }),
    listarOrgaosAtivos({ orgaoIdsPermitidos }),
  ]);

  if (!perfil) {
    notFound();
  }

  if (
    !escopoOrgao.global &&
    !perfil.global &&
    (!perfil.orgaoId || !escopoOrgao.orgaoIds.includes(perfil.orgaoId))
  ) {
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
        perfisDestinoExcecao={perfis.filter((item) => item.id !== perfil.id)}
        orgaosPermitidos={orgaosPermitidos}
        permitirPerfilGlobal={escopoOrgao.global}
        modo="editar"
        valoresIniciais={{
          codigo: perfil.codigo,
          nome: perfil.nome,
          descricao: perfil.descricao,
          orgaoId: perfil.orgaoId,
          ativo: perfil.ativo,
          administrativo: perfil.administrativo,
          excecao: perfil.excecao,
          global: perfil.global,
          perfilDestinoExcecaoId: perfil.perfilDestinoExcecaoId,
          permissoes: perfil.permissoes.map((item) => item.permissaoId),
        }}
      />
    </div>
  );
}
