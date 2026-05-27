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
  
  function agruparPorRecurso(permissoes: PermissaoItem[]) {
    return permissoes.reduce<Record<string, PermissaoItem[]>>((acc, permissao) => {
      if (!acc[permissao.recurso]) {
        acc[permissao.recurso] = [];
      }
  
      acc[permissao.recurso].push(permissao);
  
      return acc;
    }, {});
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
              {recurso}
            </h3>
  
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {permissoesDoRecurso.map((permissao) => (
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
  
                  <span>
                    <span className="block font-semibold">
                      {permissao.acao}:{permissao.escopo}
                    </span>
  
                    <code className="mt-1 block text-xs text-[var(--muted-foreground)]">
                      {permissao.codigo}
                    </code>
  
                    {permissao.descricao && (
                      <span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">
                        {permissao.descricao}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }