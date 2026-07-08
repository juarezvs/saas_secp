"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { CompetenciaInput, SearchableSelect } from "@/components/ui";

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
    <div className="relative min-h-[4.625rem]">
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
