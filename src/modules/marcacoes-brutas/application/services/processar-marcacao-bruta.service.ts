import { prisma } from "@/shared/infrastructure/database/prisma";
import { obterDataReferencia } from "@/modules/marcacoes/application/services/data-marcacao.service";
import { classificarProximaMarcacao } from "@/modules/marcacoes/application/services/classificar-marcacao.service";
import { recalcularDiaServidorService } from "@/modules/recalculo/application/services/recalcular-dia-servidor.service";
import { verificarPeriodoHomologado } from "@/modules/boletim-frequencia/application/services/bloquear-periodo-homologado.service";

export async function processarMarcacaoBrutaService(params: {
  marcacaoBrutaId: string;
  usuarioIdAuditoria?: string;
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

  const filtros = [];

  if (bruta.matricula) {
    filtros.push({
      matricula: bruta.matricula,
    });
  }

  if (bruta.cpf) {
    filtros.push({
      cpf: bruta.cpf,
    });
  }

  if (filtros.length === 0) {
    return {
      sucesso: false,
      mensagem: "Marcação bruta sem CPF ou matrícula. Ela ficará pendente.",
    };
  }

  const servidor = await prisma.servidor.findFirst({
    where: {
      ativo: true,
      OR: filtros,
    },
    include: {
      usuario: true,
    },
  });

  if (!servidor) {
    return {
      sucesso: false,
      mensagem:
        "Servidor ainda não cadastrado para esta marcação bruta. Ela ficará pendente.",
    };
  }

  const dataReferencia = obterDataReferencia(bruta.dataHora);

  await verificarPeriodoHomologado({
    servidorId: servidor.id,
    dataReferencia,
  });

  const jornadaServidor = await prisma.jornadaServidor.findFirst({
    where: {
      servidorId: servidor.id,
      ativo: true,
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

  const classificacao = classificarProximaMarcacao({
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
        },
      },
    });

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
        },
      },
    });

    return novaMarcacao;
  });

  await recalcularDiaServidorService({
    servidorId: servidor.id,
    dataReferencia,
    usuarioIdAuditoria: params.usuarioIdAuditoria,
    origem: "RECALCULO_APOS_PROCESSAMENTO_MARCACAO_BRUTA",
  });

  return {
    sucesso: true,
    mensagem: "Marcação bruta processada com sucesso.",
    marcacaoId: marcacao.id,
  };
}
