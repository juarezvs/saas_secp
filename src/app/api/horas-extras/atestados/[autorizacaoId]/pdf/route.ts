import React, { type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

import {
  obterPermissoesDaSessao,
  possuiPermissaoNaLista,
} from "@/modules/auth/application/services/permissao.service";
import { buscarAtestoHorasExtrasPorAutorizacaoId } from "@/modules/horas-extras/infrastructure/repositories/horas-extras-atesto.repository";
import { AtestoHorasExtrasPdfDocument } from "@/modules/horas-extras/presentation/pdf/atesto-horas-extras-pdf.document";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    autorizacaoId: string;
  }>;
};

function podeVisualizarAtesto(permissoes: string[]) {
  return (
    possuiPermissaoNaLista(permissoes, "horas-extras:visualizar-execucao:global") ||
    possuiPermissaoNaLista(permissoes, "horas-extras:visualizar-execucao:seccional") ||
    possuiPermissaoNaLista(permissoes, "horas-extras:analisar:chefia") ||
    possuiPermissaoNaLista(permissoes, "horas-extras:analisar:subordinados") ||
    possuiPermissaoNaLista(permissoes, "horas-extras:visualizar-folha:global") ||
    possuiPermissaoNaLista(permissoes, "horas-extras:visualizar-folha:seccional")
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const permissao = await obterPermissoesDaSessao();

  if (!permissao.permitido || !podeVisualizarAtesto(permissao.permissoes)) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const { autorizacaoId } = await context.params;
  const atesto = await buscarAtestoHorasExtrasPorAutorizacaoId(autorizacaoId);

  if (!atesto) {
    return new Response("Atesto nao encontrado.", { status: 404 });
  }

  if (
    !permissao.perfilAtivoEscopoGlobal &&
    permissao.orgaoIds?.length &&
    !permissao.orgaoIds.includes(atesto.autorizacao.orgaoId)
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const documento = React.createElement(AtestoHorasExtrasPdfDocument, {
    atesto,
  }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(documento);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="atesto-horas-extras-${atesto.autorizacao.mesReferencia}-${atesto.autorizacao.processoSei.replaceAll("/", "-")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
