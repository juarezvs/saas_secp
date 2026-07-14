import React, { type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { listarLotacoesComChefiasRegistradas } from "@/modules/relatorios/infrastructure/repositories/relatorios-gerenciais.repository";
import { LotacoesChefiasPdfDocument } from "@/modules/relatorios/presentation/pdf/lotacoes-chefias-pdf.document";
import { enfileirarRelatorioExportacaoResponse } from "@/modules/relatorios/application/services/relatorio-exportacao-response.service";

export const runtime = "nodejs";

async function getRelatorioGerencialLotacoesChefiasPdf(request: Request) {
  void request;
  const session = await auth();

  if (!session?.user) {
    return new Response("Nao autenticado.", {
      status: 401,
    });
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];
  const podeExportar =
    permissoes.includes("relatorios-gerenciais:exportar:global") ||
    permissoes.includes("relatorios-gerenciais:exportar:chefia");

  if (!podeExportar) {
    return new Response("Acesso negado.", {
      status: 403,
    });
  }

  if (new URL(request.url).searchParams.get("sync") !== "1") {
    return enfileirarRelatorioExportacaoResponse({
      request,
      tipo: "LOTACOES_CHEFIAS",
      formato: "PDF",
      usuarioId: session.user.id,
      permissoes,
    });
  }

  const linhas = await listarLotacoesComChefiasRegistradas({
    usuarioId: session.user.id,
    permissoes,
  });

  const documento = React.createElement(LotacoesChefiasPdfDocument, {
    linhas,
  }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(documento);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="lotacoes-chefias.pdf"',
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withHttpMetrics(
  "/api/relatorios/gerenciais/lotacoes-chefias/pdf",
  getRelatorioGerencialLotacoesChefiasPdf,
);
