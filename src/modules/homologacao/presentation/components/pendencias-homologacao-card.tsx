import { AlertTriangle } from "lucide-react";

type Pendencia = {
  tipo: string;
  descricao: string;
  quantidade?: number;
  minutos?: number;
};

export function PendenciasHomologacaoCard({
  pendencias,
}: {
  pendencias: Pendencia[];
}) {
  if (pendencias.length === 0) {
    return (
      <div className="rounded-lg border bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
        Nenhuma pendência identificada.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4" />
        <p className="font-semibold">Pendências encontradas</p>
      </div>

      <div className="mt-3 space-y-3">
        {pendencias.map((pendencia, index) => (
          <div key={`${pendencia.tipo}-${index}`} className="text-sm">
            <p className="font-semibold">{pendencia.tipo}</p>
            <p className="mt-1">{pendencia.descricao}</p>

            {(pendencia.quantidade || pendencia.minutos) && (
              <p className="mt-1 text-xs">
                {pendencia.quantidade
                  ? `Quantidade: ${pendencia.quantidade}`
                  : ""}
                {pendencia.quantidade && pendencia.minutos ? " • " : ""}
                {pendencia.minutos ? `Minutos: ${pendencia.minutos}` : ""}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
