"use client";

import {
  AlertCircle,
  Download,
  ExternalLink,
  Loader2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

type PdfDrawerPreviewProps = {
  children: ReactNode;
  nomeArquivo: string;
  titulo: string;
  descricao?: string;
  src: string;
  viewerHref?: string;
};

type EstadoRenderizacao =
  | { tipo: "carregando" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "pronto"; dados: Uint8Array };

type PdfCanvasPagesProps = {
  dados: Uint8Array;
  nomeArquivo: string;
  zoom: number;
};

export function PdfCanvasPages({ dados, nomeArquivo, zoom }: PdfCanvasPagesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [renderizando, setRenderizando] = useState(true);
  const [paginas, setPaginas] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    let tarefaPdf: { destroy: () => void } | null = null;
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const containerAtual = container;

    async function renderizarPdf() {
      setRenderizando(true);
      setErro(null);
      setPaginas(0);
      containerAtual.replaceChildren();

      try {
        const pdfjs = await import("pdfjs-dist");

        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.mjs",
          import.meta.url,
        ).toString();

        const tarefa = pdfjs.getDocument({ data: dados.slice() });
        tarefaPdf = tarefa;
        const pdf = await tarefa.promise;

        if (cancelado) {
          return;
        }

        setPaginas(pdf.numPages);

        for (let paginaAtual = 1; paginaAtual <= pdf.numPages; paginaAtual++) {
          if (cancelado) {
            return;
          }

          const pagina = await pdf.getPage(paginaAtual);
          const viewport = pagina.getViewport({ scale: zoom });
          const canvas = document.createElement("canvas");
          const contexto = canvas.getContext("2d");

          if (!contexto) {
            throw new Error("Nao foi possivel preparar a area de desenho.");
          }

          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.maxWidth = `${Math.floor(viewport.width)}px`;
          canvas.style.height = "auto";
          canvas.className = "rounded-md bg-white shadow-sm";
          canvas.setAttribute(
            "aria-label",
            `${nomeArquivo} - pagina ${paginaAtual}`,
          );

          const moldura = document.createElement("div");
          moldura.className =
            "mx-auto mb-4 w-fit max-w-full rounded-md border bg-white p-1 shadow-sm";
          moldura.appendChild(canvas);
          containerAtual.appendChild(moldura);

          await pagina.render({
            canvas,
            canvasContext: contexto,
            viewport,
          }).promise;
        }
      } catch (erroRenderizacao) {
        if (cancelado) {
          return;
        }

        setErro(
          erroRenderizacao instanceof Error
            ? erroRenderizacao.message
            : "Nao foi possivel renderizar o PDF.",
        );
      } finally {
        if (!cancelado) {
          setRenderizando(false);
        }
      }
    }

    void renderizarPdf();

    return () => {
      cancelado = true;
      containerAtual.replaceChildren();
      tarefaPdf?.destroy();
    };
  }, [dados, nomeArquivo, zoom]);

  return (
    <div className="relative min-h-[calc(100dvh-11rem)]">
      {renderizando ? (
        <div className="sticky top-0 z-10 mb-3 flex items-center justify-center rounded-md border bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm">
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
          Renderizando PDF{paginas > 0 ? ` (${paginas} pagina(s))` : ""}...
        </div>
      ) : null}

      {erro ? (
        <div className="flex h-[calc(100dvh-11rem)] items-center justify-center rounded-lg border bg-white p-6 text-center text-sm text-red-700">
          <div>
            <AlertCircle className="mx-auto mb-3 size-8" aria-hidden="true" />
            <p className="font-semibold">Nao foi possivel renderizar o PDF.</p>
            <p className="mt-1 text-red-600">{erro}</p>
          </div>
        </div>
      ) : null}

      <div ref={containerRef} className="mx-auto max-w-full pb-2" />
    </div>
  );
}

export function PdfDrawerPreview({
  children,
  nomeArquivo,
  titulo,
  descricao,
  src,
  viewerHref,
}: PdfDrawerPreviewProps) {
  const downloadSrc = src.includes("?") ? `${src}&download=1` : `${src}?download=1`;
  const [zoom, setZoom] = useState(1.15);
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<EstadoRenderizacao>({
    tipo: "carregando",
  });

  useEffect(() => {
    if (!aberto) {
      return;
    }

    let cancelado = false;
    async function carregarPdf() {
      setEstado({ tipo: "carregando" });

      try {
        const resposta = await fetch(src, {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!resposta.ok) {
          const mensagem = await resposta.text().catch(() => "");
          throw new Error(
            mensagem ||
              "Nao foi possivel carregar o PDF. Tente reenviar o anexo.",
          );
        }

        const contentType = resposta.headers.get("content-type") ?? "";

        if (!contentType.toLocaleLowerCase("pt-BR").includes("application/pdf")) {
          throw new Error(
            "O servidor retornou uma resposta que nao foi reconhecida como PDF.",
          );
        }

        const conteudo = new Uint8Array(await resposta.arrayBuffer());

        if (cancelado) {
          return;
        }

        setEstado({ tipo: "pronto", dados: conteudo });
      } catch (erro) {
        if (cancelado) {
          return;
        }

        setEstado({
          tipo: "erro",
          mensagem:
            erro instanceof Error
              ? erro.message
              : "Nao foi possivel carregar o PDF.",
        });
      }
    }

    void carregarPdf();

    return () => {
      cancelado = true;
    };
  }, [aberto, src]);

  return (
    <Drawer open={aberto} onOpenChange={setAberto}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>

      <DrawerContent swipeDirection="left" className="w-[min(94vw,72rem)]">
        <DrawerHeader className="pr-14">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <DrawerTitle className="text-base font-bold">
                {titulo}
              </DrawerTitle>
              <DrawerDescription className="mt-1 truncate text-sm text-(--muted-foreground)">
                {descricao ?? nomeArquivo}
              </DrawerDescription>
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
                href={downloadSrc}
                download={nomeArquivo}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
              >
                <Download className="size-4" aria-hidden="true" />
                Baixar PDF
              </a>
              <a
                href={viewerHref ?? src}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                Abrir
              </a>
            </div>
          </div>
        </DrawerHeader>

        <div className="relative min-h-0 flex-1 overflow-auto bg-slate-100 p-3 dark:bg-slate-900">
          {estado.tipo === "carregando" ? (
            <div className="flex h-[calc(100dvh-8rem)] items-center justify-center rounded-lg border bg-white text-sm font-semibold text-slate-600">
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              Carregando PDF...
            </div>
          ) : null}

          {estado.tipo === "erro" ? (
            <div className="flex h-[calc(100dvh-8rem)] items-center justify-center rounded-lg border bg-white p-6 text-center text-sm text-red-700">
              <div>
                <AlertCircle
                  className="mx-auto mb-3 size-8"
                  aria-hidden="true"
                />
                <p className="font-semibold">Nao foi possivel visualizar o PDF.</p>
                <p className="mt-1 text-red-600">{estado.mensagem}</p>
              </div>
            </div>
          ) : null}

          {estado.tipo === "pronto" ? (
            <PdfCanvasPages
              dados={estado.dados}
              nomeArquivo={nomeArquivo}
              zoom={zoom}
            />
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
