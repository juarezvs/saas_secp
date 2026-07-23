import { prisma } from "@/shared/infrastructure/database/prisma";
import { obterDataReferencia } from "@/modules/marcacoes/application/services/data-marcacao.service";
import { classificarProximaMarcacao } from "@/modules/marcacoes/application/services/classificar-marcacao.service";
import { recalcularDiaEBancoHorasServidorService } from "@/modules/recalculo/application/services/recalcular-dia-e-banco-horas-servidor.service";
import { normalizarMarcacoesSemIntervaloService } from "@/modules/marcacoes/application/services/normalizar-marcacoes-sem-intervalo.service";
import { resolverDataReferenciaOperacionalMarcacaoService } from "@/modules/marcacoes/application/services/resolver-data-referencia-operacional-marcacao.service";
import { verificarPeriodoHomologado } from "@/modules/boletim-frequencia/application/services/bloquear-periodo-homologado.service";
import { resolverFusoHorarioServidorNoBanco } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import {
  ampliarVigenciaJornadaPadraoAutomaticaService,
  garantirJornadaPadraoServidorService,
} from "@/modules/jornadas/application/services/garantir-jornada-padrao-servidor.service";
import { resolverServidorMarcacaoBrutaService } from "./resolver-servidor-marcacao-bruta.service";

function somenteDigitos(valor: string | null | undefined) {
  return valor?.replace(/\D/g, "") || null;
}

function cpfServidorCompativel(
  cpfMarcacao: string | null | undefined,
  servidor: {
    cpf?: string | null;
    usuario?: { cpf?: string | null } | null;
  } | null,
) {
  const cpf = somenteDigitos(cpfMarcacao);

  if (!cpf || !servidor) {
    return true;
  }

  const cpfsServidor = [servidor.cpf, servidor.usuario?.cpf]
    .map(somenteDigitos)
    .filter(Boolean);

  return cpfsServidor.includes(cpf);
}

function resolverMatriculaJuizProvavel(matricula: string | null | undefined) {
  const digitos = somenteDigitos(matricula);

  if (!digitos) {
    return null;
  }

  const numero = digitos.replace(/^0+/, "") || "0";

  return `JU${numero}`;
}

export async function processarMarcacaoBrutaService(params: {
  marcacaoBrutaId: string;
  usuarioIdAuditoria?: string;
  recalcularImpactos?: boolean;
}) {
  const bruta = await prisma.marcacaoBruta.findUnique({
    where: {
      id: params.marcacaoBrutaId,
    },
  });

  if (!bruta) {
    return {
      sucesso: false,
      mensagem: "Marcação bruta não encontrada.",
    };
  }

  if (bruta.processada && bruta.marcacaoId) {
    return {
      sucesso: true,
      mensagem: "Marcação bruta já processada.",
      marcacaoId: bruta.marcacaoId,
    };
  }

  if (!bruta.matricula && !bruta.cpf && !bruta.pis && !bruta.servidorId) {
    return {
      sucesso: false,
      mensagem: "Marcação bruta sem CPF ou matrícula. Ela ficará pendente.",
    };
  }

  let servidor = bruta.servidorId
    ? await prisma.servidor.findFirst({
        where: {
          id: bruta.servidorId,
          ativo: true,
        },
        select: {
          id: true,
          matricula: true,
          cpf: true,
          pis: true,
          usuario: {
            select: {
              cpf: true,
            },
          },
        },
    })
    : await resolverServidorMarcacaoBrutaService({
        cpf: bruta.cpf,
        pis: bruta.pis,
        matricula: bruta.matricula,
        equipamentoId: bruta.equipamentoId,
      });

  if (!cpfServidorCompativel(bruta.cpf, servidor)) {
    servidor = await resolverServidorMarcacaoBrutaService({
      cpf: bruta.cpf,
      pis: bruta.pis,
      matricula: bruta.matricula,
      equipamentoId: bruta.equipamentoId,
    });
  }

  if (!servidor && (bruta.cpf || bruta.pis || bruta.matricula)) {
    servidor = await resolverServidorMarcacaoBrutaService({
      cpf: bruta.cpf,
      pis: bruta.pis,
      matricula: bruta.matricula,
      equipamentoId: bruta.equipamentoId,
    });
  }

  if (!servidor) {
    const matriculaJuiz = resolverMatriculaJuizProvavel(bruta.matricula);

    if (bruta.equipamentoId && matriculaJuiz) {
      await prisma.$transaction([
        prisma.marcacaoBruta.update({
          where: { id: bruta.id },
          data: {
            processada: true,
            processadaEm: new Date(),
            servidorId: null,
            marcacaoId: null,
            matricula: matriculaJuiz,
            payloadOriginal: {
              ...((bruta.payloadOriginal &&
              typeof bruta.payloadOriginal === "object" &&
              !Array.isArray(bruta.payloadOriginal)
                ? bruta.payloadOriginal
                : {}) as Record<string, unknown>),
              matriculaNormalizada: matriculaJuiz,
              ignoradaPorProvavelJuiz: true,
              motivoIgnorada:
                "Matricula numerica de equipamento sem servidor correspondente no orgao; provavel juiz, sem registro de ponto.",
            },
          },
        }),
        prisma.auditoriaEvento.create({
          data: {
            usuarioId: params.usuarioIdAuditoria ?? null,
            entidade: "MarcacaoBruta",
            entidadeId: bruta.id,
            acao: "MARCACAO_BRUTA_IGNORADA_PROVAVEL_JUIZ",
            dadosDepois: {
              matriculaOriginal: bruta.matricula,
              matriculaJuiz,
              equipamentoId: bruta.equipamentoId,
              origem: bruta.origem,
              dataHora: bruta.dataHora,
              motivo:
                "Matricula numerica de equipamento sem servidor correspondente no orgao; provavel juiz, sem registro de ponto.",
            },
          },
        }),
      ]);

      return {
        sucesso: true,
        mensagem: "Marcacao bruta ignorada por provavel matricula de juiz.",
      };
    }

    return {
      sucesso: false,
      mensagem:
        "Servidor ainda não cadastrado para esta marcação bruta. Ela ficará pendente.",
    };
  }

  if (
    bruta.servidorId !== servidor.id ||
    bruta.matricula !== servidor.matricula ||
    (!bruta.cpf && servidor.cpf) ||
    (!bruta.pis && servidor.pis)
  ) {
    await prisma.marcacaoBruta.update({
      where: { id: bruta.id },
      data: {
        servidorId: servidor.id,
        matricula: servidor.matricula,
        cpf: bruta.cpf ?? servidor.cpf,
        pis: bruta.pis ?? servidor.pis,
      },
    });
  }

  let fusoHorario = await resolverFusoHorarioServidorNoBanco({
    servidorId: servidor.id,
  });
  let dataReferenciaCivil = obterDataReferencia(bruta.dataHora, fusoHorario);
  fusoHorario = await resolverFusoHorarioServidorNoBanco({
    servidorId: servidor.id,
    dataReferencia: dataReferenciaCivil,
  });
  dataReferenciaCivil = obterDataReferencia(bruta.dataHora, fusoHorario);
  const resolucaoDataReferencia =
    await resolverDataReferenciaOperacionalMarcacaoService(prisma, {
      servidorId: servidor.id,
      dataHora: bruta.dataHora,
      dataReferenciaCivil,
      fusoHorario,
      origem: bruta.origem,
    });
  const dataReferencia = resolucaoDataReferencia.dataReferencia;

  await verificarPeriodoHomologado({
    servidorId: servidor.id,
    dataReferencia,
  });

  let jornadaServidor = await prisma.jornadaServidor.findFirst({
    where: {
      servidorId: servidor.id,
      ativo: true,
      status: "ATIVO",
      dataInicio: {
        lte: dataReferencia,
      },
      OR: [
        {
          dataFim: null,
        },
        {
          dataFim: {
            gte: dataReferencia,
          },
        },
      ],
    },
    include: {
      jornada: true,
    },
    orderBy: {
      dataInicio: "desc",
    },
  });

  if (!jornadaServidor) {
    const vigenciaAmpliada =
      await ampliarVigenciaJornadaPadraoAutomaticaService(
        prisma,
        servidor.id,
        dataReferencia,
      );

    if (vigenciaAmpliada) {
      jornadaServidor = await prisma.jornadaServidor.findFirst({
        where: {
          servidorId: servidor.id,
          ativo: true,
          status: "ATIVO",
          dataInicio: { lte: dataReferencia },
          OR: [{ dataFim: null }, { dataFim: { gte: dataReferencia } }],
        },
        include: { jornada: true },
        orderBy: { dataInicio: "desc" },
      });
    }
  }

  if (!jornadaServidor) {
    await garantirJornadaPadraoServidorService(
      prisma,
      servidor.id,
      dataReferencia,
    );

    jornadaServidor = await prisma.jornadaServidor.findFirst({
      where: {
        servidorId: servidor.id,
        ativo: true,
        status: "ATIVO",
        dataInicio: { lte: dataReferencia },
        OR: [{ dataFim: null }, { dataFim: { gte: dataReferencia } }],
      },
      include: { jornada: true },
      orderBy: { dataInicio: "desc" },
    });
  }

  if (!jornadaServidor) {
    return {
      sucesso: false,
      mensagem: "Servidor sem jornada vigente para a data da marcação.",
    };
  }

  const marcacoesDoDia = await prisma.marcacao.findMany({
    where: {
      servidorId: servidor.id,
      dataReferencia,
      status: {
        in: ["VALIDA", "PENDENTE", "AJUSTADA"],
      },
    },
    orderBy: {
      dataHora: "asc",
    },
  });

  const marcacaoDuplicada =
    marcacoesDoDia.find(
      (marcacao) => marcacao.dataHora.getTime() === bruta.dataHora.getTime(),
    ) ??
    (await prisma.marcacao.findFirst({
      where: {
        servidorId: servidor.id,
        dataHora: bruta.dataHora,
        status: {
          in: ["VALIDA", "PENDENTE", "AJUSTADA"],
        },
      },
      orderBy: {
        criadoEm: "asc",
      },
    }));

  if (marcacaoDuplicada) {
    await prisma.$transaction([
      prisma.marcacaoBruta.update({
        where: { id: bruta.id },
        data: {
          processada: true,
          processadaEm: new Date(),
          servidorId: servidor.id,
          marcacaoId: marcacaoDuplicada.id,
        },
      }),
      prisma.auditoriaEvento.create({
        data: {
          usuarioId: params.usuarioIdAuditoria ?? null,
          entidade: "MarcacaoBruta",
          entidadeId: bruta.id,
          acao: "MARCACAO_BRUTA_DUPLICADA_VINCULADA",
          dadosDepois: {
            servidorId: servidor.id,
            marcacaoId: marcacaoDuplicada.id,
            dataHora: bruta.dataHora,
            origem: bruta.origem,
          },
        },
      }),
    ]);

    return {
      sucesso: true,
      mensagem: "Marcação bruta duplicada vinculada à marcação existente.",
      marcacaoId: marcacaoDuplicada.id,
    };
  }

  const marcacoesImportadasDoDia = marcacoesDoDia.filter(
    (marcacao) =>
      ["EQUIPAMENTO_BIOMETRICO", "AFD"].includes(marcacao.fonte) &&
      ["ENTRADA", "SAIDA", "MANUAL"].includes(marcacao.tipo),
  );
  const quantidadeMarcacoesOrdinarias = marcacoesDoDia.filter((marcacao) =>
    ["ENTRADA", "SAIDA_INTERVALO", "RETORNO_INTERVALO", "SAIDA"].includes(
      marcacao.tipo,
    ),
  ).length;
  const excedeMarcacoesSemIntervalo =
    !jornadaServidor.jornada.exigeIntervalo &&
    quantidadeMarcacoesOrdinarias >= 2;
  const deveNormalizarMarcacoesSemIntervalo =
    !jornadaServidor.jornada.exigeIntervalo &&
    ["EQUIPAMENTO_BIOMETRICO", "IMPORTACAO_AFD"].includes(bruta.origem);
  const classificacao = excedeMarcacoesSemIntervalo
    ? {
        tipo: "MANUAL" as const,
        ordem: marcacoesDoDia.length + 1,
        descricao: "Marcação intermediária importada do AFD",
        exigeReconhecimentoFacial: false,
      }
    : classificarProximaMarcacao({
        marcacoesDoDia,
        exigeIntervalo: jornadaServidor.jornada.exigeIntervalo,
      });

  const marcacao = await prisma.$transaction(async (tx) => {
    const novaMarcacao = await tx.marcacao.create({
      data: {
        servidorId: servidor.id,
        jornadaServidorId: jornadaServidor.id,
        dataHora: bruta.dataHora,
        dataReferencia,
        fusoHorario,
        tipo: classificacao.tipo,
        fonte:
          bruta.origem === "EQUIPAMENTO_BIOMETRICO" ||
          bruta.origem === "IMPORTACAO_AFD"
            ? "EQUIPAMENTO_BIOMETRICO"
            : "WEB",
        status: "VALIDA",
        observacao: `Marcação processada a partir de marcação bruta (${bruta.origem}).`,
        metadados: {
          marcacaoBrutaId: bruta.id,
          origemBruta: bruta.origem,
          equipamentoCodigo: bruta.equipamentoCodigo,
          nsr: bruta.nsr,
          codigoExterno: bruta.codigoExterno,
          classificacao,
          dataReferenciaCivil: resolucaoDataReferencia.dataReferenciaCivil,
          dataReferenciaOperacionalAjustada:
            resolucaoDataReferencia.ajustadaParaDiaAnterior,
          motivoAjusteDataReferencia: resolucaoDataReferencia.motivo,
        },
      },
    });

    if (deveNormalizarMarcacoesSemIntervalo) {
      await normalizarMarcacoesSemIntervaloService(tx, [
        ...marcacoesImportadasDoDia,
        novaMarcacao,
      ]);
    }

    await tx.marcacaoBruta.update({
      where: {
        id: bruta.id,
      },
      data: {
        processada: true,
        processadaEm: new Date(),
        servidorId: servidor.id,
        marcacaoId: novaMarcacao.id,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: params.usuarioIdAuditoria ?? null,
        entidade: "MarcacaoBruta",
        entidadeId: bruta.id,
        acao: "MARCACAO_BRUTA_PROCESSADA",
        dadosDepois: {
          servidorId: servidor.id,
          marcacaoId: novaMarcacao.id,
          dataHora: bruta.dataHora,
          origem: bruta.origem,
          tipo: novaMarcacao.tipo,
          dataReferencia,
          dataReferenciaCivil: resolucaoDataReferencia.dataReferenciaCivil,
          dataReferenciaOperacionalAjustada:
            resolucaoDataReferencia.ajustadaParaDiaAnterior,
          motivoAjusteDataReferencia: resolucaoDataReferencia.motivo,
        },
      },
    });

    return novaMarcacao;
  });

  const recalculo =
    params.recalcularImpactos === false
      ? null
      : await recalcularDiaEBancoHorasServidorService({
          servidorId: servidor.id,
          dataReferencia,
          usuarioIdAuditoria: params.usuarioIdAuditoria,
          origem: "RECALCULO_APOS_PROCESSAMENTO_MARCACAO_BRUTA",
        });

  return {
    sucesso: true,
    mensagem: "Marcação bruta processada com sucesso.",
    marcacaoId: marcacao.id,
    servidorId: servidor.id,
    dataReferencia,
    bancoHoras: recalculo?.bancoHoras ?? null,
  };
}
