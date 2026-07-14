import React, { type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

import type { TipoRelatorioGerencial } from "../../infrastructure/repositories/relatorios-gerenciais.repository";
import { buscarDadosRelatorioGerencial } from "../../infrastructure/repositories/relatorios-gerenciais.repository";
import { RelatorioGerencialPdfDocument } from "../../presentation/pdf/relatorio-gerencial-pdf.document";

const nomesArquivo: Record<TipoRelatorioGerencial, string> = {
  HORAS_EXTRAS_BANCO_HORAS: "horas-extras-banco-horas",
  ABSENTEISMO: "absenteismo",
  JORNADA_TRABALHADA: "jornada-trabalhada",
};

export async function gerarRelatorioGerencialPdf(params: {
  tipo: TipoRelatorioGerencial;
  usuarioId: string;
  permissoes: string[];
  ano: number;
  mes: number;
  servidorId?: string | null;
}) {
  if (!Number.isInteger(params.ano) || params.ano < 2000 || params.ano > 2100) {
    throw new Error("Ano invalido.");
  }

  if (!Number.isInteger(params.mes) || params.mes < 1 || params.mes > 12) {
    throw new Error("Mes invalido.");
  }

  const podeExportar =
    params.permissoes.includes("relatorios-gerenciais:exportar:proprio") ||
    params.permissoes.includes("relatorios-gerenciais:exportar:chefia") ||
    params.permissoes.includes("relatorios-gerenciais:exportar:global");

  if (!podeExportar) {
    throw new Error("Acesso negado.");
  }

  const dados = await buscarDadosRelatorioGerencial({
    tipo: params.tipo,
    usuarioId: params.usuarioId,
    permissoes: params.permissoes,
    ano: params.ano,
    mes: params.mes,
    servidorId: params.servidorId,
  });

  if (params.servidorId && dados.linhas.length === 0) {
    throw new Error("Servidor nao encontrado ou fora do seu escopo.");
  }

  const documento = React.createElement(RelatorioGerencialPdfDocument, {
    dados,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);
  const nomeArquivo = `${nomesArquivo[params.tipo]}-${String(params.mes).padStart(
    2,
    "0",
  )}-${params.ano}.pdf`;

  return {
    buffer,
    nomeArquivo,
    contentType: "application/pdf",
  };
}

export async function gerarRelatorioGerencialPdfResponse(params: {
  request: Request;
  tipo: TipoRelatorioGerencial;
  usuarioId: string;
  permissoes: string[];
}) {
  const url = new URL(params.request.url);
  const hoje = new Date();
  const ano = Number(url.searchParams.get("ano") ?? hoje.getFullYear());
  const mes = Number(url.searchParams.get("mes") ?? hoje.getMonth() + 1);
  const servidorId = url.searchParams.get("servidorId");

  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    return new Response("Ano invalido.", {
      status: 400,
    });
  }

  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    return new Response("Mes invalido.", {
      status: 400,
    });
  }

  try {
    const relatorio = await gerarRelatorioGerencialPdf({
      tipo: params.tipo,
      usuarioId: params.usuarioId,
      permissoes: params.permissoes,
      ano,
      mes,
      servidorId,
    });

    return new Response(new Uint8Array(relatorio.buffer), {
      headers: {
        "Content-Type": relatorio.contentType,
        "Content-Disposition": `attachment; filename="${relatorio.nomeArquivo}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Erro ao gerar relatorio.";
    const status = mensagem === "Acesso negado." ? 403 : mensagem.includes("Servidor") ? 404 : 500;
    return new Response(mensagem, {
      status,
    });
  }
}
