import React, { type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { enfileirarRelatorioExportacaoResponse } from "@/modules/relatorios/application/services/relatorio-exportacao-response.service";
import { BoletimFrequenciaPdfDocument } from "@/modules/relatorios/presentation/pdf/boletim-frequencia-pdf.document";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type BoletimPdf = React.ComponentProps<
  typeof BoletimFrequenciaPdfDocument
>["boletim"];

async function getRelatorioBoletimPdf(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Não autenticado.", {
      status: 401,
    });
  }

  const podeAcessar = usuarioPossuiAlgumaPermissaoNoPerfil(
    session.user.perfilAtivo?.codigo,
    session.user.perfilAtivo?.permissoes,
    [
      "boletim-frequencia:gerar:chefia",
      "boletim-frequencia:encaminhar:chefia",
      "boletim-frequencia:receber:global",
      "boletim-frequencia:consultar:global",
    ],
  );

  if (!podeAcessar) {
    return new Response("Acesso negado.", {
      status: 403,
    });
  }

  const { id } = await context.params;

  if (new URL(request.url).searchParams.get("sync") !== "1") {
    const boletimExiste = await prisma.boletimFrequencia.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!boletimExiste) {
      return new Response("Boletim nÃ£o encontrado.", {
        status: 404,
      });
    }

    return enfileirarRelatorioExportacaoResponse({
      request,
      tipo: "BOLETIM_FREQUENCIA",
      formato: "PDF",
      usuarioId: session.user.id,
      permissoes: session.user.perfilAtivo?.permissoes ?? [],
      filtros: {
        boletimId: id,
      },
    });
  }

  const boletim = await prisma.boletimFrequencia.findUnique({
    where: {
      id,
    },
    include: {
      unidade: {
        include: {
          orgao: true,
        },
      },
      geradoPor: true,
      encaminhadoPor: true,
      recebidoPor: true,
    },
  });

  if (!boletim) {
    return new Response("Boletim não encontrado.", {
      status: 404,
    });
  }

  const itensBoletim = await prisma.boletimFrequenciaServidor.findMany({
    where: {
      boletimId: boletim.id,
    },
    include: {
      servidor: {
        include: {
          usuario: true,
          lotacoes: {
            where: {
              status: "ATIVO",
            },
            include: {
              unidade: {
                select: {
                  sigla: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const servidoresBoletim = itensBoletim
    .map((item) => ({
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
    }))
    .sort((a, b) => a.servidor.matricula.localeCompare(b.servidor.matricula));

  const boletimPdf: BoletimPdf = {
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
    servidores: servidoresBoletim,
  };

  const documento = React.createElement(BoletimFrequenciaPdfDocument, {
    boletim: boletimPdf,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);

  const nomeArquivo = `boletim-frequencia-${boletim.unidade.sigla}-${String(
    boletim.mesReferencia,
  ).padStart(2, "0")}-${boletim.anoReferencia}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withHttpMetrics<Request, [RouteContext]>(
  "/api/relatorios/boletim/:id/pdf",
  getRelatorioBoletimPdf,
);
