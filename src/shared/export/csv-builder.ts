export type CsvCellValue = string | number | boolean | Date | null | undefined;

export type CsvColumn<TData> = {
  header: string;
  render: (row: TData) => CsvCellValue;
};

export type CsvBuilderOptions<TData> = {
  columns: CsvColumn<TData>[];
  data: TData[];
  separator?: string;
};

export function buildCsv<TData>({
  columns,
  data,
  separator = ";",
}: CsvBuilderOptions<TData>) {
  const linhas = [
    columns.map((column) => column.header),
    ...data.map((row) => columns.map((column) => column.render(row))),
  ];

  return linhas
    .map((linha) =>
      linha
        .map((valor) => escapeCsvValue(formatCsvValue(valor)))
        .join(separator),
    )
    .join("\n");
}

export function formatCsvValue(valor: CsvCellValue) {
  if (valor === null || valor === undefined) {
    return "";
  }

  if (valor instanceof Date) {
    return valor.toISOString();
  }

  return String(valor);
}

export function escapeCsvValue(valor: string) {
  return `"${valor.replaceAll('"', '""')}"`;
}
