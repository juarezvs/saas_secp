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

  const podeExportar =
    params.permissoes.includes("relatorios-gerenciais:exportar:proprio") ||
    params.permissoes.includes("relatorios-gerenciais:exportar:chefia") ||
    params.permissoes.includes("relatorios-gerenciais:exportar:global");

  if (!podeExportar) {
    return new Response("Acesso negado.", {
      status: 403,
    });
  }

  const dados = await buscarDadosRelatorioGerencial({
    tipo: params.tipo,
    usuarioId: params.usuarioId,
    permissoes: params.permissoes,
    ano,
    mes,
    servidorId,
  });

  if (servidorId && dados.linhas.length === 0) {
    return new Response("Servidor nao encontrado ou fora do seu escopo.", {
      status: 404,
    });
  }

  const documento = React.createElement(RelatorioGerencialPdfDocument, {
    dados,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);
  const nomeArquivo = `${nomesArquivo[params.tipo]}-${String(mes).padStart(
    2,
    "0",
  )}-${ano}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
