"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";

export type IndicadoresQualidade = {
  rostoDetectado: boolean;
  centralizado: boolean;
  iluminacao: boolean;
  nitidez: boolean;
  apenasUmaPessoa: boolean;
};

export function FaceQualityPanel({
  indicadores,
  mensagem,
}: {
  indicadores: IndicadoresQualidade;
  mensagem: string;
}) {
  const itens = [
    ["Rosto detectado", indicadores.rostoDetectado],
    ["Centralizacao", indicadores.centralizado],
    ["Iluminação", indicadores.iluminacao],
    ["Nitidez", indicadores.nitidez],
    ["Apenas uma pessoa", indicadores.apenasUmaPessoa],
  ] as const;

  return (
    <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <h2 className="text-lg font-bold">Verificacao de qualidade</h2>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">{mensagem}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {itens.map(([label, aprovado]) => (
          <div
            key={label}
            className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-semibold ${
              aprovado
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
                : "text-[var(--muted-foreground)]"
            }`}
          >
            {aprovado ? (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            ) : (
              <CircleAlert className="size-4" aria-hidden="true" />
            )}
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}
