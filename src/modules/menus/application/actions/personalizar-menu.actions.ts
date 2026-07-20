"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { MENU_CATALOGO } from "@/modules/menus/domain/menu-catalogo";
import { prisma } from "@/shared/infrastructure/database/prisma";

const PERMISSAO_PERSONALIZAR_MENU = "menus:personalizar:global";
const PATH_PERSONALIZAR_MENU = "/administracao/personalizar-menu";

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function destino(perfilId: string, extras?: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  if (perfilId) {
    params.set("perfilId", perfilId);
  }

  for (const [chave, valor] of Object.entries(extras ?? {})) {
    if (valor) {
      params.set(chave, valor);
    }
  }

  return params.size ? `${PATH_PERSONALIZAR_MENU}?${params.toString()}` : PATH_PERSONALIZAR_MENU;
}

async function exigirAcesso() {
  return exigirPermissaoOuRedirecionar(PERMISSAO_PERSONALIZAR_MENU);
}

async function proximaOrdemGrupo(perfilId: string) {
  const ultimo = await prisma.menuGrupoPerfil.findFirst({
    where: { perfilId },
    orderBy: { ordem: "desc" },
    select: { ordem: true },
  });

  return (ultimo?.ordem ?? 0) + 10;
}

async function primeiraOrdemGrupo(perfilId: string) {
  const primeiro = await prisma.menuGrupoPerfil.findFirst({
    where: { perfilId },
    orderBy: { ordem: "asc" },
    select: { ordem: true },
  });

  return (primeiro?.ordem ?? 10) - 10;
}

async function proximaOrdemItem(perfilId: string, grupoId: string | null) {
  const ultimo = await prisma.menuItemPerfil.findFirst({
    where: { perfilId, grupoId },
    orderBy: { ordem: "desc" },
    select: { ordem: true },
  });

  return (ultimo?.ordem ?? 0) + 10;
}

export async function criarGrupoMenuAction(formData: FormData) {
  const permissao = await exigirAcesso();
  const perfilId = texto(formData, "perfilId");
  const label = texto(formData, "label");
  const icone = texto(formData, "icone");
  const topo = texto(formData, "topo") === "true";

  if (!perfilId || !label) {
    redirect(destino(perfilId));
  }

  const grupo = await prisma.menuGrupoPerfil.create({
    data: {
      perfilId,
      label,
      icone: icone || null,
      ordem: topo ? await primeiraOrdemGrupo(perfilId) : await proximaOrdemGrupo(perfilId),
    },
  });

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: permissao.usuarioId,
      entidade: "MenuGrupoPerfil",
      entidadeId: grupo.id,
      acao: "MENU_GRUPO_CRIADO",
      dadosDepois: { perfilId, label, icone: icone || null },
    },
  });

  revalidatePath("/");
  revalidatePath(PATH_PERSONALIZAR_MENU);
  redirect(destino(perfilId, topo ? { editarGrupoId: grupo.id } : undefined));
}

export async function adicionarItemMenuAction(formData: FormData) {
  const permissao = await exigirAcesso();
  const perfilId = texto(formData, "perfilId");
  const grupoId = texto(formData, "grupoId") || null;
  const itemCatalogo = texto(formData, "itemCatalogo");
  const label = texto(formData, "label");
  const itemExiste = MENU_CATALOGO.some((item) => item.id === itemCatalogo);

  if (!perfilId || !itemExiste) {
    redirect(destino(perfilId));
  }

  const duplicado = await prisma.menuItemPerfil.findFirst({
    where: { perfilId, itemCatalogo },
    select: { id: true },
  });

  if (duplicado) {
    redirect(destino(perfilId));
  }

  if (grupoId) {
    const grupo = await prisma.menuGrupoPerfil.findFirst({
      where: { id: grupoId, perfilId },
      select: { id: true },
    });

    if (!grupo) {
      redirect(destino(perfilId));
    }
  }

  const item = await prisma.menuItemPerfil.create({
    data: {
      perfilId,
      grupoId,
      itemCatalogo,
      label: label || null,
      ordem: await proximaOrdemItem(perfilId, grupoId),
    },
  });

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: permissao.usuarioId,
      entidade: "MenuItemPerfil",
      entidadeId: item.id,
      acao: "MENU_ITEM_ADICIONADO",
      dadosDepois: { perfilId, grupoId, itemCatalogo, label: label || null },
    },
  });

  revalidatePath("/");
  revalidatePath(PATH_PERSONALIZAR_MENU);
  redirect(destino(perfilId));
}

export async function alternarGrupoMenuAction(formData: FormData) {
  await exigirAcesso();
  const perfilId = texto(formData, "perfilId");
  const grupoId = texto(formData, "grupoId");
  const ativo = texto(formData, "ativo") === "true";

  await prisma.menuGrupoPerfil.updateMany({
    where: { id: grupoId, perfilId },
    data: { ativo },
  });

  revalidatePath("/");
  revalidatePath(PATH_PERSONALIZAR_MENU);
  redirect(destino(perfilId));
}

export async function alternarItemMenuAction(formData: FormData) {
  await exigirAcesso();
  const perfilId = texto(formData, "perfilId");
  const itemId = texto(formData, "itemId");
  const ativo = texto(formData, "ativo") === "true";

  await prisma.menuItemPerfil.updateMany({
    where: { id: itemId, perfilId },
    data: { ativo },
  });

  revalidatePath("/");
  revalidatePath(PATH_PERSONALIZAR_MENU);
  redirect(destino(perfilId));
}

export async function atualizarRotuloItemMenuAction(formData: FormData) {
  await exigirAcesso();
  const perfilId = texto(formData, "perfilId");
  const itemId = texto(formData, "itemId");
  const label = texto(formData, "label");

  await prisma.menuItemPerfil.updateMany({
    where: { id: itemId, perfilId },
    data: { label: label || null },
  });

  revalidatePath("/");
  revalidatePath(PATH_PERSONALIZAR_MENU);
  redirect(destino(perfilId));
}

export async function atualizarRotuloGrupoMenuAction(formData: FormData) {
  await exigirAcesso();
  const perfilId = texto(formData, "perfilId");
  const grupoId = texto(formData, "grupoId");
  const label = texto(formData, "label");

  if (!label) {
    redirect(destino(perfilId));
  }

  await prisma.menuGrupoPerfil.updateMany({
    where: { id: grupoId, perfilId },
    data: { label },
  });

  revalidatePath("/");
  revalidatePath(PATH_PERSONALIZAR_MENU);
  redirect(destino(perfilId));
}

export async function atualizarIconeGrupoMenuAction(formData: FormData) {
  await exigirAcesso();
  const perfilId = texto(formData, "perfilId");
  const grupoId = texto(formData, "grupoId");
  const icone = texto(formData, "icone");

  await prisma.menuGrupoPerfil.updateMany({
    where: { id: grupoId, perfilId },
    data: { icone: icone || null },
  });

  revalidatePath("/");
  revalidatePath(PATH_PERSONALIZAR_MENU);
  redirect(destino(perfilId));
}

export async function removerGrupoMenuAction(formData: FormData) {
  await exigirAcesso();
  const perfilId = texto(formData, "perfilId");
  const grupoId = texto(formData, "grupoId");

  await prisma.menuGrupoPerfil.deleteMany({
    where: { id: grupoId, perfilId },
  });

  revalidatePath("/");
  revalidatePath(PATH_PERSONALIZAR_MENU);
  redirect(destino(perfilId));
}

export async function removerItemMenuAction(formData: FormData) {
  await exigirAcesso();
  const perfilId = texto(formData, "perfilId");
  const itemId = texto(formData, "itemId");

  await prisma.menuItemPerfil.deleteMany({
    where: { id: itemId, perfilId },
  });

  revalidatePath("/");
  revalidatePath(PATH_PERSONALIZAR_MENU);
  redirect(destino(perfilId));
}

export async function excluirPersonalizacaoMenuAction(formData: FormData) {
  const permissao = await exigirAcesso();
  const perfilId = texto(formData, "perfilId");

  if (!perfilId) {
    redirect(PATH_PERSONALIZAR_MENU);
  }

  await prisma.$transaction(async (tx) => {
    await tx.menuGrupoPerfil.deleteMany({ where: { perfilId } });
    await tx.menuItemPerfil.deleteMany({ where: { perfilId } });
    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Perfil",
        entidadeId: perfilId,
        acao: "MENU_PERSONALIZACAO_EXCLUIDA",
        dadosDepois: { perfilId },
      },
    });
  });

  revalidatePath("/");
  revalidatePath(PATH_PERSONALIZAR_MENU);
  redirect(`${destino(perfilId)}&reset=1`);
}

async function moverGrupo(params: {
  perfilId: string;
  id: string;
  direcao: "subir" | "descer";
}) {
  const { perfilId, id, direcao } = params;
  const atual = await prisma.menuGrupoPerfil.findFirst({
    where: { id, perfilId },
    select: { id: true, ordem: true },
  });

  if (!atual) {
    return;
  }

  const vizinho = await prisma.menuGrupoPerfil.findFirst({
    where: {
      perfilId,
      ordem: direcao === "subir" ? { lt: atual.ordem } : { gt: atual.ordem },
    },
    orderBy: { ordem: direcao === "subir" ? "desc" : "asc" },
    select: { id: true, ordem: true },
  });

  if (!vizinho) {
    return;
  }

  await prisma.$transaction([
    prisma.menuGrupoPerfil.update({
      where: { id: atual.id },
      data: { ordem: vizinho.ordem },
    }),
    prisma.menuGrupoPerfil.update({
      where: { id: vizinho.id },
      data: { ordem: atual.ordem },
    }),
  ]);
}

async function moverItem(params: {
  perfilId: string;
  id: string;
  direcao: "subir" | "descer";
}) {
  const { perfilId, id, direcao } = params;
  const atual = await prisma.menuItemPerfil.findFirst({
    where: { id, perfilId },
    select: { id: true, ordem: true, grupoId: true },
  });

  if (!atual) {
    return;
  }

  const vizinho = await prisma.menuItemPerfil.findFirst({
    where: {
      perfilId,
      grupoId: atual.grupoId,
      ordem: direcao === "subir" ? { lt: atual.ordem } : { gt: atual.ordem },
    },
    orderBy: { ordem: direcao === "subir" ? "desc" : "asc" },
    select: { id: true, ordem: true },
  });

  if (!vizinho) {
    return;
  }

  await prisma.$transaction([
    prisma.menuItemPerfil.update({
      where: { id: atual.id },
      data: { ordem: vizinho.ordem },
    }),
    prisma.menuItemPerfil.update({
      where: { id: vizinho.id },
      data: { ordem: atual.ordem },
    }),
  ]);
}

export async function moverGrupoMenuAction(formData: FormData) {
  await exigirAcesso();
  const perfilId = texto(formData, "perfilId");
  const grupoId = texto(formData, "grupoId");
  const direcao = texto(formData, "direcao") === "descer" ? "descer" : "subir";

  await moverGrupo({ perfilId, id: grupoId, direcao });

  revalidatePath("/");
  revalidatePath(PATH_PERSONALIZAR_MENU);
  redirect(destino(perfilId));
}

export async function moverItemMenuAction(formData: FormData) {
  await exigirAcesso();
  const perfilId = texto(formData, "perfilId");
  const itemId = texto(formData, "itemId");
  const direcao = texto(formData, "direcao") === "descer" ? "descer" : "subir";

  await moverItem({ perfilId, id: itemId, direcao });

  revalidatePath("/");
  revalidatePath(PATH_PERSONALIZAR_MENU);
  redirect(destino(perfilId));
}

export async function reordenarGruposMenuAction(params: {
  perfilId: string;
  grupoIds: string[];
}) {
  await exigirAcesso();
  const grupoIds = params.grupoIds.filter(Boolean);

  if (!params.perfilId || grupoIds.length === 0) {
    return { sucesso: false };
  }

  const grupos = await prisma.menuGrupoPerfil.findMany({
    where: { perfilId: params.perfilId, id: { in: grupoIds } },
    select: { id: true },
  });
  const idsPermitidos = new Set(grupos.map((grupo) => grupo.id));

  await prisma.$transaction(
    grupoIds
      .filter((id) => idsPermitidos.has(id))
      .map((id, indice) =>
        prisma.menuGrupoPerfil.update({
          where: { id },
          data: { ordem: (indice + 1) * 10 },
        }),
      ),
  );

  revalidatePath("/");
  revalidatePath(PATH_PERSONALIZAR_MENU);

  return { sucesso: true };
}

export async function reordenarItensMenuAction(params: {
  perfilId: string;
  grupoId?: string | null;
  itemIds: string[];
}) {
  await exigirAcesso();
  const itemIds = params.itemIds.filter(Boolean);
  const grupoId = params.grupoId || null;

  if (!params.perfilId || itemIds.length === 0) {
    return { sucesso: false };
  }

  const itens = await prisma.menuItemPerfil.findMany({
    where: {
      perfilId: params.perfilId,
      grupoId,
      id: { in: itemIds },
    },
    select: { id: true },
  });
  const idsPermitidos = new Set(itens.map((item) => item.id));

  await prisma.$transaction(
    itemIds
      .filter((id) => idsPermitidos.has(id))
      .map((id, indice) =>
        prisma.menuItemPerfil.update({
          where: { id },
          data: { ordem: (indice + 1) * 10 },
        }),
      ),
  );

  revalidatePath("/");
  revalidatePath(PATH_PERSONALIZAR_MENU);

  return { sucesso: true };
}

export async function moverItemEntreGruposMenuAction(params: {
  perfilId: string;
  itemId: string;
  grupoOrigemId?: string | null;
  grupoDestinoId?: string | null;
  itemDestinoId?: string | null;
}) {
  await exigirAcesso();
  const grupoOrigemId = params.grupoOrigemId || null;
  const grupoDestinoId = params.grupoDestinoId || null;

  if (!params.perfilId || !params.itemId || grupoOrigemId === grupoDestinoId) {
    return { sucesso: false };
  }

  const item = await prisma.menuItemPerfil.findFirst({
    where: {
      id: params.itemId,
      perfilId: params.perfilId,
      grupoId: grupoOrigemId,
    },
    select: { id: true },
  });

  if (!item) {
    return { sucesso: false };
  }

  if (grupoDestinoId) {
    const grupoDestino = await prisma.menuGrupoPerfil.findFirst({
      where: {
        id: grupoDestinoId,
        perfilId: params.perfilId,
      },
      select: { id: true },
    });

    if (!grupoDestino) {
      return { sucesso: false };
    }
  }

  const itensDestino = await prisma.menuItemPerfil.findMany({
    where: {
      perfilId: params.perfilId,
      grupoId: grupoDestinoId,
    },
    orderBy: [{ ordem: "asc" }, { itemCatalogo: "asc" }],
    select: { id: true },
  });
  const idsDestino = itensDestino.map((itemDestino) => itemDestino.id);
  const indiceDestino = params.itemDestinoId
    ? idsDestino.indexOf(params.itemDestinoId)
    : -1;
  const idsOrdenadosDestino = [...idsDestino];

  idsOrdenadosDestino.splice(
    indiceDestino >= 0 ? indiceDestino : idsOrdenadosDestino.length,
    0,
    params.itemId,
  );

  await prisma.$transaction(
    idsOrdenadosDestino.map((id, indice) =>
      prisma.menuItemPerfil.update({
        where: { id },
        data: {
          grupoId: id === params.itemId ? grupoDestinoId : undefined,
          ordem: (indice + 1) * 10,
        },
      }),
    ),
  );

  revalidatePath("/");
  revalidatePath(PATH_PERSONALIZAR_MENU);

  return { sucesso: true };
}
