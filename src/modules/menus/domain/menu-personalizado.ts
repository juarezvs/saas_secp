export type MenuPersonalizadoItem = {
  id: string;
  itemCatalogo: string;
  label?: string | null;
  ordem: number;
  ativo: boolean;
};

export type MenuPersonalizadoGrupo = {
  id: string;
  label: string;
  icone?: string | null;
  ordem: number;
  ativo: boolean;
  itens: MenuPersonalizadoItem[];
};

export type MenuPersonalizadoPerfil = {
  perfilId: string;
  grupos: MenuPersonalizadoGrupo[];
  itensRaiz: MenuPersonalizadoItem[];
};

export type MenuItemCatalogoIcone = {
  itemCatalogo: string;
  icone?: string | null;
};

export type IconesItensCatalogoMenu = Record<string, string | null>;

export type MenusPersonalizadosPorPerfil = Record<string, MenuPersonalizadoPerfil>;
