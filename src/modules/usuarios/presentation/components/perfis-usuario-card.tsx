import { ShieldCheck } from "lucide-react";
import { alterarStatusPerfilUsuarioAction } from "../../application/actions/alterar-status-perfil-usuario.action";

type UsuarioPerfilItem = {
  id: string;
  ativo: boolean;
  perfil: {
    id: string;
    codigo: string;
    nome: string;
    descricao: string | null;
    permissoes?: {
      permissao: {
        codigo: string;
      };
    }[];
  };
};

export function PerfisUsuarioCard({
  usuarioId,
  perfis,
}: {
  usuarioId: string;
  perfis: UsuarioPerfilItem[];
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-center gap-2 border-b p-5">
        <ShieldCheck className="size-5 text-blue-900 dark:text-blue-300" />
        <h2 className="text-lg font-bold">Perfis vinculados</h2>
      </div>

      <div className="divide-y">
        {perfis.map((usuarioPerfil) => {
          const alterarStatusAction = alterarStatusPerfilUsuarioAction.bind(
            null,
            usuarioPerfil.id,
            usuarioId,
            !usuarioPerfil.ativo
          );

          return (
            <div
              key={usuarioPerfil.id}
              className="flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center"
            >
              <div>
                <p className="font-semibold">{usuarioPerfil.perfil.nome}</p>

                <code className="mt-1 block text-xs text-[var(--muted-foreground)]">
                  {usuarioPerfil.perfil.codigo}
                </code>

                {usuarioPerfil.perfil.descricao && (
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    {usuarioPerfil.perfil.descricao}
                  </p>
                )}

                {usuarioPerfil.perfil.permissoes && (
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    Permissões: {usuarioPerfil.perfil.permissoes.length}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    usuarioPerfil.ativo
                      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {usuarioPerfil.ativo ? "Ativo" : "Inativo"}
                </span>

                <form action={alterarStatusAction}>
                  <button
                    type="submit"
                    className="rounded-md border px-3 py-1.5 text-xs font-semibold transition hover:bg-[var(--muted)]"
                  >
                    {usuarioPerfil.ativo ? "Inativar" : "Ativar"}
                  </button>
                </form>
              </div>
            </div>
          );
        })}

        {perfis.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            Nenhum perfil vinculado a este usuário.
          </div>
        )}
      </div>
    </section>
  );
}