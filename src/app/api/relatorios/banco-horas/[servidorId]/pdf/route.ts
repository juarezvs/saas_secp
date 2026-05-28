import React, { type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { buscarDadosBancoHorasPdf } from "@/modules/relatorios/infrastructure/repositories/relatorios.repository";
import { BancoHorasPdfDocument } from "@/modules/relatorios/presentation/pdf/banco-horas-pdf.document";

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
  const anoParam = url.searchParams.get("ano");
  const mesParam = url.searchParams.get("mes");

  const ano = anoParam ? Number(anoParam) : undefined;
  const mes = mesParam ? Number(mesParam) : undefined;

  if (anoParam && (!ano || Number.isNaN(ano))) {
    return new Response("Ano inválido.", {
      status: 400,
    });
  }

  if (mesParam && (!mes || Number.isNaN(mes) || mes < 1 || mes > 12)) {
    return new Response("Mês inválido.", {
      status: 400,
    });
  }

  const dados = await buscarDadosBancoHorasPdf({
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

  const documento = React.createElement(BancoHorasPdfDocument, {
    dados,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);

  const referencia =
    ano && mes ? `${String(mes).padStart(2, "0")}-${ano}` : "historico";

  const nomeArquivo = `banco-horas-${dados.servidor.matricula}-${referencia}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
