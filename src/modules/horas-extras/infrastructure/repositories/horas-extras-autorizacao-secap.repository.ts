import type { TransactionClient } from "@/generated/prisma/internal/prismaNamespace";
import { prisma } from "@/shared/infrastructure/database/prisma";

import type { RegistrarAutorizacaoHoraExtraSecapInput } from "../../application/schemas/horas-extras-autorizacao-secap.schema";

type RegistrarAutorizacaoParams = {
  dados: RegistrarAutorizacaoHoraExtraSecapInput;
  usuarioId?: string | null;
  perfilAtivoCodigo?: string | null;
};

function dataUtc(data: string) {
  return new Date(`${data}T00:00:00.000Z`);
}

async function validarUnidadeDoOrgao(params: {
  tx: TransactionClient;
  orgaoId: string;
  unidadeId: string;
}) {
  const unidade = await params.tx.unidadeOrganizacional.findFirst({
    where: {
      id: params.unidadeId,
      orgaoId: params.orgaoId,
      ativo: true,
    },
    select: {
      id: true,
      sigla: true,
      nome: true,
    },
  });

  if (!unidade) {
    throw new Error("Unidade informada nao pertence ao orgao da autorizacao.");
  }

  return unidade;
}

async function obterServidorSnapshot(params: {
  tx: TransactionClient;
  orgaoId: string;
  servidorId: string;
  unidadeId: string;
}) {
  const servidor = await params.tx.servidor.findFirst({
    where: {
      id: params.servidorId,
      orgaoId: params.orgaoId,
      ativo: true,
    },
    select: {
      id: true,
      matricula: true,
      nomeFuncional: true,
      nomeCompletoSarh: true,
      usuario: {
        select: {
          nome: true,
        },
      },
      cargo: {
        select: {
          descricao: true,
        },
      },
    },
  });

  if (!servidor) {
    throw new Error("Servidor informado nao pertence ao orgao da autorizacao.");
  }

  const unidade = await validarUnidadeDoOrgao({
    tx: params.tx,
    orgaoId: params.orgaoId,
    unidadeId: params.unidadeId,
  });

  return {
    servidor,
    unidade,
    nome:
      servidor.nomeFuncional ??
      servidor.nomeCompletoSarh ??
      servidor.usuario.nome,
    cargo: servidor.cargo?.descricao ?? null,
  };
}

export async function registrarAutorizacaoHoraExtraSecap({
  dados,
  usuarioId,
  perfilAtivoCodigo,
}: RegistrarAutorizacaoParams) {
  return prisma.$transaction(async (tx) => {
    await validarUnidadeDoOrgao({
      tx,
      orgaoId: dados.orgaoId,
      unidadeId: dados.unidadeId,
    });

    const status = dados.confirmarRegistro
      ? "REGISTRADA_NO_SECP"
      : "RASCUNHO";
    const registradaEm = dados.confirmarRegistro ? new Date() : null;

    const autorizacao = await tx.autorizacaoHoraExtraAdministrativa.create({
      data: {
        orgaoId: dados.orgaoId,
        unidadeId: dados.unidadeId,
        processoSei: dados.processoSei,
        documentoAutorizacao: dados.documentoAutorizacao,
        mesReferencia: dados.mesReferencia,
        dataAutorizacao: dataUtc(dados.dataAutorizacao),
        autoridadeAutorizadora: dados.autoridadeAutorizadora || null,
        observacoes: dados.observacoes || null,
        origemDocumento: dados.origemDocumento || null,
        modalidade: dados.modalidade,
        status,
        conteudoOriginalAutorizado: dados,
        registradaPorUsuarioId: usuarioId ?? null,
        registradaEm,
        servidores: {
          create: await Promise.all(
            dados.servidores.map(async (servidorInput) => {
              const snapshot = await obterServidorSnapshot({
                tx,
                orgaoId: dados.orgaoId,
                servidorId: servidorInput.servidorId,
                unidadeId: servidorInput.unidadeId,
              });

              return {
                servidor: {
                  connect: {
                    id: servidorInput.servidorId,
                  },
                },
                unidade: {
                  connect: {
                    id: servidorInput.unidadeId,
                  },
                },
                matriculaSnapshot: snapshot.servidor.matricula,
                nomeSnapshot: snapshot.nome,
                unidadeSnapshot: `${snapshot.unidade.sigla} - ${snapshot.unidade.nome}`,
                cargoSnapshot: snapshot.cargo,
                periodoInicio: dataUtc(servidorInput.periodoInicio),
                periodoFim: dataUtc(servidorInput.periodoFim),
                quantidadeMaximaMinutos:
                  servidorInput.quantidadeMaximaMinutos,
                limitesPorTipoDia: servidorInput.limitesPorTipoDia ?? undefined,
                status: "AUTORIZADO" as const,
                regras: {
                  create: servidorInput.regras.map((regra) => ({
                    data: regra.data ? dataUtc(regra.data) : null,
                    tipoDia: regra.tipoDia ?? null,
                    limiteMinutos: regra.limiteMinutos ?? null,
                    faixaInicio: regra.faixaInicio ?? null,
                    faixaFim: regra.faixaFim ?? null,
                  })),
                },
              };
            }),
          ),
        },
        eventos: {
          create: {
            usuarioId: usuarioId ?? null,
            acao: dados.confirmarRegistro
              ? "AUTORIZACAO_REGISTRADA_NO_SECP"
              : "AUTORIZACAO_RASCUNHO_CRIADA",
            dadosDepois: dados,
            metadados: {
              perfilAtivo: perfilAtivoCodigo ?? null,
              origem: "SECAP",
            },
          },
        },
      },
    });
    const servidores = await tx.autorizacaoHoraExtraServidor.findMany({
      where: {
        autorizacaoId: autorizacao.id,
      },
      select: {
        id: true,
        servidorId: true,
        matriculaSnapshot: true,
        quantidadeMaximaMinutos: true,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: usuarioId ?? null,
        entidade: "AutorizacaoHoraExtraAdministrativa",
        entidadeId: autorizacao.id,
        acao: dados.confirmarRegistro
          ? "HORAS_EXTRAS_AUTORIZACAO_REGISTRADA_NO_SECP"
          : "HORAS_EXTRAS_AUTORIZACAO_RASCUNHO_CRIADA",
        dadosDepois: {
          id: autorizacao.id,
          processoSei: autorizacao.processoSei,
          documentoAutorizacao: autorizacao.documentoAutorizacao,
          mesReferencia: autorizacao.mesReferencia,
          status: autorizacao.status,
          servidores: servidores.map((servidor) => ({
            id: servidor.id,
            servidorId: servidor.servidorId,
            matricula: servidor.matriculaSnapshot,
            quantidadeMaximaMinutos: servidor.quantidadeMaximaMinutos,
          })),
        },
        metadados: {
          perfilAtivo: perfilAtivoCodigo ?? null,
          origem: "SECAP",
        },
      },
    });

    return autorizacao;
  });
}

export async function listarAutorizacoesHoraExtraSecap(params: {
  orgaoIds?: string[];
  escopoGlobal?: boolean;
}) {
  return prisma.autorizacaoHoraExtraAdministrativa.findMany({
    where: params.escopoGlobal
      ? {}
      : {
          orgaoId: {
            in: params.orgaoIds ?? [],
          },
        },
    include: {
      orgao: true,
      unidade: true,
      _count: {
        select: {
          atestos: true,
          calculos: true,
        },
      },
      servidores: {
        include: {
          _count: {
            select: {
              execucoes: true,
              classificacoes: true,
            },
          },
        },
      },
    },
    orderBy: [{ mesReferencia: "desc" }, { criadoEm: "desc" }],
  });
}
