import { prisma } from "@/shared/infrastructure/database/prisma";
import { criarMarcacaoBrutaService } from "@/modules/marcacoes-brutas/application/services/criar-marcacao-bruta.service";
import { processarMarcacaoBrutaService } from "@/modules/marcacoes-brutas/application/services/processar-marcacao-bruta.service";

export const runtime = "nodejs";

type PayloadWebhookEquipamento = {
  equipamentoCodigo?: string;
  tipoEvento?: "MARCACAO" | "HEARTBEAT" | "SINCRONIZACAO" | "ERRO";
  codigoEventoExterno?: string;
  nsr?: string;
  cpf?: string;
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
          codigoEventoExterno: body.codigoEventoExterno || null,
          nsr: body.nsr || null,
          processado: true,
          processadoEm: new Date(),
          payload: body as never,
        },
      });

      await tx.logIntegracao.create({
        data: {
          integracaoId: equipamento.integracaoId,
          tipo: "EQUIPAMENTO_BIOMETRICO",
          direcao: "ENTRADA",
          status: "SUCESSO",
          entidade: "EquipamentoBiometrico",
          entidadeId: equipamento.id,
          mensagem: "Heartbeat recebido do equipamento biométrico.",
          payloadEntrada: body as never,
          finalizadoEm: new Date(),
        },
      });
    });

    return Response.json({
      sucesso: true,
      mensagem: "Heartbeat recebido.",
    });
  }

  if (!body.cpf && !body.matricula) {
    return Response.json(
      {
        sucesso: false,
        mensagem: "Informe CPF ou matrícula para registrar a marcação bruta.",
      },
      {
        status: 400,
      },
    );
  }

  if (!body.dataHora) {
    return Response.json(
      {
        sucesso: false,
        mensagem: "Data/hora da marcação não informada.",
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
        mensagem: "Data/hora da marcação inválida.",
      },
      {
        status: 400,
      },
    );
  }

  const eventoEquipamento = await prisma.eventoEquipamentoBiometrico.create({
    data: {
      equipamentoId: equipamento.id,
      tipoEvento: "MARCACAO",
      codigoEventoExterno: body.codigoEventoExterno || null,
      nsr: body.nsr || null,
      matricula: body.matricula || null,
      dataHora,
      payload: body as never,
    },
  });

  const resultadoBruta = await criarMarcacaoBrutaService({
    cpf: body.cpf || null,
    matricula: body.matricula || null,
    dataHora,
    equipamentoCodigo: equipamento.codigo,
    equipamentoId: equipamento.id,
    origem: "EQUIPAMENTO_BIOMETRICO",
    nsr: body.nsr || null,
    codigoExterno: body.codigoEventoExterno || null,
    payloadOriginal: {
      ...body,
      eventoEquipamentoId: eventoEquipamento.id,
    },
  });

  const processamento = await processarMarcacaoBrutaService({
    marcacaoBrutaId: resultadoBruta.marcacaoBruta.id,
  });

  await prisma.$transaction(async (tx) => {
    await tx.eventoEquipamentoBiometrico.update({
      where: {
        id: eventoEquipamento.id,
      },
      data: {
        processado: processamento.sucesso,
        processadoEm: processamento.sucesso ? new Date() : null,
        marcacaoId: processamento.marcacaoId ?? null,
        erro: processamento.sucesso ? null : processamento.mensagem,
      },
    });

    await tx.logIntegracao.create({
      data: {
        integracaoId: equipamento.integracaoId,
        tipo: "EQUIPAMENTO_BIOMETRICO",
        direcao: "ENTRADA",
        status: processamento.sucesso ? "SUCESSO" : "PENDENTE",
        entidade: "MarcacaoBruta",
        entidadeId: resultadoBruta.marcacaoBruta.id,
        mensagem: processamento.mensagem,
        payloadEntrada: body as never,
        payloadSaida: {
          criada: resultadoBruta.criada,
          marcacaoBrutaId: resultadoBruta.marcacaoBruta.id,
          marcacaoId: processamento.marcacaoId ?? null,
          processada: processamento.sucesso,
        },
        finalizadoEm: new Date(),
      },
    });
  });

  return Response.json({
    sucesso: true,
    mensagem: resultadoBruta.criada
      ? "Marcação bruta recebida."
      : "Marcação bruta já existente. Duplicidade ignorada.",
    criada: resultadoBruta.criada,
    processada: processamento.sucesso,
    detalheProcessamento: processamento.mensagem,
    marcacaoBrutaId: resultadoBruta.marcacaoBruta.id,
    marcacaoId: processamento.marcacaoId ?? null,
  });
}
