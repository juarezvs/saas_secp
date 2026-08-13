import { MENU_CATALOGO } from "@/modules/menus/domain/menu-catalogo";
import { prisma } from "@/shared/infrastructure/database/prisma";

const GRUPOS_PADRAO_MENU: Record<
  string,
  { label: string; icone: string; ordem: number }
> = {
  equipe: { label: "Minha Equipe", icone: "equipe", ordem: 20 },
  frequencia: {
    label: "Frequencia e Banco de Horas",
    icone: "banco",
    ordem: 30,
  },
  horasExtras: {
    label: "Servico Extraordinario",
    icone: "settings",
    ordem: 40,
  },
  recesso: { label: "Recesso Forense", icone: "calendario", ordem: 50 },
  gestaoPessoas: { label: "Gestao de Pessoas", icone: "users", ordem: 60 },
  painel: { label: "Painel executivo", icone: "relatorios", ordem: 70 },
  biometria: { label: "Biometria facial", icone: "settings", ordem: 80 },
  administracao: { label: "Administracao", icone: "administracao", ordem: 90 },
  integracoesAuditoria: {
    label: "Integracoes e Auditoria",
    icone: "settings",
    ordem: 100,
  },
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

  if (href.startsWith("/recesso-forense")) return "recesso";
  if (href.startsWith("/painel-executivo")) return "painel";
  if (href.startsWith("/biometria")) return "biometria";

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
    ["/perfis", "/usuarios", "/orgaos", "/unidades"].includes(href)
  ) {
    return "administracao";
  }

  return null;
}

async function obterOuCriarGrupo(params: {
  perfilId: string;
  chaveGrupo: string | null;
  gruposPorLabel: Map<string, string>;
}) {
  if (!params.chaveGrupo) return null;

  const grupoPadrao = GRUPOS_PADRAO_MENU[params.chaveGrupo];
  if (!grupoPadrao) return null;

  const existente = params.gruposPorLabel.get(grupoPadrao.label);
  if (existente) return existente;

  const criado = await prisma.menuGrupoPerfil.create({
    data: {
      perfilId: params.perfilId,
      label: grupoPadrao.label,
      icone: grupoPadrao.icone,
      ordem: grupoPadrao.ordem,
      ativo: true,
    },
    select: { id: true },
  });

  params.gruposPorLabel.set(grupoPadrao.label, criado.id);
  return criado.id;
}

async function sincronizar() {
  const perfis = await prisma.perfil.findMany({
    where: { ativo: true },
    select: {
      id: true,
      codigo: true,
      nome: true,
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
    orderBy: { codigo: "asc" },
  });

  let itensCriados = 0;
  let itensReativados = 0;
  let gruposReativados = 0;
  const ajustes: string[] = [];

  for (const perfil of perfis) {
    const permissoesPerfil = new Set(
      perfil.permissoes.map((item) => item.permissao.codigo),
    );
    const itensPermitidos = MENU_CATALOGO.filter(
      (item) =>
        !item.permissoes?.length ||
        item.permissoes.some((permissao) => permissoesPerfil.has(permissao)),
    );

    const grupos = await prisma.menuGrupoPerfil.findMany({
      where: { perfilId: perfil.id },
      select: { id: true, label: true, ativo: true },
    });
    const gruposPorLabel = new Map(
      grupos.map((grupo) => [grupo.label, grupo.id]),
    );
    const itens = await prisma.menuItemPerfil.findMany({
      where: { perfilId: perfil.id },
      select: {
        id: true,
        itemCatalogo: true,
        ativo: true,
        grupoId: true,
      },
    });
    const itensPorCatalogo = new Map(
      itens.map((item) => [item.itemCatalogo, item]),
    );

    for (const item of itensPermitidos) {
      const chaveGrupo = grupoPadraoItemMenu(item.href);
      const grupoId = await obterOuCriarGrupo({
        perfilId: perfil.id,
        chaveGrupo,
        gruposPorLabel,
      });

      if (grupoId) {
        const grupo = grupos.find((registro) => registro.id === grupoId);
        if (grupo && !grupo.ativo) {
          await prisma.menuGrupoPerfil.update({
            where: { id: grupo.id },
            data: { ativo: true },
          });
          gruposReativados++;
        }
      }

      const itemExistente = itensPorCatalogo.get(item.id);

      if (!itemExistente) {
        const ultimoItem = await prisma.menuItemPerfil.findFirst({
          where: { perfilId: perfil.id, grupoId },
          orderBy: { ordem: "desc" },
          select: { ordem: true },
        });

        await prisma.menuItemPerfil.create({
          data: {
            perfilId: perfil.id,
            grupoId,
            itemCatalogo: item.id,
            ordem: (ultimoItem?.ordem ?? 0) + 10,
            ativo: true,
          },
        });
        itensCriados++;
        ajustes.push(`${perfil.codigo};${item.label};criado`);
        continue;
      }

      if (!itemExistente.ativo) {
        await prisma.menuItemPerfil.update({
          where: { id: itemExistente.id },
          data: { ativo: true },
        });
        itensReativados++;
        ajustes.push(`${perfil.codigo};${item.label};reativado`);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        perfisAvaliados: perfis.length,
        itensCriados,
        itensReativados,
        gruposReativados,
        ajustes,
      },
      null,
      2,
    ),
  );
}

sincronizar()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
