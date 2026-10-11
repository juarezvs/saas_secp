"use client";

import Link from "next/link";
import Image from "next/image";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Edit,
  Eye,
  MoreHorizontal,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import type { CampoOrdenacaoServidores } from "@/modules/servidores/infrastructure/repositories/servidor.repository";

export type ServidorDataTableItem = {
  id: string;
  matricula: string;
  cpf: string | null;
  pis: string | null;
  categoria: string;
  nome: string;
  cargo: string | null;
  funcao: string | null;
  fotoSrc: string | null;
  orgao: string;
  lotacaoAtual: string;
  lotacoes: number;
  gestores: number;
};

type ServidoresDataTableProps = {
  dados: ServidorDataTableItem[];
  ordenarPor: CampoOrdenacaoServidores;
  direcao: "asc" | "desc";
  podeEditar: boolean;
  permitirSelecao?: boolean;
};

export function ServidoresDataTable({
  dados,
  ordenarPor,
  direcao,
  podeEditar,
  permitirSelecao = false,
}: ServidoresDataTableProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefOrdenacao(campo: CampoOrdenacaoServidores) {
    const query = new URLSearchParams(searchParams.toString());
    query.set("ordenarPor", campo);
    query.set(
      "direcao",
      ordenarPor === campo && direcao === "asc" ? "desc" : "asc",
    );
    query.set("pagina", "1");
    return `${pathname}?${query.toString()}`;
  }

  const columns: ColumnDef<ServidorDataTableItem>[] = [
    ...(permitirSelecao
      ? [{
          id: "selecao",
          header: () => <span className="sr-only">Selecionar</span>,
          cell: ({ row }: { row: { original: ServidorDataTableItem } }) => (
            <input
              type="checkbox"
              name="servidorId"
              value={row.original.id}
              className="size-4 rounded border-[var(--border)]"
              aria-label={`Selecionar ${row.original.nome}`}
            />
          ),
        } as ColumnDef<ServidorDataTableItem>]
      : []),
    coluna("matricula", "Matrícula", (item) => (
      <span className="font-mono font-semibold">{item.matricula}</span>
    )),
    coluna("documentos", "CPF / PIS/PASEP", (item) => (
      <div className="font-mono">
        <div>{item.cpf ?? "-"}</div>
        <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">
          {item.pis ? `PIS/PASEP ${item.pis}` : "PIS/PASEP -"}
        </div>
      </div>
    )),
    coluna("categoria", "Categoria", (item) => item.categoria),
    coluna("nome", "Servidor", (item) => (
      <div className="flex min-w-64 items-center gap-2.5">
        {item.fotoSrc ? (
          <Image
            src={item.fotoSrc}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="size-9 rounded-full border bg-[var(--muted)] object-cover"
          />
        ) : (
          <span className="grid size-9 place-items-center rounded-full bg-[var(--muted)] text-xs font-bold">
            {item.matricula.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <div className="font-semibold">{item.nome}</div>
          {(item.funcao || item.cargo) && (
            <div className="max-w-64 truncate text-[11px] text-[var(--muted-foreground)]">
              {item.funcao ?? item.cargo}
            </div>
          )}
        </div>
      </div>
    )),
    coluna("orgao", "Órgão", (item) => item.orgao),
    coluna("lotacao", "Lotação atual", (item) => item.lotacaoAtual),
    coluna("lotacoes", "Lotações", (item) => item.lotacoes),
    coluna("gestores", "Gestores", (item) => item.gestores),
    {
      id: "acoes",
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={`Ações para ${row.original.nome}`}
              className="grid size-7 place-items-center rounded-sm text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              className="z-50 min-w-36 rounded-sm border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg"
            >
              <DropdownMenu.Item asChild>
                <Link href={`/servidores/${row.original.id}`} className={itemMenuClassName}>
                  <Eye className="size-3.5" aria-hidden="true" />
                  Detalhar
                </Link>
              </DropdownMenu.Item>
              {podeEditar && (
                <DropdownMenu.Item asChild>
                  <Link
                    href={`/servidores/${row.original.id}/editar`}
                    className={itemMenuClassName}
                  >
                    <Edit className="size-3.5" aria-hidden="true" />
                    Editar
                  </Link>
                </DropdownMenu.Item>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ),
    },
  ];

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data: dados, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <Table className="min-w-[1120px] text-left text-xs">
      <caption className="sr-only">Listagem de servidores. Use os cabeçalhos para ordenar.</caption>
      <TableHeader className="bg-[var(--muted)]/55">
        {table.getHeaderGroups().map((grupo) => (
          <TableRow key={grupo.id} className="hover:bg-transparent">
            {grupo.headers.map((header) => {
              const campo = header.column.columnDef.meta as CampoOrdenacaoServidores | undefined;
              return (
                <TableHead key={header.id} className="h-9 px-3 text-[11px] normal-case tracking-normal">
                  {campo ? (
                    <CabecalhoOrdenavel
                      ativo={ordenarPor === campo}
                      direcao={direcao}
                      href={hrefOrdenacao(campo)}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </CabecalhoOrdenavel>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
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
            <TableRow key={row.id} className="hover:bg-[var(--muted)]/35">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="px-3 py-2.5">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="py-10 text-center text-[var(--muted-foreground)]">
              Nenhum servidor encontrado para os filtros informados.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

const itemMenuClassName =
  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-[var(--muted)] focus:bg-[var(--muted)]";

function coluna(
  campo: CampoOrdenacaoServidores,
  titulo: string,
  render: (item: ServidorDataTableItem) => ReactNode,
): ColumnDef<ServidorDataTableItem> {
  return {
    id: campo,
    accessorFn: (item) => item[campo as keyof ServidorDataTableItem],
    header: titulo,
    cell: ({ row }) => render(row.original),
    meta: campo,
  };
}

function CabecalhoOrdenavel({ ativo, direcao, href, children }: {
  ativo: boolean;
  direcao: "asc" | "desc";
  href: string;
  children: ReactNode;
}) {
  const Icone = ativo ? (direcao === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <Link
      href={href}
      aria-sort={ativo ? (direcao === "asc" ? "ascending" : "descending") : "none"}
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-left hover:text-[var(--foreground)]"
    >
      {children}
      <Icone className="size-3.5" aria-hidden="true" />
    </Link>
  );
}
