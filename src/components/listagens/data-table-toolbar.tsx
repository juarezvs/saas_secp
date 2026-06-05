"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DataTableExportButtons } from "@/components/listagens/data-table-export-buttons";
import { FiltroSelectImediato } from "@/components/listagens/filtro-select-imediato";
import { FiltroTextoDebounce } from "@/components/listagens/filtro-texto-debounce";
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
};

export type DataTableFiltro = DataTableFiltroTexto | DataTableFiltroSelect;

type DataTableToolbarProps = {
  filtros: DataTableFiltro[];
  csvHref: string;
  pdfHref: string;
};

export function DataTableToolbar({
  filtros,
  csvHref,
  pdfHref,
}: DataTableToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const paramsAtuais = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  const aplicarParametro = useCallback(
    (nome: string, valor: string) => {
      const params = criarQueryStringAtualizada(searchParams, {
        [nome]: valor,
        pagina: "1",
      });

      const destino = montarHrefComQuery(pathname, params);

      startTransition(() => {
        router.push(destino);
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <>
      <div className="flex flex-col justify-end gap-3 lg:flex-row">
        <DataTableExportButtons csvHref={csvHref} pdfHref={pdfHref} />
      </div>

      <div className="grid gap-3 lg:grid-cols-6">
        {filtros.map((filtro) => {
          const value = paramsAtuais.get(filtro.nome) ?? "";

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

          return (
            <FiltroTextoDebounce
              key={`${filtro.nome}-${value}`}
              nome={filtro.nome}
              label={filtro.label}
              valor={value}
              placeholder={filtro.placeholder}
              comIconeBusca={filtro.comIconeBusca}
              className={filtro.className}
              onChange={aplicarParametro}
            />
          );
        })}
      </div>
    </>
  );
}
