import Link from "next/link";
import { Building2, GitBranch } from "lucide-react";

type UnidadeResumo = {
  id: string;
  sigla: string;
  nome: string;
  tipo: string;
};

type UnidadeHierarquiaCardProps = {
  unidadePai?: UnidadeResumo | null;
  unidadesFilhas?: UnidadeResumo[];
};

export function UnidadeHierarquiaCard({
  unidadePai,
  unidadesFilhas = [],
}: UnidadeHierarquiaCardProps) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-center gap-2 border-b p-5">
        <GitBranch className="size-5 text-blue-900 dark:text-blue-300" />
        <h2 className="text-lg font-bold">Hierarquia da unidade</h2>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-2">
        <div className="rounded-xl border bg-[var(--muted)] p-4">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Unidade superior
          </p>

          {unidadePai ? (
            <Link
              href={`/unidades/${unidadePai.id}`}
              className="mt-3 flex gap-3 rounded-lg bg-[var(--card)] p-4 transition hover:ring-2 hover:ring-blue-800/20"
            >
              <Building2
                className="mt-1 size-5 shrink-0 text-blue-900 dark:text-blue-300"
                aria-hidden="true"
              />

              <div>
                <p className="font-bold">{unidadePai.sigla}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {unidadePai.nome}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                  {unidadePai.tipo}
                </p>
              </div>
            </Link>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              Esta unidade não possui unidade superior cadastrada.
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-[var(--muted)] p-4">
          <p className="text-sm font-semibold text-[var(--muted-foreground)]">
            Unidades subordinadas
          </p>

          <div className="mt-3 space-y-3">
            {unidadesFilhas.map((filha) => (
              <Link
                key={filha.id}
                href={`/unidades/${filha.id}`}
                className="flex gap-3 rounded-lg bg-[var(--card)] p-4 transition hover:ring-2 hover:ring-blue-800/20"
              >
                <Building2
                  className="mt-1 size-5 shrink-0 text-blue-900 dark:text-blue-300"
                  aria-hidden="true"
                />

                <div>
                  <p className="font-bold">{filha.sigla}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {filha.nome}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                    {filha.tipo}
                  </p>
                </div>
              </Link>
            ))}

            {unidadesFilhas.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">
                Nenhuma unidade subordinada cadastrada.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}