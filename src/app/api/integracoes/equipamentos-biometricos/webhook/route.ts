import { withHttpMetrics } from "@/lib/observability/http";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { criarMarcacaoBrutaService } from "@/modules/marcacoes-brutas/application/services/criar-marcacao-bruta.service";
import { processarMarcacaoBrutaService } from "@/modules/marcacoes-brutas/application/services/processar-marcacao-bruta.service";
import {
  equipamentoBiometricoWebhookSchema,
  type EquipamentoBiometricoWebhookInput,
} from "@/modules/integracoes/application/schemas/integracao.schema";

export const runtime = "nodejs";

type ConfiguracaoEquipamento = {
  webhookToken?: unknown;
  tokenWebhook?: unknown;
};

function extrairTokenRecebido(request: Request) {
  const authorization = request.headers.get("authorization");
  const tokenHeader = request.headers.get("x-secp-webhook-token");
  const tokenQuery = new URL(request.url).searchParams.get("token");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.replace("Bearer ", "").trim();
  }

  return tokenHeader?.trim() || tokenQuery?.trim() || null;
}

function extrairTokenConfigurado(configuracao: unknown) {
  if (!configuracao || typeof configuracao !== "object") {
    return null;
  }

  const dados = configuracao as ConfiguracaoEquipamento;
  const token = dados.webhookToken ?? dados.tokenWebhook;

  return typeof token === "string" && token.trim() ? token.trim() : null;
}

function validarToken(request: Request, configuracaoEquipamento: unknown) {
  const tokenRecebido = extrairTokenRecebido(request);

  if (!tokenRecebido) {
    return false;
  }

  const tokensAceitos = [
    process.env.SECP_EQUIPAMENTO_WEBHOOK_TOKEN,
    extrairTokenConfigurado(configuracaoEquipamento),
  ].filter((token): token is string => Boolean(token));

  if (tokensAceitos.length === 0) {
    return false;
  }

  return tokensAceitos.includes(tokenRecebido);
}

async function buscarEventoDuplicado(
  equipamentoId: string,
  body: EquipamentoBiometricoWebhookInput,
) {
  const filtros = [
    body.codigoEventoExterno
      ? { codigoEventoExterno: body.codigoEventoExterno }
      : null,
    body.nsr ? { nsr: body.nsr } : null,
  ].filter(
    (filtro): filtro is { codigoEventoExterno: string } | { nsr: string } =>
      Boolean(filtro),
  );

  if (filtros.length === 0) {
    return null;
  }

  return prisma.eventoEquipamentoBiometrico.findFirst({
    where: {
      equipamentoId,
      OR: filtros,
    },
    select: {
      id: true,
      processado: true,
      marcacaoId: true,
      erro: true,
    },
  });
}

async function registrarEventoOperacional(
  equipamento: {
    id: string;
    integracaoId: string | null;
  },
  body: EquipamentoBiometricoWebhookInput,
) {
  const dataHora = body.dataHora ? new Date(body.dataHora) : null;

  await prisma.$transaction(async (tx) => {
    if (body.tipoEvento === "HEARTBEAT") {
      await tx.equipamentoBiometrico.update({
        where: {
          id: equipamento.id,
        },
        data: {
          ultimoHeartbeatEm: new Date(),
        },
      });
    }

    await tx.eventoEquipamentoBiometrico.create({
      data: {
        equipamentoId: equipamento.id,
        tipoEvento: body.tipoEvento,
        codigoEventoExterno: body.codigoEventoExterno || null,
        nsr: body.nsr || null,
        matricula: body.matricula || null,
        dataHora,
        processado: true,
        processadoEm: new Date(),
        erro: body.tipoEvento === "ERRO" ? "Erro reportado pelo equipamento." : null,
        payload: body as never,
      },
    });

    await tx.logIntegracao.create({
      data: {
        integracaoId: equipamento.integracaoId,
        tipo: "EQUIPAMENTO_BIOMETRICO",
        direcao: "ENTRADA",
        status: body.tipoEvento === "ERRO" ? "ERRO" : "SUCESSO",
        entidade: "EquipamentoBiometrico",
        entidadeId: equipamento.id,
        mensagem:
          body.tipoEvento === "HEARTBEAT"
            ? "Heartbeat recebido do equipamento biometrico."
            : `Evento ${body.tipoEvento} recebido do equipamento biometrico.`,
        payloadEntrada: body as never,
        finalizadoEm: new Date(),
      },
    });
  });

  return Response.json({
    sucesso: true,
    mensagem:
      body.tipoEvento === "HEARTBEAT"
        ? "Heartbeat recebido."
        : "Evento do equipamento recebido.",
  });
}

function dataIntelbras(valor: unknown) {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return new Date(valor * 1000).toISOString();
  }

  if (typeof valor !== "string" || !valor.trim()) {
    return null;
  }

  const numero = Number(valor);

  if (Number.isFinite(numero)) {
    return new Date(numero * 1000).toISOString();
  }

  const match = valor.match(
    /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/,
  );

  if (match) {
    return new Date(
      `${match[3]}-${match[2]}-${match[1]}T${match[4]}:${match[5]}:${match[6]}`,
    ).toISOString();
  }

  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

function somenteDigitos(valor: unknown) {
  return typeof valor === "string" || typeof valor === "number"
    ? String(valor).replace(/\D/g, "")
    : "";
}

function cpfIntelbras(...valores: unknown[]) {
  for (const valor of valores) {
    const digitos = somenteDigitos(valor);

    if (digitos.length === 11) {
      return digitos;
    }
  }

  return undefined;
}

function extrairJsonMultipartIntelbras(texto: string) {
  const match = texto.match(
    /Content-Disposition:\s*form-data;\s*name="info"[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|$)/i,
  );
  const bruto = match?.[1]?.trim();

  if (!bruto) {
    return null;
  }

  try {
    return JSON.parse(bruto) as unknown;
  } catch {
    return null;
  }
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === "object"
    ? (valor as Record<string, unknown>)
    : null;
}

function normalizarPayloadIntelbras(
  payload: unknown,
  equipamentoCodigo: string | null,
): unknown {
  const raiz = objeto(payload);
  const eventos = Array.isArray(raiz?.Events) ? raiz.Events : [];
  const evento = objeto(eventos[0]);
  const dados = objeto(evento?.Data);

  if (!raiz || !evento || !dados || evento.Code !== "AccessControl") {
    return {
      equipamentoCodigo: equipamentoCodigo ?? "",
      tipoEvento: "SINCRONIZACAO",
      codigoEventoExterno:
        typeof evento?.Code === "string" ? evento.Code : undefined,
      payload,
    };
  }

  const userId = dados.UserID;
  const cardNo = dados.CardNo;
  const dataHora =
    dataIntelbras(dados.UTC) ??
    dataIntelbras(dados.CreateTime) ??
    dataIntelbras(raiz.Time);
  const codigoEventoExterno = [
    evento.PhysicalAddress,
    dados.UTC ?? dados.CreateTime,
    evento.Index,
  ]
    .filter((item) => item !== undefined && item !== null && item !== "")
    .join(":");

  return {
    equipamentoCodigo: equipamentoCodigo ?? "",
    tipoEvento: dados.Status === 1 || dados.Status === "1" ? "MARCACAO" : "ERRO",
    codigoEventoExterno: codigoEventoExterno || undefined,
    nsr: dados.RecNo ? String(dados.RecNo) : undefined,
    cpf: cpfIntelbras(userId, cardNo),
    matricula: cpfIntelbras(userId, cardNo) ? undefined : String(userId ?? ""),
    dataHora: dataHora ?? undefined,
    payload: {
      fabricante: "INTELBRAS",
      origem: "PictureHttpUpload",
      evento: payload,
    },
  };
}

async function postEquipamentosBiometricosWebhook(request: Request) {
  let payload: unknown;
  const url = new URL(request.url);
  const equipamentoCodigoQuery = url.searchParams.get("equipamentoCodigo");

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/mixed")) {
      const texto = await request.text();
      payload = normalizarPayloadIntelbras(
        extrairJsonMultipartIntelbras(texto),
        equipamentoCodigoQuery,
      );
    } else {
      payload = await request.json();

      if (
        equipamentoCodigoQuery &&
        payload &&
        typeof payload === "object" &&
        !("equipamentoCodigo" in payload)
      ) {
        payload = {
          ...(payload as Record<string, unknown>),
          equipamentoCodigo: equipamentoCodigoQuery,
        };
      }
    }
  } catch {
    return Response.json(
      {
        sucesso: false,
        mensagem: "Payload JSON invalido.",
      },
      {
        status: 400,
      },
    );
  }

  const parsed = equipamentoBiometricoWebhookSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      {
        sucesso: false,
        mensagem: "Payload do equipamento invalido.",
        erros: parsed.error.flatten().fieldErrors,
      },
      {
        status: 400,
      },
    );
  }

  const body = parsed.data;
  const equipamento = await prisma.equipamentoBiometrico.findUnique({
    where: {
      codigo: body.equipamentoCodigo,
    },
  });

  if (!equipamento || !equipamento.ativo) {
    return Response.json(
      {
        sucesso: false,
        mensagem: "Equipamento nao cadastrado ou inativo.",
      },
      {
        status: 404,
      },
    );
  }

  if (!validarToken(request, equipamento.configuracao)) {
    return Response.json(
      {
        sucesso: false,
        mensagem: "Token invalido.",
      },
      {
        status: 401,
      },
    );
  }

  const eventoDuplicado = await buscarEventoDuplicado(equipamento.id, body);

  if (eventoDuplicado) {
    return Response.json({
      sucesso: true,
      mensagem: "Evento ja recebido anteriormente. Duplicidade ignorada.",
      duplicado: true,
      eventoEquipamentoId: eventoDuplicado.id,
      processada: eventoDuplicado.processado,
      marcacaoId: eventoDuplicado.marcacaoId,
      erro: eventoDuplicado.erro,
    });
  }

  if (body.tipoEvento !== "MARCACAO") {
    return registrarEventoOperacional(equipamento, body);
  }

  const dataHora = body.dataHora ? new Date(body.dataHora) : null;

  if (!dataHora) {
    return Response.json(
      {
        sucesso: false,
        mensagem: "Data/hora da marcacao nao informada.",
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
      ? "Marcacao bruta recebida."
      : "Marcacao bruta ja existente. Duplicidade ignorada.",
    criada: resultadoBruta.criada,
    processada: processamento.sucesso,
    detalheProcessamento: processamento.mensagem,
    marcacaoBrutaId: resultadoBruta.marcacaoBruta.id,
    marcacaoId: processamento.marcacaoId ?? null,
  });
}

export const POST = withHttpMetrics(
  "/api/integracoes/equipamentos-biometricos/webhook",
  postEquipamentosBiometricosWebhook,
);
