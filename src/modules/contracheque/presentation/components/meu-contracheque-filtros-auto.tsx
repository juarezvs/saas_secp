"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { CompetenciaInput } from "@/components/ui";

type MeuContrachequeFiltrosAutoProps = {
  competencia: string;
  className?: string;
};

function competenciaValida(valor: string) {
  return /^\d{4}-\d{2}$/.test(valor);
}

export function MeuContrachequeFiltrosAuto({
  competencia,
  className = "w-full sm:w-64",
}: MeuContrachequeFiltrosAutoProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendente, iniciarTransicao] = useTransition();

  function aoTrocarCompetencia(novaCompetencia: string) {
    if (!competenciaValida(novaCompetencia) || novaCompetencia === competencia) {
      return;
    }

    const query = new URLSearchParams(searchParams.toString());

    query.set("competencia", novaCompetencia);
    query.delete("documento");

    iniciarTransicao(() => {
      router.push(`${pathname}?${query.toString()}`);
    });
  }

  return (
    <div className="relative min-h-[4.625rem]">
      <div className={className} aria-busy={pendente}>
        <CompetenciaInput
          key={competencia}
          defaultValue={competencia}
          disabled={pendente}
          onValueChange={aoTrocarCompetencia}
        />
      </div>

      {pendente && (
        <div
          className="pointer-events-none absolute inset-x-0 -bottom-2 h-1 overflow-hidden rounded-full bg-muted"
          aria-hidden="true"
        >
          <div className="h-full w-1/3 animate-pulse rounded-full bg-secp-blue-700" />
        </div>
      )}
    </div>
  );
}
