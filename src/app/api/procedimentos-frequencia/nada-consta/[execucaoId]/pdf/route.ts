import React, { type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { registrarAuditoriaEvento } from "@/modules/auditoria/application/services/registrar-auditoria.service";
import {
  obterEscopoOrgaoDaSessao,
  whereOrgaoPermitido,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { prepararAutenticacaoNadaConstaFrequencia } from "@/modules/documentos-autenticacao/application/services/documento-autenticacao.service";
import {
  NadaConstaFrequenciaPdfDocument,
  type NadaConstaFrequenciaPdfDados,
} from "@/modules/procedimentos-frequencia/presentation/pdf/nada-consta-frequencia-pdf.document";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    execucaoId: string;
  }>;
};

async function getNadaConstaPdf(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Nao autenticado.", { status: 401 });
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (
    !permissoes.includes(
      "procedimentos-frequencia:emitir-nada-consta:global",
    ) &&
    !permissoes.includes(
      "procedimentos-frequencia:emitir-nada-consta:seccional",
    )
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const escopo = await obterEscopoOrgaoDaSessao();
  const { execucaoId } = await context.params;
  const execucao =
    await prisma.procedimentoAdministrativoFrequenciaExecucao.findFirst({
      where: {
        id: execucaoId,
        procedimento: {
          categoria: "NADA_CONSTA",
        },
        orgao: whereOrgaoPermitido(escopo),
      },
      include: {
        procedimento: true,
        orgao: {
          select: {
            sigla: true,
            nome: true,
          },
        },
        servidor: {
          include: {
            cargo: true,
            usuario: {
              select: {
                nome: true,
              },
            },
            orgao: {
              select: {
                sigla: true,
                nome: true,
              },
            },
            lotacoes: {
              where: { status: "ATIVO" },
              include: {
                cargo: true,
                unidade: {
                  select: {
                    sigla: true,
                    nome: true,
                    orgao: {
                      select: {
                        sigla: true,
                      },
                    },
                  },
                },
              },
              orderBy: { dataInicio: "desc" },
              take: 1,
            },
          },
        },
        usuarioResponsavel: {
          include: {
            servidor: {
              include: {
                cargo: true,
                lotacoes: {
                  where: { status: "ATIVO" },
                  include: {
                    cargo: true,
                    unidade: {
                      select: {
                        sigla: true,
                        nome: true,
                        orgao: {
                          select: {
                            sigla: true,
                          },
                        },
                      },
                    },
                  },
                  orderBy: { dataInicio: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

  if (!execucao || !execucao.servidor) {
    return new Response("Nada Consta nao encontrado.", { status: 404 });
  }

  const dados = montarDadosPdf(execucao);
  const autenticacao = await prepararAutenticacaoNadaConstaFrequencia({
    dados: {
      execucaoId: execucao.id,
      servidor: execucao.servidor,
      orgao: execucao.orgao,
      processoSei: execucao.processoSei,
      dataInicio: execucao.dataInicio,
      dataFim: execucao.dataFim,
      criadoEm: execucao.criadoEm,
      resultado: execucao.resultado,
      dadosResultado: execucao.dadosResultado,
      usuarioResponsavel: execucao.usuarioResponsavel,
    },
    requestUrl: request.url,
    criadoPorUsuarioId: session.user.id,
  });

  const documento = React.createElement(NadaConstaFrequenciaPdfDocument, {
    dados,
    autenticacao,
  }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(documento);
  const nomeArquivo = `nada-consta-${dados.servidorMatricula}-${formatarNomeArquivo(
    dados.dataInicio,
  )}-${formatarNomeArquivo(dados.dataFim)}.pdf`;

  await registrarAuditoriaEvento({
    usuarioId: session.user.id,
    entidade: "ProcedimentoAdministrativoFrequenciaExecucao",
    entidadeId: execucao.id,
    acao: "EXPORTAR_NADA_CONSTA_FREQUENCIA_PDF",
    metadados: {
      relatorioId: "nada-consta-frequencia",
      formato: "PDF",
      filtros: {
        execucaoId: execucao.id,
        servidorId: execucao.servidorId,
        matricula: dados.servidorMatricula,
        dataInicio: formatarDataInput(dados.dataInicio),
        dataFim: formatarDataInput(dados.dataFim),
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
  "/api/procedimentos-frequencia/nada-consta/:id/pdf",
  getNadaConstaPdf,
);

type ExecucaoNadaConsta = {
  id: string;
  servidorId: string | null;
  processoSei: string | null;
  justificativa: string;
  resultado: string | null;
  dadosResultado: unknown;
  dataInicio: Date | null;
  dataFim: Date | null;
  criadoEm: Date;
  orgao: {
    sigla: string;
    nome: string;
  };
  servidor: {
    matricula: string;
    nomeFuncional: string | null;
    nomeCompletoSarh: string | null;
    cargo?: {
      descricao: string;
    } | null;
    usuario: {
      nome: string;
    };
    lotacoes: {
      cargo?: {
        descricao: string;
      } | null;
      unidade: {
        sigla: string;
        nome: string;
      };
    }[];
  } | null;
};

function montarDadosPdf(
  execucao: ExecucaoNadaConsta,
): NadaConstaFrequenciaPdfDados {
  const dadosResultado =
    execucao.dadosResultado && typeof execucao.dadosResultado === "object"
      ? (execucao.dadosResultado as Record<string, unknown>)
      : {};
  const servidor = execucao.servidor!;
  const lotacao = servidor.lotacoes[0] ?? null;
  const dataInicio = execucao.dataInicio ?? dadoData(dadosResultado.dataInicio);
  const dataFim = execucao.dataFim ?? dadoData(dadosResultado.dataFim);

  return {
    execucaoId: execucao.id,
    servidorNome:
      servidor.nomeFuncional ??
      servidor.nomeCompletoSarh ??
      servidor.usuario.nome,
    servidorMatricula: servidor.matricula,
    orgaoSigla: execucao.orgao.sigla,
    orgaoNome: execucao.orgao.nome,
    unidadeSigla: lotacao?.unidade.sigla ?? null,
    unidadeNome: lotacao?.unidade.nome ?? null,
    cargoDescricao:
      servidor.cargo?.descricao ?? lotacao?.cargo?.descricao ?? null,
    processoSei: execucao.processoSei,
    justificativa: execucao.justificativa,
    dataInicio: dataInicio ?? execucao.criadoEm,
    dataFim: dataFim ?? execucao.criadoEm,
    emitidoEm: dadoData(dadosResultado.emitidoEm) ?? execucao.criadoEm,
    diasPrevistosTrabalho: dadoNumero(dadosResultado.diasPrevistosTrabalho),
    diasTrabalhadosRegistrados: dadoNumero(
      dadosResultado.diasTrabalhadosRegistrados,
    ),
    afastamentosNoPeriodo: dadoNumero(dadosResultado.afastamentosNoPeriodo),
    saldoBancoHorasMinutos: dadoNumero(dadosResultado.saldoBancoHorasMinutos),
    debitosVencidosMinutos: dadoNumero(dadosResultado.debitosVencidosMinutos),
    faltasNaoResolvidas: dadoNumero(dadosResultado.faltasNaoResolvidas),
    pendenciasHomologacao: dadoNumero(dadosResultado.pendenciasHomologacao),
    resultado:
      dadosResultado.resultado === "NADA_CONSTA"
        ? "NADA_CONSTA"
        : "COM_PENDENCIAS",
    mensagem:
      execucao.resultado ?? "Resultado registrado no motor de procedimentos.",
  };
}

function dadoNumero(valor: unknown) {
  const numero = Number(valor ?? 0);

  return Number.isFinite(numero) ? numero : 0;
}

function dadoData(valor: unknown) {
  if (typeof valor !== "string" && !(valor instanceof Date)) return null;

  const data = new Date(valor);

  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarDataInput(valor: Date | string) {
  return new Date(valor).toISOString().slice(0, 10);
}

function formatarNomeArquivo(valor: Date | string) {
  return formatarDataInput(valor).replaceAll("-", "");
}
