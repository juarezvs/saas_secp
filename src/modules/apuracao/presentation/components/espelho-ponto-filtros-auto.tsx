"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { CompetenciaInput, SearchableSelect, Skeleton } from "@/components/ui";

type ServidorOpcao = {
  value: string;
  label: string;
};

type EspelhoPontoFiltrosAutoProps = {
  competencia: string;
  servidorId?: string;
  servidores?: ServidorOpcao[];
  podeSelecionarServidor?: boolean;
  mostrarServidor?: boolean;
  className?: string;
  skeletonClassName?: string;
};

function competenciaValida(valor: string) {
  return /^\d{4}-\d{2}$/.test(valor);
}

export function EspelhoPontoFiltrosAuto({
  competencia,
  servidorId = "",
  servidores = [],
  podeSelecionarServidor = false,
  mostrarServidor = false,
  className = "grid gap-4 md:grid-cols-[1fr_220px] md:items-end",
  skeletonClassName = "grid gap-3 md:grid-cols-[1fr_220px]",
}: EspelhoPontoFiltrosAutoProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendente, iniciarTransicao] = useTransition();

  function atualizarFiltros(novosFiltros: {
    competencia?: string;
    servidorId?: string;
  }) {
    const query = new URLSearchParams(searchParams.toString());

    if (novosFiltros.competencia) {
      query.set("competencia", novosFiltros.competencia);
      query.delete("anoReferencia");
      query.delete("mesReferencia");
    }

    if (novosFiltros.servidorId !== undefined) {
      if (novosFiltros.servidorId) {
        query.set("servidorId", novosFiltros.servidorId);
      } else {
        query.delete("servidorId");
      }
    }

    iniciarTransicao(() => {
      router.push(`${pathname}?${query.toString()}`);
    });
  }

  function aoTrocarCompetencia(novaCompetencia: string) {
    if (competenciaValida(novaCompetencia) && novaCompetencia !== competencia) {
      atualizarFiltros({ competencia: novaCompetencia });
    }
  }

  return (
    <div className="space-y-3">
      <div className={className} aria-busy={pendente}>
        {mostrarServidor && (
          <div>
            <label
              htmlFor="servidorId"
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              Servidor
            </label>
            <SearchableSelect
              key={servidorId}
              id="servidorId"
              name="servidorId"
              defaultValue={servidorId}
              disabled={!podeSelecionarServidor || pendente}
              className="mt-2"
              searchPlaceholder="Pesquisar por matricula ou nome..."
              options={servidores}
              onValueChange={(valor) => atualizarFiltros({ servidorId: valor })}
            />
          </div>
        )}

        <CompetenciaInput
          key={competencia}
          defaultValue={competencia}
          disabled={pendente}
          onValueChange={aoTrocarCompetencia}
        />
      </div>

      {pendente && (
        <div className={skeletonClassName}>
          {mostrarServidor && <Skeleton className="h-10" />}
          <Skeleton className="h-10" />
        </div>
      )}
    </div>
  );
}
