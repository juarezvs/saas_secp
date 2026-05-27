import Link from "next/link";
import { Building2 } from "lucide-react";

type LotacaoItem = {
  id: string;
  tipo: string;
  status: string;
  dataInicio: Date;
  dataFim: Date | null;
  unidade: {
    id: string;
    sigla: string;
    nome: string;
  };
};

function formatarData(data: Date | null) {
  if (!data) {
    return "Atual";
  }

  return new Intl.DateTimeFormat("pt-BR").format(data);
}

export function ServidorLotacoesCard({
  lotacoes,
}: {
  lotacoes: LotacaoItem[];
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-center gap-2 border-b p-5">
        <Building2 className="size-5 text-blue-900 dark:text-blue-300" />
        <h2 className="text-lg font-bold">Histórico de lotações</h2>
      </div>

      <div className="divide-y">
        {lotacoes.map((lotacao) => (
          <div
            key={lotacao.id}
            className="flex flex-col justify-between gap-3 p-5 md:flex-row md:items-center"
          >
            <div>
              <Link
                href={`/unidades/${lotacao.unidade.id}`}
                className="font-semibold text-blue-900 hover:underline dark:text-blue-300"
              >
                {lotacao.unidade.sigla}
              </Link>

              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {lotacao.unidade.nome}
              </p>

              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {formatarData(lotacao.dataInicio)} →{" "}
                {formatarData(lotacao.dataFim)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                {lotacao.tipo}
              </span>

              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  lotacao.status === "ATIVO"
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {lotacao.status === "ATIVO" ? "Ativa" : "Inativa"}
              </span>
            </div>
          </div>
        ))}

        {lotacoes.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            Nenhuma lotação registrada.
          </div>
        )}
      </div>
    </section>
  );
}
