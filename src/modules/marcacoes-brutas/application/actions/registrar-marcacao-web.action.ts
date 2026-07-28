"use server";

import crypto from "node:crypto";
import { reverse } from "node:dns/promises";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { validarAssinaturaDocumento } from "@/modules/documentos-autenticacao/application/services/validar-assinatura-documento.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { criarMarcacaoBrutaService } from "../services/criar-marcacao-bruta.service";
import { processarMarcacaoBrutaService } from "../services/processar-marcacao-bruta.service";

type RegistrarMarcacaoWebActionState = {
  erro?: string | null;
  sucesso?: string | null;
  marcacaoId?: string | null;
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

export async function registrarMarcacaoWebAutorizadaAction(
  _state: RegistrarMarcacaoWebActionState,
  formData: FormData,
): Promise<RegistrarMarcacaoWebActionState> {
  const session = await auth();

  if (!session?.user) {
    return { erro: "Sessão expirada. Faça login novamente." };
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("marcacoes:registrar-web:proprio")) {
    return {
      erro: "Você não possui permissão para registrar marcação via web.",
    };
  }

  const senhaAssinatura = String(formData.get("senhaAssinatura") ?? "");
  const assinatura = await validarAssinaturaDocumento({
    session,
    senha: senhaAssinatura,
  }).catch((error: unknown) => {
    if (error instanceof Error) {
      return { erro: error.message } as const;
    }

    return { erro: "Não foi possível validar a assinatura." } as const;
  });

  if ("erro" in assinatura) {
    return { erro: assinatura.erro };
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

  const requestHeaders = await headers();
  const ipOrigem = normalizarIp(
    primeiroValorCabecalho(requestHeaders.get("x-forwarded-for")) ??
      requestHeaders.get("x-real-ip") ??
      requestHeaders.get("cf-connecting-ip"),
  );
  const nomeMaquina = await resolverNomeMaquinaPorIp(ipOrigem);
  const userAgent = requestHeaders.get("user-agent");

  const resultado = await criarMarcacaoBrutaService({
    matricula: servidor.matricula,
    cpf: servidor.cpf ?? null,
    dataHora: new Date(),
    origem: "WEB_AUTORIZADO",
    equipamentoCodigo: "SISTEMA_WEB",
    codigoExterno: crypto.randomUUID(),
    payloadOriginal: {
      usuarioId: session.user.id,
      origem: "WEB_AUTORIZADO",
      equipamentoOrigem: {
        tipo: "SISTEMA_WEB",
        codigo: "SISTEMA_WEB",
        nome: "Sistema Web SECP",
        ip: ipOrigem,
        nomeMaquina,
        userAgent,
        capturadoEm: new Date().toISOString(),
      },
      assinatura: {
        usuarioId: assinatura.usuarioId,
        matricula: assinatura.matricula,
        nome: assinatura.nome,
        assinadoEm: assinatura.assinadoEm.toISOString(),
      },
    },
  });

  const processamento = await processarMarcacaoBrutaService({
    marcacaoBrutaId: resultado.marcacaoBruta.id,
    usuarioIdAuditoria: session.user.id,
  });

  revalidatePath("/marcacoes");
  revalidatePath("/marcacoes/registrar");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");

  return {
    sucesso: "Marcação assinada e registrada com sucesso.",
    marcacaoId: processamento.marcacaoId ?? null,
  };
}
