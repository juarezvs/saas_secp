import Link from "next/link";
import type { ReactNode } from "react";

type TeamsPageShellProps = {
  titulo: string;
  descricao: string;
  hrefPrincipal: string;
  children?: ReactNode;
};

export function TeamsPageShell({
  titulo,
  descricao,
  hrefPrincipal,
  children,
}: TeamsPageShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-950">
      <section className="mx-auto max-w-5xl space-y-4">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-blue-900">
            SECP no Microsoft Teams
          </p>
          <h1 className="mt-2 text-2xl font-black">{titulo}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{descricao}</p>
          <Link
            href={hrefPrincipal}
            className="mt-4 inline-flex rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
          >
            Abrir rotina completa
          </Link>
        </div>
        {children}
      </section>
    </main>
  );
}
