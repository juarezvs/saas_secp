import Link from "next/link";
import { redirect } from "next/navigation";
import { Menu, Plus, RotateCcw } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { expandirPermissoesCompatibilidade } from "@/modules/auth/application/services/permissao-utils";
import {
  criarGrupoMenuAction,
  excluirPersonalizacaoMenuAction,
} from "@/modules/menus/application/actions/personalizar-menu.actions";
import {
  buscarIconesItensCatalogoMenu,
  buscarMenuPersonalizadoPerfil,
  inicializarMenuPersonalizadoPerfilSeVazio,
} from "@/modules/menus/infrastructure/repositories/menu-personalizado.repository";
import { MenuLateralPersonalizacao } from "@/modules/menus/presentation/components/menu-lateral-personalizacao";
import { listarPerfisParaFiltro } from "@/modules/perfis/infrastructure/repositories/perfil.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

type PersonalizarMenuPageProps = {
  searchParams?: Promise<{
    perfilId?: string;
    reset?: string;
    editarGrupoId?: string;
  }>;
};

function CamposPerfil({ perfilId }: { perfilId: string }) {
  return <input type="hidden" name="perfilId" value={perfilId} />;
}

export default async function PersonalizarMenuPage({
  searchParams,
}: PersonalizarMenuPageProps) {
  await exigirPermissaoOuRedirecionar("menus:personalizar:global");

  const params = await searchParams;
  const perfis = await listarPerfisParaFiltro();
  const perfilSelecionado =
    perfis.find((perfil) => perfil.id === params?.perfilId) ?? perfis[0];

  if (!perfilSelecionado) {
    redirect("/perfis");
  }

  if (params?.reset !== "1") {
    await inicializarMenuPersonalizadoPerfilSeVazio(perfilSelecionado.id);
  }

  const [menu, perfilCarregado, iconesItensCatalogo] = await Promise.all([
    buscarMenuPersonalizadoPerfil(perfilSelecionado.id),
    prisma.perfil.findUnique({
      where: { id: perfilSelecionado.id },
      select: {
        id: true,
        codigo: true,
        nome: true,
        administrativo: true,
        permissoes: {
          select: {
            permissao: {
              select: {
                codigo: true,
              },
            },
          },
        },
      },
    }),
    buscarIconesItensCatalogoMenu(),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administracao", href: "/administracao" },
          { label: "Personalizar Menu" },
        ]}
      />

      <PageHeader
        icon={Menu}
        titulo="Personalizar Menu"
        descricao="Configure grupos, opcoes e ordem do menu lateral por perfil."
      />

      <section className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-lg border bg-card p-4 xl:sticky xl:top-24 xl:self-start">
          <form className="space-y-2">
            <label className="text-sm font-semibold" htmlFor="perfilId">
              Perfil
            </label>
            <select
              id="perfilId"
              name="perfilId"
              defaultValue={perfilSelecionado.id}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {perfis.map((perfil) => (
                <option key={perfil.id} value={perfil.id}>
                  {perfil.nome} ({perfil.codigo})
                </option>
              ))}
            </select>
            <button className="h-10 w-full rounded-md border text-sm font-semibold transition hover:border-secp-blue-900 hover:text-secp-blue-900">
              Carregar perfil
            </button>
          </form>

          <form action={criarGrupoMenuAction} className="space-y-3 border-t pt-4">
            <CamposPerfil perfilId={perfilSelecionado.id} />
            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="label">
                Novo grupo
              </label>
              <input
                id="label"
                name="label"
                placeholder="Ex.: Configurador"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="icone">
                Icone opcional
              </label>
              <input
                id="icone"
                name="icone"
                placeholder="settings, users, menu"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              />
            </div>
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-secp-blue-900 px-4 text-sm font-semibold text-white transition hover:bg-secp-blue-800">
              <Plus className="size-4" />
              Criar grupo
            </button>
          </form>

          <form
            action={excluirPersonalizacaoMenuAction}
            className="border-t pt-4"
          >
            <CamposPerfil perfilId={perfilSelecionado.id} />
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-red-200 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50">
              <RotateCcw className="size-4" />
              Voltar ao menu padrao
            </button>
          </form>
        </aside>

        <section className="space-y-4">
          <MenuLateralPersonalizacao
            key={perfilSelecionado.id}
            perfilId={perfilSelecionado.id}
            menu={menu}
            iconesItensCatalogo={iconesItensCatalogo}
            editarGrupoIdInicial={params?.editarGrupoId}
            perfilCarregado={{
              id: perfilCarregado?.id ?? perfilSelecionado.id,
              codigo: perfilCarregado?.codigo ?? perfilSelecionado.codigo,
              nome: perfilCarregado?.nome ?? perfilSelecionado.nome,
              administrativo: Boolean(perfilCarregado?.administrativo),
              permissoes: expandirPermissoesCompatibilidade(
                perfilCarregado?.permissoes.map(
                  (perfilPermissao) => perfilPermissao.permissao.codigo,
                ) ?? [],
              ),
            }}
          />

          <Link
            href="/administracao"
            className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-semibold transition hover:border-secp-blue-900 hover:text-secp-blue-900"
          >
            Voltar para Administracao
          </Link>
        </section>
      </section>
    </div>
  );
}
