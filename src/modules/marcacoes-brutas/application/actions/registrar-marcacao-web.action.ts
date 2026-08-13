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
  comprovante?: {
    tipo: string;
    horario: string;
    origem: string;
    protocolo: string;
    nsr: string;
    hash: string;
  } | null;
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
    return { erro: "Sessao expirada. Faca login novamente." };
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("marcacoes:registrar-web:proprio")) {
    return {
      erro: "Voce nao possui permissao para registrar marcacao via web.",
    };
  }

  const senhaAssinatura = String(formData.get("senhaAssinatura") ?? "");
  const assinatura = senhaAssinatura
    ? await validarAssinaturaDocumento({
        session,
        senha: senhaAssinatura,
      }).catch((error: unknown) => {
        if (error instanceof Error) {
          return { erro: error.message } as const;
        }

        return { erro: "Nao foi possivel validar a assinatura." } as const;
      })
    : {
        usuarioId: session.user.id,
        matricula: session.user.matricula,
        nome: session.user.name ?? session.user.nome ?? session.user.matricula,
        assinadoEm: new Date(),
      };

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
    return { erro: "Servidor ativo nao localizado para o usuario atual." };
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
  const codigoExterno = crypto.randomUUID();

  const resultado = await criarMarcacaoBrutaService({
    matricula: servidor.matricula,
    cpf: servidor.cpf ?? null,
    dataHora: capturadoEm,
    origem: "WEB_AUTORIZADO",
    equipamentoCodigo: "SISTEMA_WEB",
    codigoExterno,
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
        capturadoEm: capturadoEm.toISOString(),
      },
      assinatura: {
        usuarioId: assinatura.usuarioId,
        matricula: assinatura.matricula,
        nome: assinatura.nome,
        assinadoEm: assinatura.assinadoEm.toISOString(),
        modo: senhaAssinatura ? "SENHA" : "TOQUE_UNICO_PERMISSAO_WEB",
      },
    },
  });

  const processamento = await processarMarcacaoBrutaService({
    marcacaoBrutaId: resultado.marcacaoBruta.id,
    usuarioIdAuditoria: session.user.id,
  });
  const marcacao = processamento.marcacaoId
    ? await prisma.marcacao.findUnique({
        where: { id: processamento.marcacaoId },
        select: { tipo: true, dataHora: true },
      })
    : null;

  revalidatePath("/marcacoes");
  revalidatePath("/marcacoes/registrar");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");

  return {
    sucesso: "Ponto registrado com sucesso.",
    marcacaoId: processamento.marcacaoId ?? null,
    comprovante: {
      tipo: marcacao?.tipo ?? "WEB",
      horario: (marcacao?.dataHora ?? capturadoEm).toISOString(),
      origem: "Web",
      protocolo: `PF-${codigoExterno.replaceAll("-", "").slice(0, 6).toUpperCase()}`,
      nsr:
        resultado.marcacaoBruta.nsr ??
        String(Number(capturadoEm) % 1_000_000).padStart(6, "0"),
      hash: resultado.marcacaoBruta.hashRegistro.slice(0, 8).toUpperCase(),
    },
  };
}
