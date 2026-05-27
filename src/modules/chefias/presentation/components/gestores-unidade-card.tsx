import { UserCheck } from "lucide-react";
import { encerrarGestorUnidadeAction } from "../../application/actions/encerrar-gestor-unidade.action";

type GestorItem = {
  id: string;
  papel: string;
  ativo: boolean;
  dataInicio: Date;
  dataFim: Date | null;
  unidadeId: string;
  servidor: {
    matricula: string;
    usuario: {
      nome: string;
      email: string | null;
    };
  };
};

function formatarData(data: Date | null) {
  if (!data) {
    return "Atual";
  }

  return new Intl.DateTimeFormat("pt-BR").format(data);
}

function rotuloPapel(papel: string) {
  const rotulos: Record<string, string> = {
    GESTOR_TITULAR: "Gestor titular",
    GESTOR_SUBSTITUTO: "Gestor substituto",
    DELEGADO_CHEFIA: "Delegado da chefia",
  };

  return rotulos[papel] ?? papel;
}

export function GestoresUnidadeCard({
  unidadeId,
  gestores,
}: {
  unidadeId: string;
  gestores: GestorItem[];
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-center gap-2 border-b p-5">
        <UserCheck className="size-5 text-blue-900 dark:text-blue-300" />
        <h2 className="text-lg font-bold">Chefias e delegações</h2>
      </div>

      <div className="divide-y">
        {gestores.map((gestor) => {
          const encerrarAction = encerrarGestorUnidadeAction.bind(
            null,
            gestor.id,
            unidadeId
          );

          return (
            <div
              key={gestor.id}
              className="flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center"
            >
              <div>
                <p className="font-semibold">{gestor.servidor.usuario.nome}</p>

                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Matrícula: {gestor.servidor.matricula}
                  {gestor.servidor.usuario.email
                    ? ` • ${gestor.servidor.usuario.email}`
                    : ""}
                </p>

                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {formatarData(gestor.dataInicio)} →{" "}
                  {formatarData(gestor.dataFim)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                  {rotuloPapel(gestor.papel)}
                </span>

                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    gestor.ativo
                      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {gestor.ativo ? "Ativo" : "Encerrado"}
                </span>

                {gestor.ativo && !gestor.dataFim && (
                  <form action={encerrarAction}>
                    <button
                      type="submit"
                      className="rounded-md border px-3 py-1.5 text-xs font-semibold transition hover:bg-[var(--muted)]"
                    >
                      Encerrar
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}

        {gestores.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            Nenhuma chefia ou delegação cadastrada para esta unidade.
          </div>
        )}
      </div>
    </section>
  );
}