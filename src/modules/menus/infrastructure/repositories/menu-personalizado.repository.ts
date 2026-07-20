import { prisma } from "@/shared/infrastructure/database/prisma";
import { MENU_CATALOGO } from "../../domain/menu-catalogo";
import type {
  MenuPersonalizadoPerfil,
  MenusPersonalizadosPorPerfil,
} from "../../domain/menu-personalizado";

const GRUPOS_PADRAO_MENU: Record<string, { label: string; icone: string; ordem: number }> = {
  equipe: { label: "Minha Equipe", icone: "equipe", ordem: 20 },
  frequencia: { label: "Frequencia e Banco de Horas", icone: "banco", ordem: 30 },
  horasExtras: { label: "Servico Extraordinario", icone: "settings", ordem: 40 },
  recesso: { label: "Recesso Forense", icone: "calendario", ordem: 50 },
  gestaoPessoas: { label: "Gestao de Pessoas", icone: "users", ordem: 60 },
  painel: { label: "Painel executivo", icone: "relatorios", ordem: 70 },
  biometria: { label: "Biometria facial", icone: "settings", ordem: 80 },
  administracao: { label: "Administracao", icone: "administracao", ordem: 90 },
  integracoesAuditoria: { label: "Integracoes e Auditoria", icone: "settings", ordem: 100 },
};

function grupoPadraoItemMenu(href: string) {
  if (
    [
      "/dashboard",
      "/marcacoes",
      "/marcacoes/registrar",
      "/historico-marcacoes",
      "/espelho-ponto",
      "/meu-contracheque",
      "/meus-afastamentos",
      "/minhas-ferias",
      "/banco-horas",
      "/banco-horas/solicitacoes",
      "/solicitacoes",
      "/relatorios",
    ].includes(href)
  ) {
    return null;
  }

  if (
    href.startsWith("/minha-equipe") ||
    href === "/homologacao" ||
    href === "/banco-horas/chefia"
  ) {
    return "equipe";
  }

  if (
    href.startsWith("/banco-horas") ||
    href === "/marcacoes-brutas" ||
    href === "/apuracao" ||
    href === "/boletim-frequencia"
  ) {
    return "frequencia";
  }

  if (
    href.startsWith("/horas-extras") ||
    href.startsWith("/gestao/horas-extras") ||
    href.startsWith("/orcamento/horas-extras") ||
    href.startsWith("/deliberacao/horas-extras") ||
    href.startsWith("/execucao/horas-extras") ||
    href.startsWith("/folha/horas-extras")
  ) {
    return "horasExtras";
  }

  if (href.startsWith("/recesso-forense")) {
    return "recesso";
  }

  if (href.startsWith("/painel-executivo")) {
    return "painel";
  }

  if (href.startsWith("/biometria")) {
    return "biometria";
  }

  if (
    [
      "/servidores",
      "/estagiarios",
      "/prestadores",
      "/voluntarios",
      "/chefias",
      "/jornadas",
    ].includes(href)
  ) {
    return "gestaoPessoas";
  }

  if (
    [
      "/afd",
      "/equipamentos",
      "/auditoria",
      "/administracao/integracoes",
      "/administracao/workers",
    ].includes(href)
  ) {
    return "integracoesAuditoria";
  }

  if (
    href.startsWith("/administracao") ||
    [
      "/perfis",
      "/usuarios",
      "/orgaos",
      "/unidades",
      "/afd",
      "/equipamentos",
    ].includes(href)
  ) {
    return "administracao";
  }

  return null;
}

function normalizarMenuPerfil(perfilId: string, dados: {
  grupos: Array<{
    id: string;
    label: string;
    icone: string | null;
    ordem: number;
    ativo: boolean;
    itens: Array<{
      id: string;
      itemCatalogo: string;
      label: string | null;
      ordem: number;
      ativo: boolean;
    }>;
  }>;
  itensRaiz: Array<{
    id: string;
    itemCatalogo: string;
    label: string | null;
    ordem: number;
    ativo: boolean;
  }>;
}): MenuPersonalizadoPerfil {
  return {
    perfilId,
    grupos: dados.grupos,
    itensRaiz: dados.itensRaiz,
  };
}

async function removerGrupoMeuPontoPadraoPerfil(perfilId: string) {
  const grupoMeuPonto = await prisma.menuGrupoPerfil.findFirst({
    where: {
      perfilId,
      label: "Meu Ponto",
      icone: "menu",
    },
    include: {
      itens: {
        orderBy: [{ ordem: "asc" }, { itemCatalogo: "asc" }],
      },
    },
  });

  if (!grupoMeuPonto) {
    return;
  }

  await prisma.$transaction([
    ...grupoMeuPonto.itens.map((item, indice) =>
      prisma.menuItemPerfil.update({
        where: { id: item.id },
        data: {
          grupoId: null,
          ordem: (indice + 1) * 10,
        },
      }),
    ),
    prisma.menuGrupoPerfil.delete({
      where: { id: grupoMeuPonto.id },
    }),
  ]);
}

export async function buscarMenuPersonalizadoPerfil(
  perfilId: string,
): Promise<MenuPersonalizadoPerfil> {
  await removerGrupoMeuPontoPadraoPerfil(perfilId);

  const [grupos, itensRaiz] = await Promise.all([
    prisma.menuGrupoPerfil.findMany({
      where: { perfilId },
      orderBy: [{ ordem: "asc" }, { label: "asc" }],
      include: {
        itens: {
          orderBy: [{ ordem: "asc" }, { itemCatalogo: "asc" }],
        },
      },
    }),
    prisma.menuItemPerfil.findMany({
      where: { perfilId, grupoId: null },
      orderBy: [{ ordem: "asc" }, { itemCatalogo: "asc" }],
    }),
  ]);

  return normalizarMenuPerfil(perfilId, { grupos, itensRaiz });
}

export async function inicializarMenuPersonalizadoPerfilSeVazio(
  perfilId: string,
) {
  const [totalGrupos, totalItens] = await Promise.all([
    prisma.menuGrupoPerfil.count({ where: { perfilId } }),
    prisma.menuItemPerfil.count({ where: { perfilId } }),
  ]);

  if (totalGrupos > 0 || totalItens > 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const gruposCriados = new Map<string, string>();

    for (const [chave, grupo] of Object.entries(GRUPOS_PADRAO_MENU)) {
      const criado = await tx.menuGrupoPerfil.create({
        data: {
          perfilId,
          label: grupo.label,
          icone: grupo.icone,
          ordem: grupo.ordem,
        },
        select: { id: true },
      });

      gruposCriados.set(chave, criado.id);
    }

    await tx.menuItemPerfil.createMany({
      data: MENU_CATALOGO.map((item, index) => {
        const grupo = grupoPadraoItemMenu(item.href);

        return {
          perfilId,
          grupoId: grupo ? (gruposCriados.get(grupo) ?? null) : null,
          itemCatalogo: item.id,
          ordem: (index + 1) * 10,
        };
      }),
      skipDuplicates: true,
    });
  });
}

export async function buscarMenusPersonalizadosPorPerfil(
  perfilIds: string[],
): Promise<MenusPersonalizadosPorPerfil> {
  const ids = Array.from(new Set(perfilIds.filter(Boolean)));

  if (ids.length === 0) {
    return {};
  }

  const menus = await Promise.all(ids.map(buscarMenuPersonalizadoPerfil));

  return Object.fromEntries(menus.map((menu) => [menu.perfilId, menu]));
}
