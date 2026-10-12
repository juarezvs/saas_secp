import { DataTableToolbar, type DataTableFiltro } from "@/components/listagens";

export function ChefiasListagemControles({ orgaos, superiores }: { orgaos: string[]; superiores: string[] }) {
  const filtros: DataTableFiltro[] = [
    { tipo: "texto", nome: "busca", label: "Consulta geral", placeholder: "Unidade, chefe ou matricula" },
    { tipo: "select", nome: "orgao", label: "Orgao", options: [{ value: "", label: "Todos" }, ...orgaos.map((value) => ({ value, label: value }))] },
    { tipo: "select", nome: "superior", label: "Superior", options: [{ value: "", label: "Todas" }, ...superiores.map((value) => ({ value, label: value }))] },
    { tipo: "select", nome: "chefia", label: "Chefia titular", options: [{ value: "", label: "Todas" }, { value: "com", label: "Com chefia titular" }, { value: "sem", label: "Sem chefia titular" }] },
  ];
  return <DataTableToolbar filtros={filtros} novoHref="/chefias/vincular" novoLabel="Vincular chefia" visualizarHrefBase="/unidades" visualizarHrefSufixo="/chefias" />;
}
