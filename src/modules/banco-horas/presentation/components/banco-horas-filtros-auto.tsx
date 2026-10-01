"use client";

import { useRef } from "react";

import { CompetenciaInput, SearchableSelect } from "@/components/ui";

type BancoHorasFiltroServidor = {
  value: string;
  label: string;
  searchText?: string;
};

function submeterComValor(
  form: HTMLFormElement | null,
  campo: string,
  valor: string,
) {
  const input = form?.querySelector<HTMLInputElement>(`input[name="${campo}"]`);

  if (input) {
    input.value = valor;
  }

  form?.requestSubmit();
}

export function BancoHorasCompetenciaAutoForm({
  competencia,
  servidorId,
  className,
}: {
  competencia: string;
  servidorId?: string;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form ref={formRef} className={className}>
      {servidorId ? <input type="hidden" name="servidorId" value={servidorId} /> : null}
      <CompetenciaInput
        defaultValue={competencia}
        label={null}
        className="w-56"
        inputClassName="mt-0 h-8 text-xs"
        onValueChange={(valor) =>
          submeterComValor(formRef.current, "competencia", valor)
        }
      />
    </form>
  );
}

export function BancoHorasFiltrosAuto({
  competencia,
  servidorId,
  servidores,
  podeSelecionarServidor,
}: {
  competencia: string;
  servidorId: string;
  servidores: BancoHorasFiltroServidor[];
  podeSelecionarServidor: boolean;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form
      ref={formRef}
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_14rem] md:items-end"
    >
      <label className="text-sm font-bold text-blue-950">
        Servidor
        <SearchableSelect
          id="servidorId"
          name="servidorId"
          defaultValue={servidorId}
          disabled={!podeSelecionarServidor}
          className="mt-2"
          searchPlaceholder="Pesquisar por matrícula ou nome..."
          options={servidores}
          onValueChange={(valor) =>
            submeterComValor(formRef.current, "servidorId", valor)
          }
        />
      </label>
      <CompetenciaInput
        defaultValue={competencia}
        label="Competência"
        onValueChange={(valor) =>
          submeterComValor(formRef.current, "competencia", valor)
        }
      />
    </form>
  );
}
