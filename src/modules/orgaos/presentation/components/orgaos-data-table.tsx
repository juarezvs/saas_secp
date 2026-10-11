"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Edit } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import type { CampoOrdenacaoOrgaos } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";

export type OrgaoDataTableItem = {
  id: string;
  sigla: string;
  nome: string;
  codigoExternoSarh: number | null;
  uf: string | null;
  municipio: string | null;
  municipioIbge: string | null;
  fusoHorario: string | null;
  ultimaSincronizacaoSarh: Date | string | null;
  ativo: boolean;
  _count: { unidades: number; servidores: number };
};

type OrgaosDataTableProps = {
  dados: OrgaoDataTableItem[];
  ordenarPor: CampoOrdenacaoOrgaos;
  direcao: "asc" | "desc";
};

export function OrgaosDataTable({
  dados,
  ordenarPor,
  direcao,
}: OrgaosDataTableProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function montarHrefOrdenacao(
    campo: CampoOrdenacaoOrgaos,
    novaDirecao: "asc" | "desc",
  ) {
    const query = new URLSearchParams(searchParams.toString());
    query.set("ordenarPor", campo);
    query.set("direcao", novaDirecao);
    query.set("pagina", "1");
    return `${pathname}?${query.toString()}`;
  }
  const columns: ColumnDef<OrgaoDataTableItem>[] = [
    coluna("sigla", "Sigla", (item) => (
      <span className="font-mono text-xs font-semibold">{item.sigla}</span>
    )),
    coluna("nome", "Nome", (item) => (
      <span className="font-semibold">{item.nome}</span>
    )),
    coluna("codigoExternoSarh", "Código SARH", (item) => (
      <span className="font-mono text-xs">{item.codigoExternoSarh ?? "-"}</span>
    )),
    coluna("localidade", "Localidade", (item) => {
      if (!item.uf && !item.municipio && !item.municipioIbge) return "-";
      return (
        <div>
          <div className="font-medium">
            {item.municipio ?? "Cidade não informada"}
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            {[
              item.uf ?? "UF não informada",
              item.municipioIbge ? `IBGE ${item.municipioIbge}` : null,
            ]
              .filter(Boolean)
              .join(" - ")}
          </div>
        </div>
      );
    }),
    coluna("unidades", "Unidades", (item) => item._count.unidades),
    coluna("servidores", "Servidores", (item) => item._count.servidores),
    coluna("fusoHorario", "Fuso", (item) => item.fusoHorario ?? "-"),
    coluna("ultimaSincronizacaoSarh", "Última sincronização", (item) =>
      item.ultimaSincronizacaoSarh
        ? new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(item.ultimaSincronizacaoSarh))
        : "-",
    ),
    coluna("status", "Status", (item) => (
      <span
        className={`rounded-full px-2 py-1 text-xs font-semibold ${
          item.ativo
            ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        {item.ativo ? "Ativo" : "Inativo"}
      </span>
    )),
    {
      id: "acoes",
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <Link
            href={`/orgaos/${row.original.id}/editar`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
          >
            <Edit className="size-4" aria-hidden="true" />
            Editar
          </Link>
        </div>
      ),
    },
  ];

  // TanStack Table exposes mutable helpers intentionally; rows remain controlled by the server.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: dados,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table className="min-w-[1080px] text-left">
      <caption className="sr-only">
        Listagem de órgãos. Use os cabeçalhos para ordenar os dados.
      </caption>
      <TableHeader className="bg-[var(--muted)]">
        {table.getHeaderGroups().map((grupo) => (
          <TableRow key={grupo.id} className="hover:bg-transparent">
            {grupo.headers.map((header) => {
              const campo = header.column.columnDef.meta as
                CampoOrdenacaoOrgaos | undefined;
              return (
                <TableHead key={header.id}>
                  {campo ? (
                    <CabecalhoOrdenavel
                      campo={campo}
                      ativo={ordenarPor === campo}
                      direcao={direcao}
                      href={montarHrefOrdenacao(
                        campo,
                        ordenarPor === campo && direcao === "asc"
                          ? "desc"
                          : "asc",
                      )}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </CabecalhoOrdenavel>
                  ) : (
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="py-10 text-center text-[var(--muted-foreground)]"
            >
              Nenhum órgão encontrado para os filtros informados.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function coluna(
  campo: CampoOrdenacaoOrgaos,
  titulo: string,
  render: (item: OrgaoDataTableItem) => ReactNode,
): ColumnDef<OrgaoDataTableItem> {
  return {
    id: campo,
    accessorFn: (item) => item[campo as keyof OrgaoDataTableItem],
    header: titulo,
    cell: ({ row }) => render(row.original),
    meta: campo,
  };
}

function CabecalhoOrdenavel({
  campo,
  ativo,
  direcao,
  href,
  children,
}: {
  campo: CampoOrdenacaoOrgaos;
  ativo: boolean;
  direcao: "asc" | "desc";
  href: string;
  children: ReactNode;
}) {
  const Icone = ativo ? (direcao === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <Link
      href={href}
      aria-label={`Ordenar por ${String(children)}`}
      aria-sort={
        ativo ? (direcao === "asc" ? "ascending" : "descending") : "none"
      }
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-left hover:text-[var(--foreground)]"
      data-campo={campo}
    >
      {children}
      <Icone className="size-3.5" aria-hidden="true" />
    </Link>
  );
}
