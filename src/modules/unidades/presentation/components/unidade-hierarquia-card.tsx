"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, GitBranch } from "lucide-react";

type UnidadeResumo = {
  id: string;
  sigla: string;
  nome: string;
  tipo: string;
  ativo?: boolean;
};

type UnidadeHierarquiaCardProps = {
  unidadePai?: UnidadeResumo | null;
  unidadesFilhas?: UnidadeResumo[];
  mostrarUnidadesInativas?: boolean;
};

export function UnidadeHierarquiaCard({
  unidadePai,
  unidadesFilhas = [],
  mostrarUnidadesInativas = false,
}: UnidadeHierarquiaCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function alternarInativas(marcado: boolean) {
    const params = new URLSearchParams(searchParams.toString());

    if (marcado) {
      params.set("mostrarInativas", "1");
    } else {
      params.delete("mostrarInativas");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

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
              Esta unidade nao possui unidade superior cadastrada.
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-[var(--muted)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[var(--muted-foreground)]">
              Unidades subordinadas
            </p>
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)]">
              <input
                type="checkbox"
                checked={mostrarUnidadesInativas}
                onChange={(event) => alternarInativas(event.target.checked)}
                className="size-4 rounded border-border text-blue-900 focus:ring-ring"
              />
              Mostrar unidades inativas
            </label>
          </div>

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

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{filha.sigla}</p>
                    {filha.ativo === false && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Inativa
                      </span>
                    )}
                  </div>
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
