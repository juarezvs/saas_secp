"use client";

import { AlertCircle, Download, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";

import { PdfCanvasPages } from "./pdf-drawer-preview";

type EstadoPdf =
  | { tipo: "carregando" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; dados: Uint8Array; nomeArquivo: string };

type SolicitacaoAnexoPdfPageViewerProps = {
  apiUrl: string;
};

function obterNomeArquivo(headers: Headers) {
  const disposition = headers.get("content-disposition") ?? "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = disposition.match(/filename="([^"]+)"/i);
  return asciiMatch?.[1] ?? "documento.pdf";
}

export function SolicitacaoAnexoPdfPageViewer({
  apiUrl,
}: SolicitacaoAnexoPdfPageViewerProps) {
  const downloadUrl = apiUrl.includes("?")
    ? `${apiUrl}&download=1`
    : `${apiUrl}?download=1`;
  const [zoom, setZoom] = useState(1.15);
  const [estado, setEstado] = useState<EstadoPdf>({ tipo: "carregando" });

  useEffect(() => {
    let cancelado = false;

    async function carregarPdf() {
      setEstado({ tipo: "carregando" });

      try {
        const resposta = await fetch(apiUrl, {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!resposta.ok) {
          const mensagem = await resposta.text().catch(() => "");
          throw new Error(
            mensagem || "Nao foi possivel carregar o PDF do anexo.",
          );
        }

        const contentType = resposta.headers.get("content-type") ?? "";

        if (!contentType.toLocaleLowerCase("pt-BR").includes("application/pdf")) {
          throw new Error(
            "O servidor retornou uma resposta que nao foi reconhecida como PDF.",
          );
        }

        const dados = new Uint8Array(await resposta.arrayBuffer());

        if (!cancelado) {
          setEstado({
            tipo: "pronto",
            dados,
            nomeArquivo: obterNomeArquivo(resposta.headers),
          });
        }
      } catch (erro) {
        if (!cancelado) {
          setEstado({
            tipo: "erro",
            mensagem:
              erro instanceof Error
                ? erro.message
                : "Nao foi possivel carregar o PDF.",
          });
        }
      }
    }

    void carregarPdf();

    return () => {
      cancelado = true;
    };
  }, [apiUrl]);

  return (
    <main className="min-h-dvh bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-20 border-b bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-blue-900">
              Anexo da solicitacao
            </p>
            <h1 className="truncate text-base font-bold">
              {estado.tipo === "pronto" ? estado.nomeArquivo : "Visualizador PDF"}
            </h1>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-md border bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setZoom((valor) => Math.max(0.7, valor - 0.15))}
              disabled={zoom <= 0.7}
              title="Reduzir zoom"
            >
              <ZoomOut className="size-4" aria-hidden="true" />
              <span className="sr-only">Reduzir zoom</span>
            </button>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-md border bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setZoom((valor) => Math.min(2, valor + 0.15))}
              disabled={zoom >= 2}
              title="Aumentar zoom"
            >
              <ZoomIn className="size-4" aria-hidden="true" />
              <span className="sr-only">Aumentar zoom</span>
            </button>
            <a
              href={downloadUrl}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
            >
              <Download className="size-4" aria-hidden="true" />
              Baixar PDF
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl p-4">
        {estado.tipo === "carregando" ? (
          <div className="flex h-[calc(100dvh-8rem)] items-center justify-center rounded-lg border bg-white text-sm font-semibold text-slate-600">
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            Carregando PDF...
          </div>
        ) : null}

        {estado.tipo === "erro" ? (
          <div className="flex h-[calc(100dvh-8rem)] items-center justify-center rounded-lg border bg-white p-6 text-center text-sm text-red-700">
            <div>
              <AlertCircle className="mx-auto mb-3 size-8" aria-hidden="true" />
              <p className="font-semibold">Nao foi possivel visualizar o PDF.</p>
              <p className="mt-1 text-red-600">{estado.mensagem}</p>
            </div>
          </div>
        ) : null}

        {estado.tipo === "pronto" ? (
          <PdfCanvasPages
            dados={estado.dados}
            nomeArquivo={estado.nomeArquivo}
            zoom={zoom}
          />
        ) : null}
      </section>
    </main>
  );
}
