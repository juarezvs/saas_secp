"use client";

import { useMemo, useState, useTransition } from "react";
import type { ElementType } from "react";
import * as LucideIcons from "lucide-react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  Menu as MenuIcon,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";

import {
  adicionarItemMenuAction,
  alternarGrupoMenuAction,
  alternarItemMenuAction,
  atualizarIconeGrupoMenuAction,
  atualizarRotuloGrupoMenuAction,
  atualizarRotuloItemMenuAction,
  criarGrupoMenuAction,
  moverItemEntreGruposMenuAction,
  moverGrupoMenuAction,
  moverItemMenuAction,
  reordenarGruposMenuAction,
  reordenarItensMenuAction,
  removerGrupoMenuAction,
  removerItemMenuAction,
} from "@/modules/menus/application/actions/personalizar-menu.actions";
import {
  MENU_CATALOGO,
  buscarItemCatalogoMenu,
  type MenuCatalogoItem,
} from "@/modules/menus/domain/menu-catalogo";
import type { MenuPersonalizadoPerfil } from "@/modules/menus/domain/menu-personalizado";
import { MENU_ITEMS, type MenuItem } from "@/components/layout/sidebar";
import { MenuCatalogoCombobox } from "./menu-catalogo-combobox";

type ItemMenu = MenuPersonalizadoPerfil["itensRaiz"][number];
type GrupoMenu = MenuPersonalizadoPerfil["grupos"][number];
type PerfilCarregado = {
  id: string;
  codigo: string;
  nome: string;
  administrativo: boolean;
  permissoes: string[];
};
type OpcaoMenuEfetiva = {
  id: string;
  href: string;
  label: string;
  permissoes: string[];
  icon: ElementType;
};
type DragItem =
  | { tipo: "grupo"; id: string }
  | { tipo: "item"; id: string; grupoId: string | null };

const ALIASES_ICONES: Record<string, string> = {
  administracao: "Settings",
  banco: "Hourglass",
  calendario: "CalendarDays",
  configurador: "Settings",
  equipe: "UsersRound",
  integracoes: "PlugZap",
  menu: "Menu",
  painel: "BarChart3",
  relatorios: "FileText",
  settings: "Settings",
  users: "UsersRound",
};

const ICONES_SUGERIDOS = [
  "Menu",
  "LayoutDashboard",
  "Fingerprint",
  "Clock",
  "History",
  "CalendarDays",
  "CalendarClock",
  "CalendarRange",
  "CalendarX",
  "TreePalm",
  "Hourglass",
  "UsersRound",
  "Users",
  "ClipboardList",
  "ShieldCheck",
  "FileText",
  "FileSpreadsheet",
  "BarChart3",
  "ScanFace",
  "Settings",
  "SlidersHorizontal",
  "Landmark",
  "Building2",
  "Network",
  "Upload",
  "Cpu",
  "ShieldAlert",
  "KeyRound",
  "ServerCog",
  "Palette",
  "DatabaseZap",
  "Activity",
  "Scale",
] as const;

function ehComponenteIconeLucide(componente: unknown) {
  return (
    typeof componente === "function" ||
    (typeof componente === "object" &&
      componente !== null &&
      "$$typeof" in componente)
  );
}

const ICONES_LUCIDE_MAP = Object.fromEntries(
  Object.entries(LucideIcons).filter(
    ([nome, componente]) =>
      /^[A-Z]/.test(nome) &&
      ehComponenteIconeLucide(componente) &&
      !nome.startsWith("Lucide") &&
      !nome.endsWith("Icon"),
  ),
) as Record<string, ElementType>;

function nomeIconeLucide(valor?: string | null) {
  const chave = valor?.trim();

  if (!chave) {
    return "Settings";
  }

  return ALIASES_ICONES[chave.toLowerCase()] ?? chave;
}

function listarIconesLucide(pesquisa: string) {
  const termo = pesquisa.trim().toLowerCase();
  const entradas = Object.entries(ICONES_LUCIDE_MAP);
  const sugeridos = new Set(ICONES_SUGERIDOS);

  return entradas
    .filter(([nome]) => {
      if (!termo) {
        return true;
      }

      return nome.toLowerCase().includes(termo);
    })
    .sort(([nomeA], [nomeB]) => {
      const aSugerido = sugeridos.has(nomeA as (typeof ICONES_SUGERIDOS)[number]);
      const bSugerido = sugeridos.has(nomeB as (typeof ICONES_SUGERIDOS)[number]);

      if (aSugerido !== bSugerido) {
        return aSugerido ? -1 : 1;
      }

      return nomeA.localeCompare(nomeB);
    });
}

function CamposPerfil({ perfilId }: { perfilId: string }) {
  return <input type="hidden" name="perfilId" value={perfilId} />;
}

function possuiAlgumaPermissao(perfil: PerfilCarregado, permissoes?: string[]) {
  if (!permissoes || permissoes.length === 0) {
    return true;
  }

  return permissoes.some((permissao) => perfil.permissoes.includes(permissao));
}

function itemPodeSerExibidoNoPerfil(item: MenuItem, perfil: PerfilCarregado) {
  const algumFilhoVisivel = item.children?.some((child) =>
    itemPodeSerExibidoNoPerfil(child, perfil),
  );

  if (algumFilhoVisivel) {
    return true;
  }

  const perfilPermitido = item.perfis
    ? item.perfis.includes(perfil.codigo.toUpperCase())
    : true;

  return perfilPermitido && possuiAlgumaPermissao(perfil, item.permissoes);
}

function filtrarItensMenuReal(
  itens: MenuItem[],
  perfil: PerfilCarregado,
  nivel = 0,
): MenuItem[] {
  const hrefsMovidosParaMinhaEquipeAdministrativa = new Set([
    "/homologacao",
    "/recesso-forense",
  ]);

  return itens
    .map((item) => ({
      ...item,
      children: item.children
        ? filtrarItensMenuReal(item.children, perfil, nivel + 1)
        : undefined,
    }))
    .filter((item) => {
      if (item.somenteAdministrativo && !perfil.administrativo) {
        return false;
      }

      if (item.ocultarQuandoAdministrativo && perfil.administrativo) {
        return false;
      }

      if (
        nivel === 0 &&
        perfil.administrativo &&
        hrefsMovidosParaMinhaEquipeAdministrativa.has(item.href)
      ) {
        return false;
      }

      return itemPodeSerExibidoNoPerfil(item, perfil);
    });
}

function achatarFilhosPrimeiro(itens: MenuItem[]): MenuItem[] {
  return itens.flatMap((item) => [
    ...(item.children ? achatarFilhosPrimeiro(item.children) : []),
    item,
  ]);
}

function montarOpcoesEfetivasPerfil(perfil: PerfilCarregado) {
  const opcoesVisiveis = achatarFilhosPrimeiro(
    filtrarItensMenuReal(MENU_ITEMS, perfil),
  );
  const porHref = new Map<string, OpcaoMenuEfetiva>();

  for (const item of opcoesVisiveis) {
    if (!porHref.has(item.href)) {
      porHref.set(item.href, {
        id: item.href,
        href: item.href,
        label: item.label,
        icon: item.icon,
        permissoes: (item.permissoes ?? []).filter((permissao) =>
          perfil.permissoes.includes(permissao),
        ),
      });
    }
  }

  for (const catalogo of MENU_CATALOGO) {
    if (!porHref.has(catalogo.id)) {
      const permissoes = (catalogo.permissoes ?? []).filter((permissao) =>
        perfil.permissoes.includes(permissao),
      );

      if (permissoes.length > 0 || !catalogo.permissoes?.length) {
        porHref.set(catalogo.id, {
          id: catalogo.id,
          href: catalogo.href,
          label: catalogo.label,
          icon: MenuIcon,
          permissoes,
        });
      }
    }
  }

  return porHref;
}

function BotaoIcone({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="submit"
      title={title}
      aria-label={title}
      className="inline-flex size-8 items-center justify-center rounded-md border bg-card text-muted-foreground transition hover:border-secp-blue-900 hover:text-secp-blue-900"
    >
      {children}
    </button>
  );
}

function AcoesGrupo({
  perfilId,
  grupo,
}: {
  perfilId: string;
  grupo: GrupoMenu;
}) {
  return (
    <div className="flex items-center gap-1">
      <form action={moverGrupoMenuAction}>
        <CamposPerfil perfilId={perfilId} />
        <input type="hidden" name="grupoId" value={grupo.id} />
        <input type="hidden" name="direcao" value="subir" />
        <BotaoIcone title="Mover grupo para cima">
          <ArrowUp className="size-4" />
        </BotaoIcone>
      </form>
      <form action={moverGrupoMenuAction}>
        <CamposPerfil perfilId={perfilId} />
        <input type="hidden" name="grupoId" value={grupo.id} />
        <input type="hidden" name="direcao" value="descer" />
        <BotaoIcone title="Mover grupo para baixo">
          <ArrowDown className="size-4" />
        </BotaoIcone>
      </form>
      <form action={alternarGrupoMenuAction}>
        <CamposPerfil perfilId={perfilId} />
        <input type="hidden" name="grupoId" value={grupo.id} />
        <input type="hidden" name="ativo" value={grupo.ativo ? "false" : "true"} />
        <BotaoIcone title={grupo.ativo ? "Ocultar grupo" : "Exibir grupo"}>
          {grupo.ativo ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </BotaoIcone>
      </form>
      <form action={removerGrupoMenuAction}>
        <CamposPerfil perfilId={perfilId} />
        <input type="hidden" name="grupoId" value={grupo.id} />
        <BotaoIcone title="Remover grupo">
          <Trash2 className="size-4" />
        </BotaoIcone>
      </form>
    </div>
  );
}

function AcoesItem({
  perfilId,
  item,
}: {
  perfilId: string;
  item: ItemMenu;
}) {
  return (
    <div className="flex items-center gap-1">
      <form action={moverItemMenuAction}>
        <CamposPerfil perfilId={perfilId} />
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="direcao" value="subir" />
        <BotaoIcone title="Mover item para cima">
          <ArrowUp className="size-4" />
        </BotaoIcone>
      </form>
      <form action={moverItemMenuAction}>
        <CamposPerfil perfilId={perfilId} />
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="direcao" value="descer" />
        <BotaoIcone title="Mover item para baixo">
          <ArrowDown className="size-4" />
        </BotaoIcone>
      </form>
      <form action={alternarItemMenuAction}>
        <CamposPerfil perfilId={perfilId} />
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="ativo" value={item.ativo ? "false" : "true"} />
        <BotaoIcone title={item.ativo ? "Ocultar item" : "Exibir item"}>
          {item.ativo ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </BotaoIcone>
      </form>
      <form action={removerItemMenuAction}>
        <CamposPerfil perfilId={perfilId} />
        <input type="hidden" name="itemId" value={item.id} />
        <BotaoIcone title="Remover item">
          <Trash2 className="size-4" />
        </BotaoIcone>
      </form>
    </div>
  );
}

function AddItemForm({
  perfilId,
  grupoId,
  itens,
}: {
  perfilId: string;
  grupoId?: string;
  itens: MenuCatalogoItem[];
}) {
  if (itens.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
        Todas as opcoes disponiveis para este perfil ja estao associadas ao menu.
      </div>
    );
  }

  return (
    <form
      action={adicionarItemMenuAction}
      className="grid gap-3 rounded-md border border-dashed bg-card p-3 lg:grid-cols-[minmax(18rem,1fr)_14rem_auto]"
    >
      <CamposPerfil perfilId={perfilId} />
      <input type="hidden" name="grupoId" value={grupoId ?? ""} />
      <MenuCatalogoCombobox itens={itens} name="itemCatalogo" />
      <input
        name="label"
        placeholder="Rotulo opcional"
        className="h-10 rounded-md border bg-background px-3 text-sm"
      />
      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-secp-blue-900 px-4 text-sm font-semibold text-white transition hover:bg-secp-blue-800">
        <Plus className="size-4" />
        Adicionar
      </button>
    </form>
  );
}

function RotuloEditavelItem({
  perfilId,
  item,
  label,
}: {
  perfilId: string;
  item: ItemMenu;
  label: string;
}) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <form
        action={atualizarRotuloItemMenuAction}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <CamposPerfil perfilId={perfilId} />
        <input type="hidden" name="itemId" value={item.id} />
        <input
          name="label"
          defaultValue={item.label || label}
          autoFocus
          className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm font-semibold"
        />
        <button
          type="submit"
          className="h-8 rounded-md bg-secp-blue-900 px-3 text-xs font-semibold text-white"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          className="h-8 rounded-md border px-3 text-xs font-semibold text-muted-foreground"
        >
          Cancelar
        </button>
      </form>
    );
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="block min-w-0 flex-1 truncate">
        {label}
        {!item.ativo ? " - oculto" : ""}
      </span>
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground transition hover:border-secp-blue-900 hover:text-secp-blue-900"
        title="Editar nome exibido no menu"
        aria-label="Editar nome exibido no menu"
      >
        <Pencil className="size-3.5" />
      </button>
    </span>
  );
}

function RotuloEditavelGrupo({
  perfilId,
  grupo,
  editarInicial = false,
}: {
  perfilId: string;
  grupo: GrupoMenu;
  editarInicial?: boolean;
}) {
  const [editando, setEditando] = useState(editarInicial);
  const [labelEditado, setLabelEditado] = useState(grupo.label);

  if (editando) {
    return (
      <form
        action={atualizarRotuloGrupoMenuAction}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        draggable={false}
        className="flex min-w-[16rem] flex-1 items-center gap-2"
      >
        <CamposPerfil perfilId={perfilId} />
        <input type="hidden" name="grupoId" value={grupo.id} />
        <input
          name="label"
          value={labelEditado}
          onChange={(event) => setLabelEditado(event.target.value)}
          autoFocus
          className="h-8 min-w-[12rem] flex-1 rounded-md border bg-background px-2 text-sm font-semibold"
        />
        <button
          type="submit"
          className="h-8 rounded-md bg-secp-blue-900 px-3 text-xs font-semibold text-white"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setEditando(false);
          }}
          className="h-8 rounded-md border px-3 text-xs font-semibold text-muted-foreground"
        >
          Cancelar
        </button>
      </form>
    );
  }

  return (
    <span
      className="flex min-w-0 flex-1 items-center gap-2"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <span className="min-w-0 flex-1 truncate">
        {grupo.label}
        {!grupo.ativo ? " - oculto" : ""}
      </span>
      <button
        type="button"
        draggable={false}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setLabelEditado(grupo.label);
          setEditando(true);
        }}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground transition hover:border-secp-blue-900 hover:text-secp-blue-900"
        title="Editar nome do grupo"
        aria-label="Editar nome do grupo"
      >
        <Pencil className="size-3.5" />
      </button>
    </span>
  );
}

function SeletorIconeGrupo({
  perfilId,
  grupo,
}: {
  perfilId: string;
  grupo: GrupoMenu;
}) {
  const [aberto, setAberto] = useState(false);
  const [pesquisa, setPesquisa] = useState("");
  const IconeAtual =
    ICONES_LUCIDE_MAP[nomeIconeLucide(grupo.icone || grupo.label)] ?? Settings;
  const icones = listarIconesLucide(pesquisa);

  return (
    <>
      <button
        type="button"
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setAberto(true);
        }}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground transition hover:border-secp-blue-900 hover:text-secp-blue-900"
        title="Escolher icone do grupo"
        aria-label="Escolher icone do grupo"
      >
        <IconeAtual className="size-4" aria-hidden="true" />
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Escolher icone do grupo"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex max-h-[min(42rem,88vh)] w-full max-w-3xl flex-col rounded-lg border bg-white text-slate-950 shadow-floating dark:bg-slate-950 dark:text-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="min-w-0">
                <h3 className="text-sm font-bold">Icone do grupo</h3>
                <p className="truncate text-xs text-muted-foreground">
                  {grupo.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="inline-flex size-9 items-center justify-center rounded-md border text-muted-foreground transition hover:border-secp-blue-900 hover:text-secp-blue-900"
                aria-label="Fechar seletor de icone"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="border-b border-slate-200 p-4 dark:border-slate-800">
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  value={pesquisa}
                  onChange={(event) => setPesquisa(event.target.value)}
                  autoFocus
                  placeholder="Pesquisar por nome do icone"
                  className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-400"
                />
              </label>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto bg-slate-100 p-4 dark:bg-slate-900 sm:grid-cols-3 md:grid-cols-4">
              {icones.map(([nome, Icone]) => {
                const selecionado = nomeIconeLucide(grupo.icone) === nome;

                return (
                  <form key={nome} action={atualizarIconeGrupoMenuAction}>
                    <CamposPerfil perfilId={perfilId} />
                    <input type="hidden" name="grupoId" value={grupo.id} />
                    <input type="hidden" name="icone" value={nome} />
                    <button
                      type="submit"
                      className={[
                        "flex h-20 w-full flex-col items-center justify-center gap-2 rounded-md border px-2 text-xs font-semibold shadow-sm transition",
                        selecionado
                          ? "border-secp-blue-900 bg-white ring-2 ring-secp-blue-900/35 dark:border-blue-300 dark:bg-slate-950 dark:ring-blue-300/35"
                          : "border-slate-300 bg-white hover:border-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-400 dark:hover:bg-slate-900",
                      ].join(" ")}
                      title={nome}
                    >
                      <Icone
                        className={[
                          "size-5",
                          selecionado
                            ? "text-secp-blue-900 dark:text-blue-200"
                            : "text-slate-900 dark:text-slate-100",
                        ].join(" ")}
                        aria-hidden="true"
                      />
                      <span className="max-w-full truncate text-slate-800 dark:text-slate-100">
                        {nome}
                      </span>
                    </button>
                  </form>
                );
              })}
              {icones.length === 0 && (
                <p className="col-span-full rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhum icone encontrado.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function moverArray<T extends { id: string }>(itens: T[], origemId: string, destinoId: string) {
  const origem = itens.findIndex((item) => item.id === origemId);
  const destino = itens.findIndex((item) => item.id === destinoId);

  if (origem < 0 || destino < 0 || origem === destino) {
    return itens;
  }

  const atualizados = [...itens];
  const [removido] = atualizados.splice(origem, 1);
  atualizados.splice(destino, 0, removido);

  return atualizados;
}

function LinhaItemMenu({
  perfilId,
  item,
  opcaoEfetiva,
  nivel = 0,
  grupoId = null,
  dragging,
  onDragStart,
  onDropItem,
}: {
  perfilId: string;
  item: ItemMenu;
  opcaoEfetiva?: OpcaoMenuEfetiva;
  nivel?: number;
  grupoId?: string | null;
  dragging?: boolean;
  onDragStart?: (drag: DragItem) => void;
  onDropItem?: (destinoId: string, grupoId: string | null) => void;
}) {
  const catalogo = buscarItemCatalogoMenu(item.itemCatalogo);
  const label = item.label || opcaoEfetiva?.label || catalogo?.label || item.itemCatalogo;
  const IconeItem = opcaoEfetiva?.icon ?? MenuIcon;
  const hrefItem = opcaoEfetiva?.href ?? catalogo?.href ?? item.itemCatalogo;
  const contextoItem =
    catalogo?.label && catalogo.label !== label
      ? `${catalogo.label} - ${hrefItem}`
      : hrefItem;
  const classeVisual = [
    nivel > 0 ? "secp-sidebar-subitem text-xs" : "secp-sidebar-item text-sm",
    "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left font-semibold transition",
    item.ativo
      ? "bg-white text-slate-700 hover:bg-secp-blue-900/10 hover:text-secp-blue-900 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
      : "grayscale bg-muted/50 text-muted-foreground opacity-55 saturate-0",
    dragging ? "ring-2 ring-secp-blue-900/40" : "",
  ].join(" ");

  return (
    <div
      className="grid gap-2 lg:grid-cols-[minmax(18rem,24rem)_auto] lg:items-start"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDropItem?.(item.id, grupoId);
      }}
    >
      <div
        className={classeVisual}
        title={contextoItem}
      >
        <span
          className="mt-0.5 inline-flex size-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
          draggable
          onDragStart={(event) => {
            event.stopPropagation();
            onDragStart?.({ tipo: "item", id: item.id, grupoId });
            event.dataTransfer.effectAllowed = "move";
          }}
          onDragEnd={(event) => event.stopPropagation()}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </span>
        <IconeItem className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <RotuloEditavelItem perfilId={perfilId} item={item} label={label} />
          <span className="mt-1 block truncate text-[11px] font-medium leading-none text-slate-500 dark:text-slate-400">
            {contextoItem}
          </span>
        </span>
      </div>
      <AcoesItem perfilId={perfilId} item={item} />
    </div>
  );
}

function GrupoMenu({
  perfilId,
  grupo,
  opcoesEfetivas,
  opcoesDisponiveis,
  aberto,
  adicionandoItem,
  onAlternar,
  onAdicionarItem,
  dragging,
  onDragStart,
  onDropGrupo,
  onDropItem,
  onDropItemNoGrupo,
  editarInicial,
}: {
  perfilId: string;
  grupo: GrupoMenu;
  opcoesEfetivas: Map<string, OpcaoMenuEfetiva>;
  opcoesDisponiveis: MenuCatalogoItem[];
  aberto: boolean;
  adicionandoItem: boolean;
  onAlternar: () => void;
  onAdicionarItem: () => void;
  dragging?: boolean;
  onDragStart: (drag: DragItem) => void;
  onDropGrupo: (destinoId: string) => void;
  onDropItem: (destinoId: string, grupoId: string | null) => void;
  onDropItemNoGrupo: (grupoId: string) => void;
  editarInicial?: boolean;
}) {
  const IconeGrupo =
    ICONES_LUCIDE_MAP[nomeIconeLucide(grupo.icone || grupo.label)] ?? Settings;

  return (
    <div
      className="space-y-2"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDropGrupo(grupo.id);
      }}
    >
      <div className="grid gap-2 lg:grid-cols-[minmax(18rem,22rem)_auto] lg:items-center">
        <div
          onClick={onAlternar}
          aria-expanded={aberto}
          className={[
            "secp-sidebar-item flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition",
            grupo.ativo
              ? "bg-white text-slate-700 hover:bg-secp-blue-900/10 hover:text-secp-blue-900 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
              : "bg-muted/40 text-muted-foreground opacity-70",
            dragging ? "ring-2 ring-secp-blue-900/40" : "",
          ].join(" ")}
        >
          <span
            className="inline-flex size-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
            draggable
            onClick={(event) => event.stopPropagation()}
            onDragStart={(event) => {
              event.stopPropagation();
              onDragStart({ tipo: "grupo", id: grupo.id });
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={(event) => event.stopPropagation()}
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </span>
          <IconeGrupo className="size-4 shrink-0" aria-hidden="true" />
          <RotuloEditavelGrupo
            perfilId={perfilId}
            grupo={grupo}
            editarInicial={editarInicial}
          />
          <SeletorIconeGrupo perfilId={perfilId} grupo={grupo} />
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onAdicionarItem();
            }}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground transition hover:border-secp-blue-900 hover:text-secp-blue-900"
            title="Adicionar item neste grupo"
            aria-label="Adicionar item neste grupo"
          >
            <Plus className="size-3.5" />
          </button>
          <ChevronDown
            className={[
              "size-4 shrink-0 transition-transform",
              aberto ? "rotate-180" : "",
            ].join(" ")}
            aria-hidden="true"
          />
        </div>
        <AcoesGrupo perfilId={perfilId} grupo={grupo} />
      </div>

      {aberto && (
        <div className="ml-4 space-y-2 border-l border-border pl-2">
          {grupo.itens.map((item) => (
            <LinhaItemMenu
              key={item.id}
              perfilId={perfilId}
              item={item}
              opcaoEfetiva={opcoesEfetivas.get(item.itemCatalogo)}
              nivel={1}
              grupoId={grupo.id}
              onDragStart={onDragStart}
              onDropItem={onDropItem}
            />
          ))}
          {grupo.itens.length === 0 && (
            <p
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDropItemNoGrupo(grupo.id);
              }}
              className="rounded-md border border-dashed bg-card px-3 py-4 text-sm text-muted-foreground"
            >
              Nenhum item neste grupo.
            </p>
          )}
          {adicionandoItem && (
            <AddItemForm
              perfilId={perfilId}
              grupoId={grupo.id}
              itens={opcoesDisponiveis}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function MenuLateralPersonalizacao({
  perfilId,
  menu,
  editarGrupoIdInicial,
  perfilCarregado,
}: {
  perfilId: string;
  menu: MenuPersonalizadoPerfil;
  editarGrupoIdInicial?: string;
  perfilCarregado: PerfilCarregado;
}) {
  const [itensRaiz, setItensRaiz] = useState(menu.itensRaiz);
  const [grupos, setGrupos] = useState(menu.grupos);
  const [gruposAlternados, setGruposAlternados] = useState<Record<string, boolean>>(
    editarGrupoIdInicial ? { [editarGrupoIdInicial]: true } : {},
  );
  const [grupoAdicionandoItemId, setGrupoAdicionandoItemId] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [, startTransition] = useTransition();
  const vazio = itensRaiz.length === 0 && grupos.length === 0;
  const idsNoMenu = useMemo(
    () =>
      new Set([
        ...itensRaiz.map((item) => item.itemCatalogo),
        ...grupos.flatMap((grupo) => grupo.itens.map((item) => item.itemCatalogo)),
      ]),
    [grupos, itensRaiz],
  );
  const opcoesEfetivas = useMemo(
    () => montarOpcoesEfetivasPerfil(perfilCarregado),
    [perfilCarregado],
  );
  const opcoesDisponiveis = Array.from(opcoesEfetivas.values()).filter(
    (item) => !idsNoMenu.has(item.id),
  );
  const opcoesDisponiveisCatalogo = opcoesDisponiveis.map((opcao) => ({
    id: opcao.id,
    href: opcao.href,
    label: opcao.label,
    permissoes: opcao.permissoes,
  }));

  function grupoAberto(grupo: GrupoMenu) {
    return gruposAlternados[grupo.id] ?? false;
  }

  function alternarGrupo(grupo: GrupoMenu) {
    const abertoAtual = grupoAberto(grupo);

    setGruposAlternados((gruposAtuais) => ({
      ...gruposAtuais,
      [grupo.id]: !abertoAtual,
    }));
  }

  function abrirAdicionarItemGrupo(grupo: GrupoMenu) {
    setGrupoAdicionandoItemId((grupoAtual) =>
      grupoAtual === grupo.id ? null : grupo.id,
    );
    setGruposAlternados((gruposAtuais) => ({
      ...gruposAtuais,
      [grupo.id]: true,
    }));
  }

  function reordenarGrupo(destinoId: string) {
    if (dragItem?.tipo !== "grupo") {
      return;
    }

    const gruposAtualizados = moverArray(grupos, dragItem.id, destinoId);
    setGrupos(gruposAtualizados);
    setDragItem(null);
    startTransition(() => {
      void reordenarGruposMenuAction({
        perfilId,
        grupoIds: gruposAtualizados.map((grupo) => grupo.id),
      });
    });
  }

  function localizarItem(id: string, grupoId: string | null) {
    if (grupoId === null) {
      return itensRaiz.find((item) => item.id === id);
    }

    return grupos
      .find((grupo) => grupo.id === grupoId)
      ?.itens.find((item) => item.id === id);
  }

  function moverItemEntreGrupos(
    grupoDestinoId: string | null,
    itemDestinoId: string | null = null,
  ) {
    if (dragItem?.tipo !== "item" || dragItem.grupoId === grupoDestinoId) {
      return;
    }

    const itemMovido = localizarItem(dragItem.id, dragItem.grupoId);

    if (!itemMovido) {
      setDragItem(null);
      return;
    }

    const itensRaizSemItem =
      dragItem.grupoId === null
        ? itensRaiz.filter((item) => item.id !== dragItem.id)
        : itensRaiz;

    const inserirNoDestino = (itens: ItemMenu[]) => {
      const itensSemDuplicidade = itens.filter((item) => item.id !== dragItem.id);
      const indiceDestino = itemDestinoId
        ? itensSemDuplicidade.findIndex((item) => item.id === itemDestinoId)
        : -1;

      return [
        ...itensSemDuplicidade.slice(
          0,
          indiceDestino >= 0 ? indiceDestino : itensSemDuplicidade.length,
        ),
        itemMovido,
        ...itensSemDuplicidade.slice(
          indiceDestino >= 0 ? indiceDestino : itensSemDuplicidade.length,
        ),
      ];
    };

    setItensRaiz(
      grupoDestinoId === null
        ? inserirNoDestino(itensRaizSemItem)
        : itensRaizSemItem,
    );
    setGrupos((gruposAtuais) =>
      gruposAtuais.map((grupo) => {
        const itensSemItem =
          dragItem.grupoId === grupo.id
            ? grupo.itens.filter((item) => item.id !== dragItem.id)
            : grupo.itens;

        return {
          ...grupo,
          itens:
            grupoDestinoId === grupo.id
              ? inserirNoDestino(itensSemItem)
              : itensSemItem,
        };
      }),
    );
    setGruposAlternados((gruposAtuais) =>
      grupoDestinoId
        ? {
            ...gruposAtuais,
            [grupoDestinoId]: true,
          }
        : gruposAtuais,
    );

    const grupoOrigemId = dragItem.grupoId;
    const itemId = dragItem.id;
    setDragItem(null);
    startTransition(() => {
      void moverItemEntreGruposMenuAction({
        perfilId,
        itemId,
        grupoOrigemId,
        grupoDestinoId,
        itemDestinoId,
      });
    });
  }

  function soltarNoGrupo(grupoId: string) {
    if (dragItem?.tipo === "item") {
      moverItemEntreGrupos(grupoId);
      return;
    }

    reordenarGrupo(grupoId);
  }

  function reordenarItem(destinoId: string, grupoId: string | null) {
    if (dragItem?.tipo !== "item") {
      return;
    }

    if (dragItem.grupoId !== grupoId) {
      moverItemEntreGrupos(grupoId, destinoId);
      return;
    }

    if (grupoId === null) {
      const itensAtualizados = moverArray(itensRaiz, dragItem.id, destinoId);
      setItensRaiz(itensAtualizados);
      setDragItem(null);
      startTransition(() => {
        void reordenarItensMenuAction({
          perfilId,
          grupoId: null,
          itemIds: itensAtualizados.map((item) => item.id),
        });
      });
      return;
    }

    const gruposAtualizados = grupos.map((grupo) => {
      if (grupo.id !== grupoId) {
        return grupo;
      }

      return {
        ...grupo,
        itens: moverArray(grupo.itens, dragItem.id, destinoId),
      };
    });
    const grupoAtualizado = gruposAtualizados.find((grupo) => grupo.id === grupoId);

    setGrupos(gruposAtualizados);
    setDragItem(null);
    startTransition(() => {
      void reordenarItensMenuAction({
        perfilId,
        grupoId,
        itemIds: grupoAtualizado?.itens.map((item) => item.id) ?? [],
      });
    });
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-4">
        <h2 className="font-bold">Menu lateral do perfil carregado</h2>
        <p className="text-sm text-muted-foreground">
          Clique nos grupos para expandir ou recolher. Os itens finais nao navegam nesta tela.
        </p>
      </div>

      <div className="rounded-xl border bg-muted/30 p-3">
        <div className="mb-3 flex flex-col gap-3 rounded-md border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase text-secp-blue-800">
              SECP
            </p>
            <p className="text-sm font-semibold text-muted-foreground">
              Simulacao editavel do menu lateral
            </p>
          </div>
          <div className="inline-flex max-w-full items-center rounded-md border border-secp-blue-900/20 bg-secp-blue-900/10 px-3 py-1.5 text-sm font-black text-secp-blue-900 dark:border-white/15 dark:bg-white/10 dark:text-blue-100">
            <span className="truncate">
              {perfilCarregado.nome} ({perfilCarregado.codigo})
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {itensRaiz.map((item) => (
            <LinhaItemMenu
              key={item.id}
              perfilId={perfilId}
              item={item}
              opcaoEfetiva={opcoesEfetivas.get(item.itemCatalogo)}
              grupoId={null}
              dragging={dragItem?.tipo === "item" && dragItem.id === item.id}
              onDragStart={setDragItem}
              onDropItem={reordenarItem}
            />
          ))}
          <div className="flex items-center justify-between gap-3 py-1">
            <span className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Grupos
            </span>
            <form action={criarGrupoMenuAction}>
              <CamposPerfil perfilId={perfilId} />
              <input type="hidden" name="label" value="Novo grupo" />
              <input type="hidden" name="icone" value="menu" />
              <input type="hidden" name="topo" value="true" />
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-2 rounded-md border border-secp-blue-900/20 bg-secp-blue-900/10 px-3 text-xs font-bold text-secp-blue-900 transition hover:bg-secp-blue-900 hover:text-white"
                title="Adicionar grupo no topo do menu"
              >
                <Plus className="size-3.5" />
                Grupo
              </button>
            </form>
          </div>
          {grupos.map((grupo) => (
            <GrupoMenu
              key={grupo.id}
              perfilId={perfilId}
              grupo={grupo}
              opcoesEfetivas={opcoesEfetivas}
              opcoesDisponiveis={opcoesDisponiveisCatalogo}
              aberto={grupoAberto(grupo)}
              adicionandoItem={grupoAdicionandoItemId === grupo.id}
              onAlternar={() => alternarGrupo(grupo)}
              onAdicionarItem={() => abrirAdicionarItemGrupo(grupo)}
              dragging={dragItem?.tipo === "grupo" && dragItem.id === grupo.id}
              onDragStart={setDragItem}
              onDropGrupo={soltarNoGrupo}
              onDropItem={reordenarItem}
              onDropItemNoGrupo={soltarNoGrupo}
              editarInicial={editarGrupoIdInicial === grupo.id}
            />
          ))}
          {vazio && (
            <div className="rounded-md border border-dashed bg-card px-3 py-4 text-sm text-muted-foreground">
              Sem personalizacao ativa. O menu padrao sera usado.
            </div>
          )}
          <div className="rounded-lg border bg-card p-3">
            <h3 className="mb-2 text-sm font-bold">Adicionar item sem grupo</h3>
            <AddItemForm perfilId={perfilId} itens={opcoesDisponiveisCatalogo} />
          </div>
          {opcoesDisponiveis.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  Opcoes fora do menu
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Itens permitidos para este perfil que ainda nao aparecem no menu lateral.
                  Clique para adicionar sem grupo.
                </p>
              </div>
              <div className="grid gap-2 xl:grid-cols-2">
                {opcoesDisponiveis.map((opcao) => {
                  const IconeOpcao = opcao.icon;

                  return (
                    <form
                      key={opcao.id}
                      action={adicionarItemMenuAction}
                    >
                      <CamposPerfil perfilId={perfilId} />
                      <input type="hidden" name="grupoId" value="" />
                      <input type="hidden" name="itemCatalogo" value={opcao.id} />
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-left text-sm font-semibold text-slate-900 shadow-sm transition hover:border-secp-blue-900 hover:bg-white hover:text-secp-blue-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-300 dark:hover:bg-slate-950 dark:hover:text-blue-100"
                        title={`Adicionar ${opcao.label}`}
                      >
                        <IconeOpcao className="size-4 shrink-0 text-slate-700 dark:text-slate-100" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{opcao.label}</span>
                          <span className="mt-1 block truncate text-[11px] font-medium leading-none text-slate-500 dark:text-slate-400">
                            {opcao.href}
                          </span>
                        </span>
                      </button>
                    </form>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
