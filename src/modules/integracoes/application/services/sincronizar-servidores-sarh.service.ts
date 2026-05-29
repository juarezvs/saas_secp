import { prisma } from "@/shared/infrastructure/database/prisma";

import { buscarOuCriarIntegracaoSarh } from "../../infrastructure/repositories/integracoes.repository";
import { buscarServidoresSarh } from "./sarh-client.service";
import { normalizarServidorSarh } from "./normalizar-servidor-sarh.service";

async function obterOuCriarOrgaoPadrao() {
  const codigoExternoSarh = Number(process.env.SARH_ORGAO_CODIGO_EXTERNO ?? 4);
  const sigla = process.env.SARH_ORGAO_SIGLA ?? "SJAM";

  const orgaoExistente = await prisma.orgao.findFirst({
    where: {
      OR: [{ codigoExternoSarh }, { sigla }],
    },
  });

  if (orgaoExistente) {
    return orgaoExistente;
  }

  return prisma.orgao.create({
    data: {
      sigla,
      nome: "SEÇÃO JUDICIÁRIA DO AMAZONAS",
      ativo: true,
      codigoExternoSarh,
      ultimaSincronizacaoSarh: new Date(),
    },
  });
}

export async function sincronizarServidoresSarhService(params: {
  usuarioId: string;
}) {
  const inicio = Date.now();
  const integracao = await buscarOuCriarIntegracaoSarh();
  const orgaoPadrao = await obterOuCriarOrgaoPadrao();

  const log = await prisma.logIntegracao.create({
    data: {
      integracaoId: integracao.id,
      tipo: "SARH",
      direcao: "ENTRADA",
      status: "PENDENTE",
      mensagem: "Sincronização de servidores SARH iniciada.",
    },
  });

  try {
    const servidoresSarh = await buscarServidoresSarh();
    const normalizados = servidoresSarh
      .map(normalizarServidorSarh)
      .filter((item) => item.matricula && item.nome);

    let criados = 0;
    let atualizados = 0;
    let ignorados = 0;

    for (const item of normalizados) {
      const resultado = await prisma.$transaction(async (tx) => {
        const usuarioExistente = await tx.usuario.findUnique({
          where: {
            matricula: item.matricula,
          },
        });

        const usuario = await tx.usuario.upsert({
          where: {
            matricula: item.matricula,
          },
          update: {
            cpf: item.cpf || null,
            nome: item.nome,
            email: item.email,
            tipo: "SERVIDOR",
            ativo: item.ativo,
          },
          create: {
            matricula: item.matricula,
            cpf: item.cpf || null,
            nome: item.nome,
            email: item.email,
            tipo: "SERVIDOR",
            ativo: item.ativo,
          },
        });

        const servidorExistente = await tx.servidor.findFirst({
          where: {
            matricula: item.matricula,
          },
        });

        if (servidorExistente) {
          await tx.servidor.update({
            where: {
              id: servidorExistente.id,
            },
            data: {
              orgao: {
                connect: {
                  id: servidorExistente.orgaoId ?? orgaoPadrao.id,
                },
              },
              ativo: item.ativo,
              cpf: item.cpf || null,
              nomeFuncional: item.nome,
              usuario: {
                connect: {
                  id: usuario.id,
                },
              },
            },
          });

          return usuarioExistente ? "ATUALIZADO" : "CRIADO";
        }

        await tx.servidor.create({
          data: {
            matricula: item.matricula,
            nomeFuncional: item.nome || "",
            cpf: item.cpf || null,
            ativo: item.ativo,
            usuario: {
              connect: {
                id: usuario.id,
              },
            },
            orgao: {
              connect: {
                id: orgaoPadrao.id,
              },
            },
          },
        });

        return "CRIADO";
      });

      if (resultado === "CRIADO") {
        criados++;
      } else if (resultado === "ATUALIZADO") {
        atualizados++;
      } else {
        ignorados++;
      }
    }

    const duracaoMs = Date.now() - inicio;

    await prisma.$transaction(async (tx) => {
      await tx.logIntegracao.update({
        where: {
          id: log.id,
        },
        data: {
          status: "SUCESSO",
          mensagem: "Sincronização de servidores SARH concluída.",
          payloadEntrada: {
            quantidadeRecebida: servidoresSarh.length,
          },
          payloadSaida: {
            criados,
            atualizados,
            ignorados,
          },
          finalizadoEm: new Date(),
          duracaoMs,
        },
      });

      await tx.integracaoSistema.update({
        where: {
          id: integracao.id,
        },
        data: {
          status: "ATIVA",
          ultimoSucessoEm: new Date(),
          ultimoErro: null,
        },
      });

      await tx.auditoriaEvento.create({
        data: {
          usuario: {
            connect: {
              id: params.usuarioId,
            },
          },
          entidade: "IntegracaoSistema",
          entidadeId: integracao.id,
          acao: "SINCRONIZACAO_SARH_EXECUTADA",
          dadosDepois: {
            criados,
            atualizados,
            ignorados,
            quantidadeRecebida: servidoresSarh.length,
            duracaoMs,
          },
        },
      });
    });

    return {
      sucesso: true,
      mensagem: "Sincronização SARH executada com sucesso.",
      criados,
      atualizados,
      ignorados,
    };
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : "Erro desconhecido no SARH.";

    await prisma.$transaction(async (tx) => {
      await tx.logIntegracao.update({
        where: {
          id: log.id,
        },
        data: {
          status: "ERRO",
          erro: mensagem,
          finalizadoEm: new Date(),
          duracaoMs: Date.now() - inicio,
        },
      });

      await tx.integracaoSistema.update({
        where: {
          id: integracao.id,
        },
        data: {
          status: "ERRO",
          ultimoErroEm: new Date(),
          ultimoErro: mensagem,
        },
      });
    });

    return {
      sucesso: false,
      mensagem,
      criados: 0,
      atualizados: 0,
      ignorados: 0,
    };
  }
}
