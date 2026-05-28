import { Cable, CheckCircle2, CircleAlert, ServerCog } from "lucide-react";

type IntegracaoItem = {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  ativo: boolean;
  ultimoSucessoEm: Date | null;
  ultimoErroEm: Date | null;
  ultimoErro: string | null;
  _count: {
    logs: number;
    equipamentos: number;
  };
};

export function IntegracoesStatusCard({
  integracoes,
}: {
  integracoes: IntegracaoItem[];
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {integracoes.map((integracao) => (
        <article
          key={integracao.id}
          className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">
                {integracao.tipo}
              </p>
              <h2 className="mt-1 font-bold">{integracao.nome}</h2>
            </div>

            <div className="rounded-lg bg-blue-50 p-3 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
              {integracao.status === "ATIVA" ? (
                <CheckCircle2 className="size-5" />
              ) : integracao.status === "ERRO" ? (
                <CircleAlert className="size-5" />
              ) : integracao.tipo === "EQUIPAMENTO_BIOMETRICO" ? (
                <Cable className="size-5" />
              ) : (
                <ServerCog className="size-5" />
              )}
            </div>
          </div>

          <span
            className={`mt-4 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
              integracao.status === "ATIVA"
                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                : integracao.status === "ERRO"
                  ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
            }`}
          >
            {integracao.status}
          </span>

          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Logs: {integracao._count.logs} • Equipamentos:{" "}
            {integracao._count.equipamentos}
          </p>

          {integracao.ultimoErro && (
            <p className="mt-2 line-clamp-2 text-xs text-red-600">
              {integracao.ultimoErro}
            </p>
          )}
        </article>
      ))}

      {integracoes.length === 0 && (
        <article className="rounded-xl border bg-[var(--card)] p-5 text-sm text-[var(--muted-foreground)] shadow-sm md:col-span-2 xl:col-span-4">
          Nenhuma integração cadastrada ainda.
        </article>
      )}
    </section>
  );
}
