import { prisma } from "@/shared/infrastructure/database/prisma";
import { obterDataReferencia } from "@/modules/marcacoes/application/services/data-marcacao.service";
import { classificarProximaMarcacao } from "@/modules/marcacoes/application/services/classificar-marcacao.service";
import { recalcularDiaServidorService } from "@/modules/recalculo/application/services/recalcular-dia-servidor.service";
import {
  PeriodoHomologadoError,
  verificarPeriodoHomologado,
} from "@/modules/boletim-frequencia/application/services/bloquear-periodo-homologado.service";

export const runtime = "nodejs";

type PayloadWebhookEquipamento = {
  equipamentoCodigo?: string;
  tipoEvento?: "MARCACAO" | "HEARTBEAT" | "SINCRONIZACAO" | "ERRO";
  codigoEventoExterno?: string;
  nsr?: string;
  matricula?: string;
  dataHora?: string;
  payload?: unknown;
};

function validarToken(request: Request) {
  const tokenEsperado = process.env.SECP_EQUIPAMENTO_WEBHOOK_TOKEN;

  if (!tokenEsperado) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  const tokenHeader = request.headers.get("x-secp-webhook-token");

  const tokenRecebido = authorization?.startsWith("Bearer ")
    ? authorization.replace("Bearer ", "").trim()
    : tokenHeader;

  return tokenRecebido === tokenEsperado;
}

export async function POST(request: Request) {
  if (!validarToken(request)) {
    return Response.json(
      {
        sucesso: false,
        mensagem: "Token inválido.",
      },
      {
        status: 401,
      },
    );
  }

  const body = (await request.json()) as PayloadWebhookEquipamento;

  if (!body.equipamentoCodigo) {
    return Response.json(
      {
        sucesso: false,
        mensagem: "Código do equipamento não informado.",
      },
      {
        status: 400,
      },
    );
  }

  const equipamento = await prisma.equipamentoBiometrico.findUnique({
    where: {
      codigo: body.equipamentoCodigo,
    },
  });

  if (!equipamento || !equipamento.ativo) {
    return Response.json(
      {
        sucesso: false,
        mensagem: "Equipamento não cadastrado ou inativo.",
      },
      {
        status: 404,
      },
    );
  }

  if (body.tipoEvento === "HEARTBEAT") {
    await prisma.$transaction(async (tx) => {
      await tx.equipamentoBiometrico.update({
        where: {
          id: equipamento.id,
        },
        data: {
          ultimoHeartbeatEm: new Date(),
        },
      });

      await tx.eventoEquipamentoBiometrico.create({
        data: {
          equipamentoId: equipamento.id,
          tipoEvento: "HEARTBEAT",
          codigoEventoExterno: body.codigoEventoExterno ?? null,
          nsr: body.nsr ?? null,
          processado: true,
          processadoEm: new Date(),
          payload: body as never,
        },
      });
    });

    return Response.json({
      sucesso: true,
      mensagem: "Heartbeat recebido.",
    });
  }

  if (!body.matricula || !body.dataHora) {
    const evento = await prisma.eventoEquipamentoBiometrico.create({
      data: {
        equipamentoId: equipamento.id,
        tipoEvento: body.tipoEvento ?? "ERRO",
        codigoEventoExterno: body.codigoEventoExterno ?? null,
        nsr: body.nsr ?? null,
        matricula: body.matricula ?? null,
        payload: body as never,
        erro: "Matrícula ou dataHora não informada.",
      },
    });

    return Response.json(
      {
        sucesso: false,
        mensagem: "Matrícula ou dataHora não informada.",
        eventoId: evento.id,
      },
      {
        status: 400,
      },
    );
  }

  const dataHora = new Date(body.dataHora);

  if (Number.isNaN(dataHora.getTime())) {
    return Response.json(
      {
        sucesso: false,
        mensagem: "dataHora inválida.",
      },
      {
        status: 400,
      },
    );
  }

  const servidor = await prisma.servidor.findFirst({
    where: {
      matricula: body.matricula,
      ativo: true,
      usuario: {
        ativo: true,
      },
    },
    include: {
      usuario: true,
    },
  });

  const evento = await prisma.eventoEquipamentoBiometrico.create({
    data: {
      equipamentoId: equipamento.id,
      tipoEvento: "MARCACAO",
      codigoEventoExterno: body.codigoEventoExterno ?? null,
      nsr: body.nsr ?? null,
      matricula: body.matricula,
      dataHora,
      payload: body as never,
    },
  });

  if (!servidor) {
    await prisma.eventoEquipamentoBiometrico.update({
      where: {
        id: evento.id,
      },
      data: {
        erro: "Servidor não encontrado para a matrícula informada.",
      },
    });

    return Response.json(
      {
        sucesso: false,
        mensagem: "Servidor não encontrado para a matrícula informada.",
        eventoId: evento.id,
      },
      {
        status: 404,
      },
    );
  }

  const dataReferencia = obterDataReferencia(dataHora);

  try {
    await verificarPeriodoHomologado({
      servidorId: servidor.id,
      dataReferencia,
    });
  } catch (error) {
    if (error instanceof PeriodoHomologadoError) {
      await prisma.eventoEquipamentoBiometrico.update({
        where: {
          id: evento.id,
        },
        data: {
          erro: error.message,
        },
      });

      return Response.json(
        {
          sucesso: false,
          mensagem:
            "Período já homologado. Evento biométrico registrado, mas não convertido em marcação.",
          eventoId: evento.id,
        },
        {
          status: 409,
        },
      );
    }

    throw error;
  }

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
    await prisma.eventoEquipamentoBiometrico.update({
      where: {
        id: evento.id,
      },
      data: {
        erro: "Servidor sem jornada vigente para a data.",
      },
    });

    return Response.json(
      {
        sucesso: false,
        mensagem: "Servidor sem jornada vigente para a data.",
        eventoId: evento.id,
      },
      {
        status: 422,
      },
    );
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

  let classificacao;

  try {
    classificacao = classificarProximaMarcacao({
      marcacoesDoDia,
      exigeIntervalo: jornadaServidor.jornada.exigeIntervalo,
    });
  } catch (error) {
    const mensagem =
      error instanceof Error
        ? error.message
        : "Não foi possível classificar a marcação.";

    await prisma.eventoEquipamentoBiometrico.update({
      where: {
        id: evento.id,
      },
      data: {
        erro: mensagem,
      },
    });

    return Response.json(
      {
        sucesso: false,
        mensagem,
        eventoId: evento.id,
      },
      {
        status: 422,
      },
    );
  }

  const marcacao = await prisma.$transaction(async (tx) => {
    const novaMarcacao = await tx.marcacao.create({
      data: {
        servidorId: servidor.id,
        jornadaServidorId: jornadaServidor.id,
        dataHora,
        dataReferencia,
        tipo: classificacao.tipo,
        fonte: "EQUIPAMENTO_BIOMETRICO",
        status: "VALIDA",
        observacao: `Marcação recebida do equipamento biométrico ${equipamento.codigo}.`,
        metadados: {
          equipamentoId: equipamento.id,
          equipamentoCodigo: equipamento.codigo,
          eventoId: evento.id,
          codigoEventoExterno: body.codigoEventoExterno ?? null,
          nsr: body.nsr ?? null,
          classificacao,
        },
      },
    });

    await tx.eventoEquipamentoBiometrico.update({
      where: {
        id: evento.id,
      },
      data: {
        marcacaoId: novaMarcacao.id,
        processado: true,
        processadoEm: new Date(),
      },
    });

    await tx.logIntegracao.create({
      data: {
        integracaoId: equipamento.integracaoId,
        tipo: "EQUIPAMENTO_BIOMETRICO",
        direcao: "ENTRADA",
        status: "SUCESSO",
        entidade: "Marcacao",
        entidadeId: novaMarcacao.id,
        mensagem: "Evento biométrico convertido em marcação.",
        payloadEntrada: body as never,
        payloadSaida: {
          marcacaoId: novaMarcacao.id,
          tipo: novaMarcacao.tipo,
          servidorId: servidor.id,
        },
        finalizadoEm: new Date(),
      },
    });

    return novaMarcacao;
  });

  await recalcularDiaServidorService({
    servidorId: servidor.id,
    dataReferencia,
    origem: "RECALCULO_APOS_WEBHOOK_BIOMETRICO",
  });

  return Response.json({
    sucesso: true,
    mensagem: "Marcação biométrica registrada com sucesso.",
    eventoId: evento.id,
    marcacaoId: marcacao.id,
    tipo: marcacao.tipo,
  });
}
