import { buildCsv, type CsvBuilderOptions } from "@/shared/export/csv-builder";

type CsvResponseOptions<TData> = CsvBuilderOptions<TData> & {
  filename: string;
  includeBom?: boolean;
};

export function criarCsvResponse<TData>({
  filename,
  includeBom = true,
  ...builderOptions
}: CsvResponseOptions<TData>) {
  const csv = buildCsv(builderOptions);

  return new Response(`${includeBom ? "\uFEFF" : ""}${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
