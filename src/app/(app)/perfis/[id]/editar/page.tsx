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
import { resolverPermissoesPerfilNaSeccional } from "@/modules/perfis/application/services/permissoes-perfil-seccional.service";

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
  const orgaoEscopoPermissoes =
    !escopoOrgao.global && perfil.global ? escopoOrgao.orgaoIds[0] : null;
  const codigosPermissoesEfetivas = new Set(
    resolverPermissoesPerfilNaSeccional(
      perfil.permissoes,
      perfil.permissoesSeccionais,
      orgaoEscopoPermissoes,
    ),
  );
  const idsPermissoesEfetivas = permissoes
    .filter((item) => codigosPermissoesEfetivas.has(item.codigo))
    .map((item) => item.id);

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
        editarSomentePermissoesSeccionais={Boolean(orgaoEscopoPermissoes)}
        orgaoEscopoPermissoes={orgaoEscopoPermissoes}
        nomeOrgaoEscopoPermissoes={
          escopoOrgao.orgaos.find(
            (orgao) => orgao.id === orgaoEscopoPermissoes,
          )?.nome
        }
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
          permissoes: idsPermissoesEfetivas,
        }}
      />
    </div>
  );
}
