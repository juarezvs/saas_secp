"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Edit, Eye, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import type { CampoOrdenacaoServidores } from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { useServidoresSelection } from "./servidores-selection-context";

export type ServidorDataTableItem = {
  id: string; matricula: string; cpf: string | null; pis: string | null;
  categoria: string; nome: string; cargo: string | null; funcao: string | null;
  fotoSrc: string | null; orgao: string; lotacaoAtual: string;
};
type Props = { dados: ServidorDataTableItem[]; ordenarPor: CampoOrdenacaoServidores; direcao: "asc" | "desc"; podeEditar: boolean; permitirSelecao?: boolean };

export function ServidoresDataTable({ dados, ordenarPor, direcao, podeEditar, permitirSelecao = false }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selecionados, alternar, selecionar } = useServidoresSelection();
  const idsPagina = dados.map((item) => item.id);
  const marcadosPagina = idsPagina.filter((id) => selecionados.has(id)).length;
  function hrefOrdenacao(campo: CampoOrdenacaoServidores) {
    const query = new URLSearchParams(searchParams.toString());
    query.set("ordenarPor", campo);
    query.set("direcao", ordenarPor === campo && direcao === "asc" ? "desc" : "asc");
    query.set("pagina", "1");
    return `${pathname}?${query.toString()}`;
  }
  const columns: ColumnDef<ServidorDataTableItem>[] = [
    ...(permitirSelecao ? [{
      id: "selecao",
      header: () => <CheckboxMestre marcado={idsPagina.length > 0 && marcadosPagina === idsPagina.length} indeterminado={marcadosPagina > 0 && marcadosPagina < idsPagina.length} onChange={(valor) => selecionar(idsPagina, valor)} />,
      cell: ({ row }: { row: { original: ServidorDataTableItem } }) => <input type="checkbox" checked={selecionados.has(row.original.id)} onChange={() => alternar(row.original.id)} className="size-4 rounded border-[var(--border)]" aria-label={`Selecionar ${row.original.nome}`} />,
    } as ColumnDef<ServidorDataTableItem>] : []),
    { id: "avatar", header: "Avatar", cell: ({ row }) => <Avatar className="size-7 border border-[var(--border)]">{row.original.fotoSrc ? <AvatarImage src={row.original.fotoSrc} alt="" /> : <AvatarFallback className="text-[10px] font-bold">{row.original.matricula.slice(0, 2).toUpperCase()}</AvatarFallback>}</Avatar> },
    coluna("matricula", "Matrícula", (item) => <span className="font-mono font-semibold">{item.matricula}</span>),
    coluna("nome", "Pessoa", (item) => <span className="font-semibold">{item.nome}</span>),
    coluna("cargo", "Cargo", (item) => item.cargo ?? "-"),
    coluna("funcao", "Função", (item) => item.funcao ?? "-"),
    coluna("documentos", "CPF / PIS", (item) => <span className="whitespace-nowrap font-mono">{item.cpf ?? "-"} <span className="text-[var(--muted-foreground)]">|</span> {item.pis ?? "-"}</span>),
    coluna("categoria", "Categoria", (item) => item.categoria),
    coluna("orgao", "Órgão", (item) => item.orgao),
    coluna("lotacao", "Lotação", (item) => item.lotacaoAtual),
    { id: "acoes", header: () => <span className="sr-only">Ações</span>, cell: ({ row }) => <MenuAcoes item={row.original} podeEditar={podeEditar} /> },
  ];
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data: dados, columns, getCoreRowModel: getCoreRowModel() });
  return <Table className="min-w-[1180px] text-left text-xs">
    <caption className="sr-only">Listagem de servidores. Use os cabeçalhos para ordenar.</caption>
    <TableHeader className="bg-[var(--muted)]/55">{table.getHeaderGroups().map((grupo) => <TableRow key={grupo.id} className="hover:bg-transparent">{grupo.headers.map((header) => {
      const campo = header.column.columnDef.meta as CampoOrdenacaoServidores | undefined;
      return <TableHead key={header.id} className="h-9 px-3 text-[11px] normal-case tracking-normal">{campo ? <Cabecalho ativo={ordenarPor === campo} direcao={direcao} href={hrefOrdenacao(campo)}>{flexRender(header.column.columnDef.header, header.getContext())}</Cabecalho> : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>;
    })}</TableRow>)}</TableHeader>
    <TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id} className="hover:bg-[var(--muted)]/35">{row.getVisibleCells().map((cell) => <TableCell key={cell.id} className="px-3 py-2.5">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="py-10 text-center text-[var(--muted-foreground)]">Nenhum servidor encontrado para os filtros informados.</TableCell></TableRow>}</TableBody>
  </Table>;
}

function CheckboxMestre({ marcado, indeterminado, onChange }: { marcado: boolean; indeterminado: boolean; onChange: (valor: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminado; }, [indeterminado]);
  return <input ref={ref} type="checkbox" checked={marcado} onChange={(event) => onChange(event.currentTarget.checked)} className="size-4 rounded border-[var(--border)]" aria-label="Selecionar todos os servidores desta página" />;
}
function coluna(campo: CampoOrdenacaoServidores, titulo: string, render: (item: ServidorDataTableItem) => ReactNode): ColumnDef<ServidorDataTableItem> { return { id: campo, accessorFn: (item) => item[campo as keyof ServidorDataTableItem], header: titulo, cell: ({ row }) => render(row.original), meta: campo }; }
function Cabecalho({ ativo, direcao, href, children }: { ativo: boolean; direcao: "asc" | "desc"; href: string; children: ReactNode }) { const Icone = ativo ? (direcao === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown; return <Link href={href} aria-sort={ativo ? (direcao === "asc" ? "ascending" : "descending") : "none"} className="inline-flex items-center gap-1.5 whitespace-nowrap hover:text-[var(--foreground)]">{children}<Icone className="size-3.5" /></Link>; }
function MenuAcoes({ item, podeEditar }: { item: ServidorDataTableItem; podeEditar: boolean }) { return <DropdownMenu.Root><DropdownMenu.Trigger asChild><button type="button" aria-label={`Ações para ${item.nome}`} className="grid size-7 place-items-center rounded-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><MoreHorizontal className="size-4" /></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content align="end" className="z-50 min-w-36 rounded-sm border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg"><DropdownMenu.Item asChild><Link href={`/servidores/${item.id}`} className={menuClassName}><Eye className="size-3.5" />Detalhar</Link></DropdownMenu.Item>{podeEditar && <DropdownMenu.Item asChild><Link href={`/servidores/${item.id}/editar`} className={menuClassName}><Edit className="size-3.5" />Editar</Link></DropdownMenu.Item>}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>; }
const menuClassName = "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-[var(--muted)] focus:bg-[var(--muted)]";
