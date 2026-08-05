import React, { type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { registrarAuditoriaEvento } from "@/modules/auditoria/application/services/registrar-auditoria.service";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import { prepararAutenticacaoEspelhoPonto } from "@/modules/documentos-autenticacao/application/services/documento-autenticacao.service";
import { enfileirarRelatorioExportacaoResponse } from "@/modules/relatorios/application/services/relatorio-exportacao-response.service";
import { buscarDadosEspelhoPontoPdf } from "@/modules/relatorios/infrastructure/repositories/relatorios.repository";
import { EspelhoPontoPdfDocument } from "@/modules/relatorios/presentation/pdf/espelho-ponto-pdf.document";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    servidorId: string;
  }>;
};

async function getRelatorioEspelhoPdf(request: Request, context: RouteContext) {
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
      permissoes.includes("apuracao:consultar:global"));
  const podeExportarChefia =
    perfilChefiaAtivo ||
    permissoes.includes("homologacao:gerenciar:chefia") ||
    permissoes.includes("minha-equipe:consultar:chefia") ||
    permissoes.includes("relatorios-gerenciais:exportar:chefia");

  const podeExportarProprio = permissoes.includes(
    "relatorios:exportar:proprio",
  );
  const podeVisualizarEspelhoProprio = permissoes.includes(
    "espelho-ponto:visualizar:proprio",
  );

  if (
    !podeExportarGlobal &&
    !podeExportarChefia &&
    !podeExportarProprio &&
    !podeVisualizarEspelhoProprio
  ) {
    return new Response("Acesso negado.", {
      status: 403,
    });
  }

  const { servidorId } = await context.params;

  const url = new URL(request.url);

  const hoje = new Date();

  const ano = Number(url.searchParams.get("ano") ?? hoje.getFullYear());

  const mes = Number(url.searchParams.get("mes") ?? hoje.getMonth() + 1);

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

    if (
      !(await podeExportarEspelhoServidor({
        usuarioId: session.user.id,
        servidor,
        podeExportarGlobal,
        podeExportarChefia,
        podeExportarProprio: podeExportarProprio || podeVisualizarEspelhoProprio,
      }))
    ) {
      return new Response("Acesso negado ao servidor informado.", {
        status: 403,
      });
    }

    return enfileirarRelatorioExportacaoResponse({
      request,
      tipo: "ESPELHO_PONTO",
      formato: "PDF",
      usuarioId: session.user.id,
      permissoes,
      filtros: {
        servidorId,
        ano: String(ano),
        mes: String(mes),
      },
    });
  }

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

  if (
    !(await podeExportarEspelhoServidor({
      usuarioId: session.user.id,
      servidor: dados.servidor,
      podeExportarGlobal,
      podeExportarChefia,
      podeExportarProprio: podeExportarProprio || podeVisualizarEspelhoProprio,
    }))
  ) {
    return new Response("Acesso negado ao servidor informado.", {
      status: 403,
    });
  }

  const autenticacao = await prepararAutenticacaoEspelhoPonto({
    dados,
    requestUrl: request.url,
    criadoPorUsuarioId: session.user.id,
  });

  const documento = React.createElement(EspelhoPontoPdfDocument, {
    dados,
    autenticacao,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);

  const nomeArquivo = `espelho-ponto-${dados.servidor.matricula}-${String(
    mes,
  ).padStart(2, "0")}-${ano}.pdf`;

  await registrarAuditoriaEvento({
    usuarioId: session.user.id,
    entidade: "RelatorioExportacao",
    entidadeId: servidorId,
    acao: "EXPORTAR_RELATORIO_PDF",
    metadados: {
      relatorioId: "espelho-mensal",
      nomeRelatorio: "Espelho mensal de ponto",
      formato: "PDF",
      filtros: {
        ano,
        mes,
        competencia: `${ano}-${String(mes).padStart(2, "0")}`,
        servidorId,
        matricula: dados.servidor.matricula,
      },
      nomeArquivo,
    },
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withHttpMetrics<Request, [RouteContext]>(
  "/api/relatorios/espelho/:id/pdf",
  getRelatorioEspelhoPdf,
);

async function podeExportarEspelhoServidor(params: {
  usuarioId: string;
  servidor: {
    usuarioId: string | null;
    orgaoId: string;
    lotacoes: {
      unidadeId: string;
    }[];
  };
  podeExportarGlobal: boolean;
  podeExportarChefia: boolean;
  podeExportarProprio: boolean;
}) {
  if (
    params.podeExportarProprio &&
    params.servidor.usuarioId === params.usuarioId
  ) {
    return true;
  }

  if (params.podeExportarGlobal) {
    const escopoOrgao = await obterEscopoOrgaoDaSessao();

    if (
      escopoOrgao.global ||
      escopoOrgao.orgaoIds.includes(params.servidor.orgaoId)
    ) {
      return true;
    }
  }

  if (!params.podeExportarChefia) {
    return false;
  }

  const unidadesSubordinadas = await listarIdsUnidadesSubordinadasPorUsuario(
    params.usuarioId,
  );

  return unidadesSubordinadas.some((unidadeId) =>
    params.servidor.lotacoes.some((lotacao) => lotacao.unidadeId === unidadeId),
  );
}
