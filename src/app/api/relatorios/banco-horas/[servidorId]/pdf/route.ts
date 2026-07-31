import React, { type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import { enfileirarRelatorioExportacaoResponse } from "@/modules/relatorios/application/services/relatorio-exportacao-response.service";
import { buscarDadosBancoHorasPdf } from "@/modules/relatorios/infrastructure/repositories/relatorios.repository";
import { BancoHorasPdfDocument } from "@/modules/relatorios/presentation/pdf/banco-horas-pdf.document";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    servidorId: string;
  }>;
};

async function getRelatorioBancoHorasPdf(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Não autenticado.", {
      status: 401,
    });
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];
  const perfilCodigo = session.user.perfilAtivo?.codigo?.toUpperCase();
  const perfilChefiaAtivo = perfilCodigo === "CHEFIA";

  const podeExportarGlobal =
    !perfilChefiaAtivo &&
    (permissoes.includes("relatorios:exportar:global") ||
      permissoes.includes("banco-horas:consultar:global"));
  const podeExportarChefia =
    perfilChefiaAtivo ||
    permissoes.includes("banco-horas:consultar:chefia") ||
    permissoes.includes("relatorios-gerenciais:exportar:chefia");
  const podeExportarProprio = permissoes.includes(
    "relatorios:exportar:proprio",
  ) || permissoes.includes("banco-horas:consultar:proprio");

  if (!podeExportarGlobal && !podeExportarChefia && !podeExportarProprio) {
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

  if (url.searchParams.get("sync") !== "1") {
    const servidor = await prisma.servidor.findUnique({
      where: {
        id: servidorId,
      },
      select: {
        usuarioId: true,
        orgaoId: true,
        lotacoes: {
          where: {
            status: "ATIVO",
          },
          select: {
            unidadeId: true,
          },
        },
      },
    });

    if (!servidor) {
      return new Response("Servidor não encontrado.", {
        status: 404,
      });
    }

    const escopoOrgao = podeExportarGlobal
      ? await obterEscopoOrgaoDaSessao()
      : null;
    const servidorDentroDoEscopoGlobal =
      podeExportarGlobal &&
      (escopoOrgao?.global || escopoOrgao?.orgaoIds.includes(servidor.orgaoId));
    const servidorDentroDoEscopoChefia = podeExportarChefia
      ? (
          await listarIdsUnidadesSubordinadasPorUsuario(session.user.id)
        ).some((unidadeId) =>
          servidor.lotacoes.some((lotacao) => lotacao.unidadeId === unidadeId),
        )
      : false;
    const servidorProprio =
      podeExportarProprio && servidor.usuarioId === session.user.id;

    if (
      !servidorDentroDoEscopoGlobal &&
      !servidorDentroDoEscopoChefia &&
      !servidorProprio
    ) {
      return new Response("Acesso negado ao servidor informado.", {
        status: 403,
      });
    }

    return enfileirarRelatorioExportacaoResponse({
      request,
      tipo: "BANCO_HORAS",
      formato: "PDF",
      usuarioId: session.user.id,
      permissoes,
      filtros: {
        servidorId,
        ano: ano ? String(ano) : null,
        mes: mes ? String(mes) : null,
      },
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

  const escopoOrgao = podeExportarGlobal
    ? await obterEscopoOrgaoDaSessao()
    : null;
  const servidorDentroDoEscopoGlobal =
    podeExportarGlobal &&
    (escopoOrgao?.global ||
      escopoOrgao?.orgaoIds.includes(dados.servidor.orgaoId));
  const servidorDentroDoEscopoChefia = podeExportarChefia
    ? (
        await listarIdsUnidadesSubordinadasPorUsuario(session.user.id)
      ).some((unidadeId) =>
        dados.servidor?.lotacoes.some(
          (lotacao) => lotacao.unidadeId === unidadeId,
        ),
      )
    : false;
  const servidorProprio =
    podeExportarProprio && dados.servidor.usuarioId === session.user.id;

  if (
    !servidorDentroDoEscopoGlobal &&
    !servidorDentroDoEscopoChefia &&
    !servidorProprio
  ) {
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

export const GET = withHttpMetrics<Request, [RouteContext]>(
  "/api/relatorios/banco-horas/:id/pdf",
  getRelatorioBancoHorasPdf,
);
