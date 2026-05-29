import React, { type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

import { auth } from "@/auth";
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

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Não autenticado.", {
      status: 401,
    });
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeConsultarGlobal = permissoes.includes(
    "boletim-frequencia:consultar:global",
  );

  const podeGerarChefia = permissoes.includes(
    "boletim-frequencia:gerar:chefia",
  );

  if (!podeConsultarGlobal && !podeGerarChefia) {
    return new Response("Acesso negado.", {
      status: 403,
    });
  }

  const { id } = await context.params;

  const boletim = await prisma.boletimFrequencia.findUnique({
    where: {
      id,
    },
    include: {
      unidade: true,
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
      servidor: {
        matricula: item.servidor.matricula,
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
    },
    anoReferencia: boletim.anoReferencia,
    mesReferencia: boletim.mesReferencia,
    status: boletim.status,
    processoSei: boletim.processoSei,
    numeroSei: boletim.numeroSei,
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
