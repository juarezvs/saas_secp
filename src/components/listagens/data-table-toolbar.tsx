"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import { DataTableExportButtons } from "@/components/listagens/data-table-export-buttons";
import { FiltroSelectImediato } from "@/components/listagens/filtro-select-imediato";
import { FiltroTextoDebounce } from "@/components/listagens/filtro-texto-debounce";
import { Button, CompetenciaInput, SearchableSelect } from "@/components/ui";
import {
  criarQueryStringAtualizada,
  montarHrefComQuery,
} from "@/components/listagens/query-string";

export type DataTableFiltroTexto = {
  tipo: "texto";
  nome: string;
  label: string;
  placeholder?: string;
  className?: string;
  comIconeBusca?: boolean;
  defaultValue?: string;
};

export type DataTableFiltroSelect = {
  tipo: "select";
  nome: string;
  label: string;
  options: {
    value: string;
    label: string;
  }[];
  className?: string;
  defaultValue?: string;
  limparAoAlterar?: string[];
};

export type DataTableFiltroSearchableSelect = {
  tipo: "searchable-select";
  nome: string;
  label: string;
  options: {
    value: string;
    label: string;
    searchText?: string;
  }[];
  className?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  defaultValue?: string;
  limparAoAlterar?: string[];
};

export type DataTableFiltroCompetencia = {
  tipo: "competencia";
  nome: string;
  label: string;
  className?: string;
  defaultValue?: string;
};

export type DataTableFiltroData = {
  tipo: "data";
  nome: string;
  label: string;
  className?: string;
  defaultValue?: string;
};

export type DataTableFiltro =
  | DataTableFiltroTexto
  | DataTableFiltroSelect
  | DataTableFiltroSearchableSelect
  | DataTableFiltroCompetencia
  | DataTableFiltroData;

type DataTableToolbarProps = {
  filtros: DataTableFiltro[];
  csvHref?: string;
  pdfHref?: string;
  csvAssincrono?: boolean;
  pdfAssincrono?: boolean;
};

export function DataTableToolbar({
  filtros,
  csvHref,
  pdfHref,
  csvAssincrono = false,
  pdfAssincrono = false,
}: DataTableToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const paramsAtuais = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  const aplicarParametro = useCallback(
    (nome: string, valor: string) => {
      const filtro = filtros.find((item) => item.nome === nome);
      const dependentes =
        filtro && "limparAoAlterar" in filtro ? filtro.limparAoAlterar : [];
      const params = criarQueryStringAtualizada(searchParams, {
        [nome]: valor,
        pagina: "1",
        ...Object.fromEntries((dependentes ?? []).map((item) => [item, ""])),
      });

      const destino = montarHrefComQuery(pathname, params);

      startTransition(() => {
        router.push(destino);
      });
    },
    [filtros, pathname, router, searchParams],
  );

  const aplicarParametrosTexto = useCallback(
    (formData: FormData) => {
      const atualizacoes: Record<string, string> = { pagina: "1" };

      for (const filtro of filtros) {
        if (filtro.tipo !== "texto") continue;
        atualizacoes[filtro.nome] = String(formData.get(filtro.nome) ?? "");
      }

      const params = criarQueryStringAtualizada(searchParams, atualizacoes);
      const destino = montarHrefComQuery(pathname, params);

      startTransition(() => {
        router.push(destino);
      });
    },
    [filtros, pathname, router, searchParams],
  );

  const obterValorFiltro = useCallback(
    (filtro: DataTableFiltro) => {
      const value = paramsAtuais.get(filtro.nome) ?? filtro.defaultValue ?? "";

      if (filtro.tipo !== "competencia" || value) {
        return value;
      }

      const anoReferencia = paramsAtuais.get("anoReferencia");
      const mesReferencia = paramsAtuais.get("mesReferencia");

      if (!anoReferencia || !mesReferencia) {
        return "";
      }

      return `${anoReferencia}-${mesReferencia.padStart(2, "0")}`;
    },
    [paramsAtuais],
  );
  const possuiFiltroTexto = filtros.some((filtro) => filtro.tipo === "texto");

  return (
    <>
      {csvHref && pdfHref && (
        <div className="flex flex-col justify-end gap-3 lg:flex-row">
          <DataTableExportButtons
            csvHref={csvHref}
            pdfHref={pdfHref}
            csvAssincrono={csvAssincrono}
            pdfAssincrono={pdfAssincrono}
          />
        </div>
      )}

      <form
        action={aplicarParametrosTexto}
        className="grid gap-3 lg:grid-cols-6"
      >
        {filtros.map((filtro) => {
          const value = obterValorFiltro(filtro);

          if (filtro.tipo === "select") {
            return (
              <FiltroSelectImediato
                key={filtro.nome}
                nome={filtro.nome}
                label={filtro.label}
                value={value}
                options={filtro.options}
                onChange={aplicarParametro}
                className={filtro.className}
              />
            );
          }

          if (filtro.tipo === "searchable-select") {
            return (
              <div key={filtro.nome} className={filtro.className}>
                <label className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                  {filtro.label}
                </label>
                <SearchableSelect
                  key={`${filtro.nome}-${value}`}
                  id={filtro.nome}
                  name={filtro.nome}
                  defaultValue={value}
                  options={filtro.options}
                  placeholder={filtro.placeholder ?? "Todos"}
                  searchPlaceholder={filtro.searchPlaceholder ?? "Pesquisar..."}
                  className="mt-2"
                  onValueChange={(novoValor) =>
                    aplicarParametro(filtro.nome, novoValor)
                  }
                />
              </div>
            );
          }

          if (filtro.tipo === "competencia") {
            return (
              <CompetenciaInput
                key={filtro.nome}
                name={filtro.nome}
                label={filtro.label}
                value={value}
                onValueChange={(novoValor) =>
                  aplicarParametro(filtro.nome, novoValor)
                }
                className={filtro.className}
              />
            );
          }

          if (filtro.tipo === "data") {
            return (
              <div key={`${filtro.nome}-${value}`} className={filtro.className}>
                <label
                  htmlFor={filtro.nome}
                  className="text-xs font-semibold uppercase text-[var(--muted-foreground)]"
                >
                  {filtro.label}
                </label>
                <input
                  id={filtro.nome}
                  name={filtro.nome}
                  type="date"
                  defaultValue={value}
                  onChange={(event) =>
                    aplicarParametro(filtro.nome, event.currentTarget.value)
                  }
                  className="mt-2 h-10 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </div>
            );
          }

          return (
            <FiltroTextoDebounce
              key={`${filtro.nome}-${value}`}
              nome={filtro.nome}
              label={filtro.label}
              valor={value}
              placeholder={filtro.placeholder}
              comIconeBusca={filtro.comIconeBusca}
              className={filtro.className}
            />
          );
        })}
        {possuiFiltroTexto && (
          <div className="flex items-end">
            <Button
              type="submit"
              leftIcon={<Filter className="size-4" aria-hidden="true" />}
              loading={pending}
            >
              Filtrar
            </Button>
          </div>
        )}
      </form>
    </>
  );
}
