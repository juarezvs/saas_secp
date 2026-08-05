"use server";

import crypto from "node:crypto";
import { reverse } from "node:dns/promises";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  consumirAutorizacaoBiometricaMarcacao,
  validarAutorizacaoBiometricaMarcacao,
} from "@/modules/biometria/application/services/autorizacao-biometrica-marcacao.service";
import { criarMarcacaoBrutaService } from "../services/criar-marcacao-bruta.service";
import { processarMarcacaoBrutaService } from "../services/processar-marcacao-bruta.service";

export type RegistrarMarcacaoFacialActionState = {
  erro?: string | null;
  sucesso?: string | null;
  marcacaoId?: string | null;
  tipo?: string | null;
  dataHora?: string | null;
  fusoHorario?: string | null;
  servidorNome?: string | null;
};

function primeiroValorCabecalho(valor: string | null) {
  return valor?.split(",")[0]?.trim() || null;
}

function normalizarIp(valor: string | null) {
  if (!valor) {
    return null;
  }

  return valor.replace(/^::ffff:/, "").trim() || null;
}

async function resolverNomeMaquinaPorIp(ip: string | null) {
  if (!ip) {
    return null;
  }

  try {
    const nomes = await reverse(ip);
    return nomes[0] ?? null;
  } catch {
    return null;
  }
}

export async function registrarMarcacaoFacialAutorizadaAction(
  _state: RegistrarMarcacaoFacialActionState,
  formData: FormData,
): Promise<RegistrarMarcacaoFacialActionState> {
  const session = await auth();

  if (!session?.user) {
    return { erro: "Sessão expirada. Faça login novamente." };
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("marcacoes:registrar-facial:proprio")) {
    return {
      erro: "Você não possui permissão para registrar marcação facial.",
    };
  }

  const servidor = await prisma.servidor.findFirst({
    where: {
      usuarioId: session.user.id,
      ativo: true,
    },
    include: {
      usuario: true,
    },
  });

  if (!servidor) {
    return { erro: "Servidor ativo não localizado para o usuário atual." };
  }

  const autorizacaoBiometricaId = String(
    formData.get("autorizacaoBiometricaId") ?? "",
  );

  const autorizacaoBiometricaToken = String(
    formData.get("autorizacaoBiometricaToken") ?? "",
  );

  const validacao = await validarAutorizacaoBiometricaMarcacao({
    servidorId: servidor.id,
    autorizacaoId: autorizacaoBiometricaId,
    token: autorizacaoBiometricaToken,
  });

  if (!validacao.valida) {
    return { erro: "Autorização biométrica inválida ou expirada." };
  }

  const requestHeaders = await headers();
  const ipOrigem = normalizarIp(
    primeiroValorCabecalho(requestHeaders.get("x-forwarded-for")) ??
      requestHeaders.get("x-real-ip") ??
      requestHeaders.get("cf-connecting-ip"),
  );
  const nomeMaquina = await resolverNomeMaquinaPorIp(ipOrigem);
  const userAgent = requestHeaders.get("user-agent");
  const capturadoEm = new Date();

  const resultadoBruta = await criarMarcacaoBrutaService({
    matricula: servidor.matricula,
    cpf: servidor.cpf ?? null,
    dataHora: capturadoEm,
    origem: "FACIAL_AUTORIZADO",
    equipamentoCodigo: "SISTEMA_WEB_FACIAL",
    codigoExterno: crypto.randomUUID(),
    payloadOriginal: {
      usuarioId: session.user.id,
      autorizacaoBiometricaId,
      origem: "FACIAL_AUTORIZADO",
      equipamentoOrigem: {
        tipo: "SISTEMA_WEB_FACIAL",
        codigo: "SISTEMA_WEB_FACIAL",
        nome: "Sistema Web SECP - reconhecimento facial",
        ip: ipOrigem,
        nomeMaquina,
        userAgent,
        capturadoEm: capturadoEm.toISOString(),
      },
    },
  });

  const processamento = await processarMarcacaoBrutaService({
    marcacaoBrutaId: resultadoBruta.marcacaoBruta.id,
    usuarioIdAuditoria: session.user.id,
  });

  if (processamento.sucesso && processamento.marcacaoId) {
    await prisma.$transaction(async (tx) => {
      await consumirAutorizacaoBiometricaMarcacao({
        tx,
        autorizacaoId: autorizacaoBiometricaId,
        marcacaoId: processamento.marcacaoId!,
      });
    });
  } else {
    return {
      erro:
        processamento.mensagem ??
        "Não foi possível registrar a marcação facial.",
    };
  }

  revalidatePath("/marcacoes");
  revalidatePath("/marcacoes/registrar");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");

  const marcacao = await prisma.marcacao.findUnique({
    where: { id: processamento.marcacaoId },
    select: {
      id: true,
      tipo: true,
      dataHora: true,
      fusoHorario: true,
    },
  });

  return {
    sucesso: "Marcação registrada com sucesso.",
    marcacaoId: processamento.marcacaoId,
    tipo: marcacao?.tipo ?? null,
    dataHora: marcacao?.dataHora.toISOString() ?? null,
    fusoHorario: marcacao?.fusoHorario ?? null,
    servidorNome: servidor.usuario.nome,
  };
}
