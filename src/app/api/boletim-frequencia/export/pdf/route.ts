import React, { type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { listarBoletinsFrequenciaParaPdfAgrupado } from "@/modules/boletim-frequencia/infrastructure/repositories/boletim-frequencia.repository";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  BoletinsFrequenciaPdfDocument,
  type BoletimFrequenciaPdf,
} from "@/modules/relatorios/presentation/pdf/boletim-frequencia-pdf.document";

export const runtime = "nodejs";

async function getBoletimFrequenciaExportPdf(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Nao autenticado.", { status: 401 });
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];
  const podeAcessar = usuarioPossuiAlgumaPermissaoNoPerfil(
    session.user.perfilAtivo?.codigo,
    permissoes,
    [
      "boletim-frequencia:gerar:chefia",
      "boletim-frequencia:encaminhar:chefia",
      "boletim-frequencia:receber:global",
      "boletim-frequencia:consultar:global",
    ],
  );

  if (!podeAcessar) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const podeConsultarGlobal = permissoes.some((permissao) =>
    [
      "boletim-frequencia:receber:global",
      "boletim-frequencia:consultar:global",
    ].includes(permissao),
  );
  const unidadeIdsPermitidos = podeConsultarGlobal
    ? undefined
    : await listarIdsUnidadesSubordinadasPorUsuario(session.user.id);
  const url = new URL(request.url);
  const boletins = await listarBoletinsFrequenciaParaPdfAgrupado({
    busca: url.searchParams.get("busca") ?? "",
    anoReferencia: url.searchParams.get("anoReferencia") ?? "",
    mesReferencia: url.searchParams.get("mesReferencia") ?? "",
    unidade: url.searchParams.get("unidade") ?? "",
    unidadeId: url.searchParams.get("unidadeId") ?? "",
    unidadeIds: url.searchParams.getAll("unidadeIds"),
    unidadeIdsPermitidos,
    status: url.searchParams.get("status") ?? "",
  });

  if (boletins.length === 0) {
    return new Response(
      "Nenhum boletim encontrado para os filtros informados.",
      {
        status: 404,
      },
    );
  }

  const unidadeCabecalho = await resolverUnidadeCabecalhoExportacao({
    usuarioId: session.user.id,
    unidadeIdFiltro: url.searchParams.get("unidadeId") ?? "",
    podeConsultarGlobal,
    boletins,
  });
  const boletimAgrupado = montarBoletimAgrupadoParaPdf(
    boletins,
    unidadeCabecalho,
  );
  const documento = React.createElement(BoletinsFrequenciaPdfDocument, {
    boletins: [boletimAgrupado],
  }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(documento);
  const competencia = resolverCompetenciaArquivo(boletins);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="boletins-frequencia-agrupado-${competencia}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withHttpMetrics(
  "/api/boletim-frequencia/export/pdf",
  getBoletimFrequenciaExportPdf,
);

function mapearBoletimPdf(
  boletim: Awaited<
    ReturnType<typeof listarBoletinsFrequenciaParaPdfAgrupado>
  >[number],
): BoletimFrequenciaPdf {
  return {
    unidade: {
      sigla: boletim.unidade.sigla,
      nome: boletim.unidade.nome,
      uf: boletim.unidade.uf,
      orgao: {
        sigla: boletim.unidade.orgao.sigla,
        nome: boletim.unidade.orgao.nome,
      },
    },
    anoReferencia: boletim.anoReferencia,
    mesReferencia: boletim.mesReferencia,
    status: boletim.status,
    processoSei: boletim.processoSei,
    numeroSei: boletim.numeroSei,
    observacao: boletim.observacao,
    totalServidores: boletim.totalServidores,
    totalHomologados: boletim.totalHomologados,
    totalComRessalva: boletim.totalComRessalva,
    totalFaltas: boletim.totalFaltas,
    totalCargaPrevistaMinutos: boletim.totalCargaPrevistaMinutos,
    totalTrabalhadoMinutos: boletim.totalTrabalhadoMinutos,
    totalCreditoMinutos: boletim.totalCreditoMinutos,
    totalDebitoMinutos: boletim.totalDebitoMinutos,
    geradoEm: boletim.geradoEm,
    encaminhadoEm: boletim.encaminhadoEm,
    recebidoEm: boletim.recebidoEm,
    geradoPor: {
      nome: boletim.geradoPor.nome,
    },
    encaminhadoPor: boletim.encaminhadoPor
      ? {
          nome: boletim.encaminhadoPor.nome,
        }
      : null,
    recebidoPor: boletim.recebidoPor
      ? {
          nome: boletim.recebidoPor.nome,
        }
      : null,
    servidores: boletim.servidores.map((item) => ({
      tipoResumo: item.tipoResumo,
      cargaPrevistaMinutos: item.cargaPrevistaMinutos,
      minutosTrabalhados: item.minutosTrabalhados,
      minutosCredito: item.minutosCredito,
      minutosDebito: item.minutosDebito,
      faltas: item.faltas,
      saldoBancoAntesMinutos: item.saldoBancoAntesMinutos,
      saldoBancoDepoisMinutos: item.saldoBancoDepoisMinutos,
      observacaoChefia: item.observacaoChefia,
      ressalvas: item.ressalvas,
      ocorrencias: item.ocorrencias,
      servidor: {
        matricula: item.servidor.matricula,
        nomeFuncional: item.servidor.nomeFuncional,
        usuario: {
          nome: item.servidor.usuario.nome,
        },
        lotacoes: item.servidor.lotacoes.map((lotacao) => ({
          unidade: {
            sigla: lotacao.unidade.sigla,
          },
        })),
      },
    })),
  };
}

type BoletimAgrupavel = Awaited<
  ReturnType<typeof listarBoletinsFrequenciaParaPdfAgrupado>
>[number];

type UnidadeCabecalho = BoletimAgrupavel["unidade"];

async function resolverUnidadeCabecalhoExportacao(params: {
  usuarioId: string;
  unidadeIdFiltro: string;
  podeConsultarGlobal: boolean;
  boletins: BoletimAgrupavel[];
}): Promise<UnidadeCabecalho> {
  if (!params.podeConsultarGlobal) {
    const unidadeGestora = await resolverUnidadeGestoraDoUsuario(
      params.usuarioId,
      params.unidadeIdFiltro,
    );

    if (unidadeGestora) {
      return unidadeGestora;
    }
  }

  if (params.unidadeIdFiltro) {
    const unidadeFiltro = await prisma.unidadeOrganizacional.findUnique({
      where: { id: params.unidadeIdFiltro },
      include: { orgao: true },
    });

    if (unidadeFiltro) {
      return unidadeFiltro;
    }
  }

  return params.boletins[0].unidade;
}

async function resolverUnidadeGestoraDoUsuario(
  usuarioId: string,
  unidadeIdFiltro: string,
) {
  const hoje = new Date();
  const gestoras = await prisma.gestorUnidade.findMany({
    where: {
      ativo: true,
      dataInicio: { lte: hoje },
      OR: [{ dataFim: null }, { dataFim: { gte: hoje } }],
      servidor: {
        usuarioId,
        ativo: true,
      },
    },
    select: {
      unidadeId: true,
      unidade: {
        include: {
          orgao: true,
        },
      },
    },
    orderBy: {
      unidade: {
        sigla: "asc",
      },
    },
  });

  if (gestoras.length === 0) {
    return null;
  }

  if (!unidadeIdFiltro) {
    return gestoras[0].unidade;
  }

  const gestorasPorId = new Map(
    gestoras.map((gestora) => [gestora.unidadeId, gestora.unidade]),
  );
  let unidadeAtual = await prisma.unidadeOrganizacional.findUnique({
    where: { id: unidadeIdFiltro },
    select: {
      id: true,
      unidadePaiId: true,
    },
  });

  while (unidadeAtual) {
    const gestora = gestorasPorId.get(unidadeAtual.id);

    if (gestora) {
      return gestora;
    }

    if (!unidadeAtual.unidadePaiId) {
      break;
    }

    unidadeAtual = await prisma.unidadeOrganizacional.findUnique({
      where: { id: unidadeAtual.unidadePaiId },
      select: {
        id: true,
        unidadePaiId: true,
      },
    });
  }

  return gestoras[0].unidade;
}

function montarBoletimAgrupadoParaPdf(
  boletins: BoletimAgrupavel[],
  unidadeCabecalho: UnidadeCabecalho,
): BoletimFrequenciaPdf {
  const [primeiro] = boletins;
  const totalizadores = boletins.reduce(
    (acc, boletim) => ({
      totalServidores: acc.totalServidores + boletim.totalServidores,
      totalHomologados: acc.totalHomologados + boletim.totalHomologados,
      totalComRessalva: acc.totalComRessalva + boletim.totalComRessalva,
      totalFaltas: acc.totalFaltas + boletim.totalFaltas,
      totalCargaPrevistaMinutos:
        acc.totalCargaPrevistaMinutos + boletim.totalCargaPrevistaMinutos,
      totalTrabalhadoMinutos:
        acc.totalTrabalhadoMinutos + boletim.totalTrabalhadoMinutos,
      totalCreditoMinutos: acc.totalCreditoMinutos + boletim.totalCreditoMinutos,
      totalDebitoMinutos: acc.totalDebitoMinutos + boletim.totalDebitoMinutos,
    }),
    {
      totalServidores: 0,
      totalHomologados: 0,
      totalComRessalva: 0,
      totalFaltas: 0,
      totalCargaPrevistaMinutos: 0,
      totalTrabalhadoMinutos: 0,
      totalCreditoMinutos: 0,
      totalDebitoMinutos: 0,
    },
  );

  const servidores = boletins
    .flatMap((boletim) => boletim.servidores)
    .sort((a, b) =>
      a.servidor.matricula.localeCompare(b.servidor.matricula, "pt-BR"),
    );

  return {
    ...mapearBoletimPdf(primeiro),
    unidade: {
      sigla: unidadeCabecalho.sigla,
      nome: unidadeCabecalho.nome,
      uf: unidadeCabecalho.uf,
      orgao: {
        sigla: unidadeCabecalho.orgao.sigla,
        nome: unidadeCabecalho.orgao.nome,
      },
    },
    observacao: boletins
      .map((boletim) => boletim.observacao)
      .filter(Boolean)
      .join("\n\n"),
    ...totalizadores,
    servidores: mapearBoletimPdf({
      ...primeiro,
      servidores,
    }).servidores,
  };
}

function resolverCompetenciaArquivo(
  boletins: Awaited<ReturnType<typeof listarBoletinsFrequenciaParaPdfAgrupado>>,
) {
  const competencias = new Set(
    boletins.map(
      (boletim) =>
        `${String(boletim.mesReferencia).padStart(2, "0")}-${boletim.anoReferencia}`,
    ),
  );

  if (competencias.size === 1) {
    return Array.from(competencias)[0];
  }

  return "multiplas-competencias";
}
