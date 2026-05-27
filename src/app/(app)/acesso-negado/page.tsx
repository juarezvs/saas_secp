import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";

type AcessoNegadoPageProps = {
  searchParams: Promise<{
    permissao?: string;
  }>;
};

export default async function AcessoNegadoPage({
  searchParams,
}: AcessoNegadoPageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Acesso negado" }]} />

      <section className="rounded-xl border bg-[var(--card)] p-8 text-[var(--card-foreground)] shadow-sm">
        <div className="flex max-w-3xl gap-5">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
            <LockKeyhole className="size-7" aria-hidden="true" />
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
              Acesso negado
            </p>

            <h1 className="mt-2 text-2xl font-bold">
              Você não possui permissão para acessar este recurso.
            </h1>

            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
              O SECP utiliza controle de acesso baseado em perfis e permissões.
              Caso precise acessar esta funcionalidade, solicite revisão do seu
              perfil ao administrador do sistema ou ao NUTEC.
            </p>

            {params.permissao && (
              <div className="mt-4 rounded-lg border bg-[var(--muted)] p-3 text-sm">
                Permissão requerida:{" "}
                <code className="font-mono font-semibold">
                  {params.permissao}
                </code>
              </div>
            )}

            <div className="mt-6">
              <Link
                href="/dashboard"
                className="inline-flex rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
              >
                Voltar ao dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
