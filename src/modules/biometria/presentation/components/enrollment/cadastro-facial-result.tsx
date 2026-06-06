"use client";

import Link from "next/link";
import { CheckCircle2, RotateCcw } from "lucide-react";

type ResultadoCadastro = {
  qualidade: string;
  provaDeVida: string;
  concluidoEm: string;
  recadastro: boolean;
};

export function CadastroFacialResult({
  resultado,
  onRefazer,
}: {
  resultado: ResultadoCadastro;
  onRefazer: () => void;
}) {
  return (
    <section className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-950 shadow-sm dark:border-green-900 dark:bg-green-950 dark:text-green-100">
      <CheckCircle2 className="size-8 text-green-700 dark:text-green-300" />
      <h2 className="mt-4 text-xl font-bold">
        Cadastro facial realizado com sucesso
      </h2>
      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <Info label="Qualidade" value={resultado.qualidade} />
        <Info label="Prova de vida" value={resultado.provaDeVida} />
        <Info
          label="Data e hora"
          value={new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(resultado.concluidoEm))}
        />
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/biometria"
          className="rounded-md bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900"
        >
          Concluir
        </Link>
        <button
          type="button"
          onClick={onRefazer}
          className="inline-flex items-center gap-2 rounded-md border border-green-700 px-4 py-2 text-sm font-semibold"
        >
          <RotateCcw className="size-4" />
          Refazer cadastro
        </button>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase opacity-70">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
