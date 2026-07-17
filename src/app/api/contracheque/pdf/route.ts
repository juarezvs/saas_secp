import React, { type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { buscarServidorComUsuarioPorUsuarioId } from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";
import {
  buscarContrachequeSarh,
} from "@/modules/contracheque/infrastructure/oracle/contracheque-oracle.repository";
import { normalizarCompetenciaContracheque } from "@/modules/contracheque/application/services/formatar-contracheque.service";
import { ContrachequePdfDocument } from "@/modules/contracheque/presentation/pdf/contracheque-pdf.document";

export const runtime = "nodejs";

function perfilServidorAtivo(codigo?: string | null) {
  return codigo?.toUpperCase() === "SERVIDOR";
}

async function getContrachequePdf(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (
    !perfilServidorAtivo(session.user.perfilAtivo?.codigo) ||
    !permissoes.includes("contracheque:consultar:proprio")
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const competencia = normalizarCompetenciaContracheque(
    url.searchParams.get("competencia"),
  );
  const documentoId = url.searchParams.get("documento");
  const servidor = await buscarServidorComUsuarioPorUsuarioId(session.user.id);

  if (!servidor) {
    return new Response("Servidor não encontrado.", { status: 404 });
  }

  const contracheque = await buscarContrachequeSarh({
    matricula: servidor.matricula,
    competencia,
    documentoId,
    orgaoId: servidor.orgaoId,
  });

  if (!contracheque) {
    return new Response("Contracheque não encontrado no SARH.", {
      status: 404,
    });
  }

  const documento = React.createElement(ContrachequePdfDocument, {
    contracheque,
  }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(documento);
  const nomeArquivo = `contracheque-${servidor.matricula}-${competencia}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withHttpMetrics<Request, []>(
  "/api/contracheque/pdf",
  getContrachequePdf,
);
