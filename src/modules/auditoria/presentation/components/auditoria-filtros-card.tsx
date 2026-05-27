type UsuarioFiltro = {
  id: string;
  nome: string;
  matricula: string;
};

type AuditoriaFiltrosCardProps = {
  usuarios: UsuarioFiltro[];
  entidades: string[];
  valores: {
    busca?: string;
    entidade?: string;
    acao?: string;
    usuarioId?: string;
    dataInicio?: string;
    dataFim?: string;
    limite?: string;
  };
};

export function AuditoriaFiltrosCard({
  usuarios,
  entidades,
  valores,
}: AuditoriaFiltrosCardProps) {
  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <h2 className="text-lg font-bold">Filtros de auditoria</h2>

      <form className="mt-5 grid gap-4 lg:grid-cols-6">
        <input
          name="busca"
          defaultValue={valores.busca ?? ""}
          placeholder="Buscar por ação, entidade, usuário ou ID"
          className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm lg:col-span-2"
        />

        <select
          name="entidade"
          defaultValue={valores.entidade ?? ""}
          className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
        >
          <option value="">Todas as entidades</option>
          {entidades.map((entidade) => (
            <option key={entidade} value={entidade}>
              {entidade}
            </option>
          ))}
        </select>

        <input
          name="acao"
          defaultValue={valores.acao ?? ""}
          placeholder="Ação"
          className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
        />

        <select
          name="usuarioId"
          defaultValue={valores.usuarioId ?? ""}
          className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
        >
          <option value="">Todos os usuários</option>
          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.matricula} — {usuario.nome}
            </option>
          ))}
        </select>

        <select
          name="limite"
          defaultValue={valores.limite ?? "20"}
          className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
        >
          <option value="10">10 por página</option>
          <option value="20">20 por página</option>
          <option value="50">50 por página</option>
          <option value="100">100 por página</option>
        </select>

        <input
          type="date"
          name="dataInicio"
          defaultValue={valores.dataInicio ?? ""}
          className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
        />

        <input
          type="date"
          name="dataFim"
          defaultValue={valores.dataFim ?? ""}
          className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
        />

        <button
          type="submit"
          className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 lg:col-span-2"
        >
          Filtrar
        </button>
      </form>
    </section>
  );
}
