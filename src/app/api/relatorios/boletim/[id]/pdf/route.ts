import React, { type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { BoletimFrequenciaPdfDocument } from "@/modules/relatorios/presentation/pdf/boletim-frequencia-pdf.document";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
      geradoPor: true,
    },
  });

  if (!boletim) {
    return new Response("Boletim não encontrado.", {
      status: 404,
    });
  }

  const homologacoes = await prisma.homologacaoServidorMes.findMany({
    where: {
      fechamentoId: boletim.fechamentoId,
    },
    orderBy: {
      criadoEm: "asc",
    },
  });

  const servidorIds = homologacoes.map((item) => item.servidorId);

  const servidores = await prisma.servidor.findMany({
    where: {
      id: {
        in: servidorIds,
      },
    },
    include: {
      usuario: true,
    },
  });

  const servidoresPorId = new Map(
    servidores.map((servidor) => [servidor.id, servidor]),
  );

  const servidoresBoletim = homologacoes
    .map((homologacao) => {
      const servidor = servidoresPorId.get(homologacao.servidorId);

      if (!servidor) {
        return null;
      }

      return {
        tipoResumo: homologacao.tipoResumo,
        cargaPrevistaMinutos: homologacao.cargaPrevistaMinutos,
        minutosTrabalhados: homologacao.minutosTrabalhados,
        minutosCredito: homologacao.minutosCredito,
        minutosDebito: homologacao.minutosDebito,
        faltas: homologacao.faltas,
        saldoBancoAntesMinutos: homologacao.saldoBancoAntesMinutos,
        saldoBancoDepoisMinutos: homologacao.saldoBancoDepoisMinutos,
        observacaoChefia: homologacao.observacaoChefia,
        servidor: {
          matricula: servidor.matricula,
          usuario: {
            nome: servidor.usuario.nome,
          },
        },
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.servidor.matricula.localeCompare(b.servidor.matricula));

  const boletimPdf = {
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
    totalPendentes: boletim.totalPendentes,
    totalComRessalva: boletim.totalComRessalva,
    totalCreditoMinutos: boletim.totalCreditoMinutos,
    totalDebitoMinutos: boletim.totalDebitoMinutos,
    saldoBancoHorasMinutos: boletim. .saldoBancoHorasMinutos,
    geradoEm: boletim.geradoEm,
    geradoPor: {
      nome: boletim.geradoPor.nome,
      matricula: boletim.geradoPor.matricula,
    },
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
