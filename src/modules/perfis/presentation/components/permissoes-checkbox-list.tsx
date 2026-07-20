import { MENU_CATALOGO } from "@/modules/menus/domain/menu-catalogo";

type PermissaoItem = {
  id: string;
  codigo: string;
  recurso: string;
  acao: string;
  escopo: string;
  descricao: string | null;
};

type PermissoesCheckboxListProps = {
  permissoes: PermissaoItem[];
  permissoesSelecionadas?: string[];
};

const ROTULOS_ESCOPO: Record<string, string> = {
  proprio: "Proprio",
  subordinados: "Subordinados",
  seccional: "Seccional",
  global: "Global",
  chefia: "Chefia",
  secad: "SECAD",
};

function capitalizar(valor: string) {
  return valor
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function agruparPorRecurso(permissoes: PermissaoItem[]) {
  return permissoes.reduce<Record<string, PermissaoItem[]>>((acc, permissao) => {
    if (!acc[permissao.recurso]) {
      acc[permissao.recurso] = [];
    }

    acc[permissao.recurso].push(permissao);

    return acc;
  }, {});
}

function menusRelacionados(codigoPermissao: string) {
  return MENU_CATALOGO.filter((item) =>
    item.permissoes?.includes(codigoPermissao),
  );
}

function rotuloPermissao(permissao: PermissaoItem) {
  const menus = menusRelacionados(permissao.codigo);

  if (menus.length === 1) {
    return menus[0].label;
  }

  if (menus.length > 1) {
    return `${capitalizar(permissao.recurso)} - ${capitalizar(permissao.acao)}`;
  }

  return `${capitalizar(permissao.recurso)} - ${capitalizar(permissao.acao)}`;
}

function rotuloEscopo(escopo: string) {
  return ROTULOS_ESCOPO[escopo] ?? capitalizar(escopo);
}

export function PermissoesCheckboxList({
  permissoes,
  permissoesSelecionadas = [],
}: PermissoesCheckboxListProps) {
  const grupos = agruparPorRecurso(permissoes);

  return (
    <div className="space-y-4">
      {Object.entries(grupos).map(([recurso, permissoesDoRecurso]) => (
        <section
          key={recurso}
          className="rounded-xl border bg-[var(--card)] p-4"
        >
          <h3 className="font-bold capitalize text-[var(--foreground)]">
            {recurso.replaceAll("-", " ")}
          </h3>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {permissoesDoRecurso.map((permissao) => {
              const menus = menusRelacionados(permissao.codigo);

              return (
                <label
                  key={permissao.id}
                  className="flex cursor-pointer gap-3 rounded-lg border bg-[var(--muted)] p-3 text-sm transition hover:border-blue-300"
                >
                  <input
                    type="checkbox"
                    name="permissoes"
                    value={permissao.id}
                    defaultChecked={permissoesSelecionadas.includes(permissao.id)}
                    className="mt-1 size-4 rounded border-slate-300"
                  />

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[var(--foreground)]">
                        {rotuloPermissao(permissao)}
                      </span>
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
                        {rotuloEscopo(permissao.escopo)}
                      </span>
                    </span>

                    <code className="mt-1 block text-xs text-[var(--muted-foreground)]">
                      {permissao.codigo}
                    </code>

                    {menus.length > 0 && (
                      <span className="mt-2 block space-y-1">
                        {menus.map((menu) => (
                          <span
                            key={menu.id}
                            className="block truncate text-xs font-medium text-slate-600 dark:text-slate-300"
                            title={`${menu.label} - ${menu.href}`}
                          >
                            Menu: {menu.label} - {menu.href}
                          </span>
                        ))}
                      </span>
                    )}

                    {permissao.descricao && (
                      <span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">
                        {permissao.descricao}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
