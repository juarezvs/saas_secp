import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { buscarDadosEspelhoPontoPdf } from "@/modules/relatorios/infrastructure/repositories/relatorios.repository";
import { EspelhoPontoPdfDocument } from "@/modules/relatorios/presentation/pdf/espelho-ponto-pdf.document";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    servidorId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Não autenticado.", {
      status: 401,
    });
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeExportarGlobal = permissoes.includes("relatorios:exportar:global");

  const podeExportarProprio = permissoes.includes(
    "relatorios:exportar:proprio",
  );

  if (!podeExportarGlobal && !podeExportarProprio) {
    return new Response("Acesso negado.", {
      status: 403,
    });
  }

  const { servidorId } = await context.params;

  const url = new URL(request.url);

  const hoje = new Date();

  const ano = Number(url.searchParams.get("ano") ?? hoje.getFullYear());

  const mes = Number(url.searchParams.get("mes") ?? hoje.getMonth() + 1);

  const dados = await buscarDadosEspelhoPontoPdf({
    servidorId,
    ano,
    mes,
  });

  if (!dados.servidor) {
    return new Response("Servidor não encontrado.", {
      status: 404,
    });
  }

  if (!podeExportarGlobal && dados.servidor.usuarioId !== session.user.id) {
    return new Response("Acesso negado ao servidor informado.", {
      status: 403,
    });
  }

  const document = React.createElement(EspelhoPontoPdfDocument, {
    dados,
  });

  const buffer = await renderToBuffer(document);

  const nomeArquivo = `espelho-ponto-${dados.servidor.matricula}-${String(
    mes,
  ).padStart(2, "0")}-${ano}.pdf`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
