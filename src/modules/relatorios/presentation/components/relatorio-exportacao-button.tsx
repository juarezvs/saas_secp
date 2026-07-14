"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

type Estado = "pronto" | "enfileirando" | "processando" | "baixando" | "erro";

function aguardar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function RelatorioExportacaoButton({
  href,
  children = "Exportar PDF",
  className,
  modo = "assincrono",
}: {
  href: string;
  children?: string;
  className?: string;
  modo?: "assincrono" | "auto";
}) {
  const [estado, setEstado] = useState<Estado>("pronto");

  async function baixarResponse(response: Response) {
    setEstado("baixando");
    const blob = await response.blob();
    const contentDisposition = response.headers.get("content-disposition") ?? "";
    const nomeArquivo =
      contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1] ??
      "exportacao";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = decodeURIComponent(nomeArquivo);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function iniciar() {
    try {
      setEstado("enfileirando");
      const response = await fetch(href, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Falha ao enfileirar relatorio.");
      }

      const contentType = response.headers.get("content-type") ?? "";

      if (modo === "auto" && !contentType.includes("application/json")) {
        await baixarResponse(response);
        setEstado("pronto");
        return;
      }

      const data = (await response.json()) as {
        statusUrl: string;
        downloadUrl: string;
      };

      setEstado("processando");

      for (let tentativa = 0; tentativa < 120; tentativa += 1) {
        await aguardar(tentativa < 10 ? 1000 : 3000);

        const statusResponse = await fetch(data.statusUrl, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!statusResponse.ok) {
          throw new Error("Falha ao consultar relatorio.");
        }

        const status = (await statusResponse.json()) as {
          estado: string;
          resultado?: {
            downloadUrl: string;
          } | null;
          erro?: string | null;
        };

        if (status.estado === "completed" && status.resultado?.downloadUrl) {
          window.location.assign(status.resultado.downloadUrl);
          setEstado("pronto");
          return;
        }

        if (status.estado === "failed") {
          throw new Error(status.erro ?? "Relatorio falhou.");
        }
      }

      throw new Error("Tempo limite ao gerar relatorio.");
    } catch {
      setEstado("erro");
    }
  }

  const ocupado =
    estado === "enfileirando" ||
    estado === "processando" ||
    estado === "baixando";

  return (
    <button
      type="button"
      onClick={iniciar}
      disabled={ocupado}
      className={
        className ??
        "mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
      }
    >
      {ocupado ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      {estado === "enfileirando"
        ? "Enfileirando"
        : estado === "processando"
          ? "Gerando"
          : estado === "baixando"
            ? "Baixando"
          : estado === "erro"
            ? "Tentar novamente"
            : children}
    </button>
  );
}
