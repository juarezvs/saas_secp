"use client";

import { FileText, Maximize2 } from "lucide-react";

import { PdfDrawerPreview } from "./pdf-drawer-preview";

type SolicitacaoAnexoPdfViewerProps = {
  solicitacaoId: string;
  variant?: "grid" | "sidebar";
  anexos: Array<{
    id: string;
    descricao: string;
    nomeOriginal: string;
    tamanhoBytes: number;
  }>;
};

function formatarTamanho(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })} MB`;
}

export function SolicitacaoAnexosPdfViewer({
  solicitacaoId,
  variant = "grid",
  anexos,
}: SolicitacaoAnexoPdfViewerProps) {
  if (anexos.length === 0) {
    return null;
  }

  const sidebar = variant === "sidebar";

  return (
    <section
      className={
        sidebar
          ? "rounded-xl border bg-(--card) p-4 text-(--card-foreground) shadow-sm"
          : "rounded-xl border bg-(--card) p-5 text-(--card-foreground) shadow-sm"
      }
    >
      <div className="flex items-center gap-2">
        <FileText className="size-5 text-blue-900" aria-hidden="true" />
        <h2 className={sidebar ? "text-base font-bold" : "text-lg font-bold"}>
          Anexos da solicitação
        </h2>
      </div>

      <div
        className={
          sidebar
            ? "mt-4 grid gap-3"
            : "mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        }
      >
        {anexos.map((anexo) => {
          const tamanho = formatarTamanho(anexo.tamanhoBytes);
          const pdfUrl = `/api/solicitacoes/${solicitacaoId}/anexos/${anexo.id}`;
          const viewerUrl = `/solicitacoes/${solicitacaoId}/anexos/${anexo.id}`;

          return (
            <PdfDrawerPreview
              key={anexo.id}
              src={pdfUrl}
              viewerHref={viewerUrl}
              titulo={anexo.descricao}
              nomeArquivo={anexo.nomeOriginal}
              descricao={`${anexo.nomeOriginal} • ${tamanho}`}
            >
              <button
                type="button"
                className={
                  sidebar
                    ? "group flex min-h-24 w-full items-start gap-3 rounded-lg border bg-white p-3 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/60 dark:bg-slate-950 dark:hover:bg-blue-950/30"
                    : "group flex min-h-28 w-full items-start gap-3 rounded-lg border bg-white p-3 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/60 dark:bg-slate-950 dark:hover:bg-blue-950/30"
                }
                title={`Visualizar PDF ${anexo.nomeOriginal}`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100 transition group-hover:bg-white dark:bg-blue-950 dark:text-blue-200">
                  <FileText className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">
                    {anexo.descricao}
                  </span>
                  <span className="mt-1 block truncate text-xs text-(--muted-foreground)">
                    {anexo.nomeOriginal}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                    <Maximize2 className="size-3.5" aria-hidden="true" />
                    Visualizar PDF
                  </span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-(--muted-foreground)">
                  {tamanho}
                </span>
              </button>
            </PdfDrawerPreview>
          );
        })}
      </div>
    </section>
  );
}
