"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useMemo, type ReactNode } from "react";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Edit, Eye, MoreHorizontal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { DataTableHeaderCheckbox, DataTableRowCheckbox, DataTableSelectionProvider, useOptionalDataTableSelection } from "./data-table-selection";

export type StandardDataTableCell = { value: string | number; detail?: string; tone?: "success" | "muted" | "danger" };
export type StandardDataTableRow = { id: string; label: string; cells: Record<string, StandardDataTableCell>; visualizarHref?: string; editarHref?: string; actionItems?: ReactNode };
export type StandardDataTableColumn = { key: string; label: string; className?: string };

export function StandardDataTable({ columns, rows, emptyMessage, podeEditar = false, minWidth = 980 }: { columns: StandardDataTableColumn[]; rows: StandardDataTableRow[]; emptyMessage: string; podeEditar?: boolean; minWidth?: number }) {
  const selection = useOptionalDataTableSelection();

  if (!selection) {
    return <DataTableSelectionProvider><StandardDataTableContent columns={columns} rows={rows} emptyMessage={emptyMessage} podeEditar={podeEditar} minWidth={minWidth} /></DataTableSelectionProvider>;
  }

  return <StandardDataTableContent columns={columns} rows={rows} emptyMessage={emptyMessage} podeEditar={podeEditar} minWidth={minWidth} />;
}

function StandardDataTableContent({ columns, rows, emptyMessage, podeEditar = false, minWidth = 980 }: { columns: StandardDataTableColumn[]; rows: StandardDataTableRow[]; emptyMessage: string; podeEditar?: boolean; minWidth?: number }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const defs = useMemo<ColumnDef<StandardDataTableRow>[]>(() => [
    { id: "selection", enableSorting: false, header: () => <DataTableHeaderCheckbox ids={rows.map((row) => row.id)} />, cell: ({ row }) => <DataTableRowCheckbox id={row.original.id} label={`Selecionar ${row.original.label}`} /> },
    ...columns.map((column): ColumnDef<StandardDataTableRow> => ({ id: column.key, accessorFn: (row) => row.cells[column.key]?.value ?? "", header: column.label, cell: ({ row }) => <Cell cell={row.original.cells[column.key]} />, meta: column.className })),
    { id: "actions", enableSorting: false, header: () => <span className="sr-only">Acoes</span>, cell: ({ row }) => <RowActions row={row.original} podeEditar={podeEditar} /> },
  ], [columns, podeEditar, rows]);
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data: rows, columns: defs, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
  return <Table style={{ minWidth }} className="w-full text-left text-xs"><TableHeader className="bg-[var(--muted)]/55">{table.getHeaderGroups().map((group) => <TableRow key={group.id} className="hover:bg-transparent">{group.headers.map((header) => <TableHead key={header.id} className="h-9 px-3 text-[11px] normal-case tracking-normal">{header.isPlaceholder ? null : header.column.getCanSort() ? <button type="button" onClick={header.column.getToggleSortingHandler()} className="inline-flex items-center gap-1.5 whitespace-nowrap hover:text-[var(--foreground)]">{flexRender(header.column.columnDef.header, header.getContext())}<SortIcon state={header.column.getIsSorted()} /></button> : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader><TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id} className="hover:bg-[var(--muted)]/35">{row.getVisibleCells().map((cell) => <TableCell key={cell.id} className="px-3 py-2.5">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={defs.length} className="py-10 text-center text-[var(--muted-foreground)]">{emptyMessage}</TableCell></TableRow>}</TableBody></Table>;
}

function Cell({ cell }: { cell?: StandardDataTableCell }) { if (!cell) return "-"; const tone = cell.tone === "success" ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : cell.tone === "danger" ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : cell.tone === "muted" ? "bg-[var(--muted)] text-[var(--muted-foreground)]" : ""; return <div><span className={tone ? `inline-flex rounded-full px-2 py-1 font-semibold ${tone}` : ""}>{String(cell.value)}</span>{cell.detail ? <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">{cell.detail}</div> : null}</div>; }
function SortIcon({ state }: { state: false | "asc" | "desc" }) { const Icon = state === "asc" ? ArrowUp : state === "desc" ? ArrowDown : ArrowUpDown; return <Icon className="size-3.5" />; }
function RowActions({ row, podeEditar }: { row: StandardDataTableRow; podeEditar: boolean }) { const items: ReactNode[] = []; if (row.visualizarHref) items.push(<DropdownMenu.Item key="view" asChild><Link href={row.visualizarHref} className={menuClass}><Eye className="size-3.5" />Visualizar</Link></DropdownMenu.Item>); if (row.editarHref && podeEditar) items.push(<DropdownMenu.Item key="edit" asChild><Link href={row.editarHref} className={menuClass}><Edit className="size-3.5" />Editar</Link></DropdownMenu.Item>); if (!items.length && !row.actionItems) return null; return <DropdownMenu.Root><DropdownMenu.Trigger asChild><button type="button" className="grid size-7 place-items-center rounded-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]" aria-label={`Acoes para ${row.label}`}><MoreHorizontal className="size-4" /></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content align="end" className="z-50 min-w-36 rounded-sm border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg">{items}{row.actionItems}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>; }
const menuClass = "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-[var(--muted)] focus:bg-[var(--muted)]";
