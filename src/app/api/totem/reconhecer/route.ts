import crypto from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { salvarEvidenciaFacialMarcacao } from "@/modules/biometria/application/services/evidencia-facial-marcacao.service";
import { BIOMETRIA_FACIAL_THRESHOLDS } from "@/modules/biometria/application/services/biometria-facial-config";
import {
  calcularDistanciaCosseno,
  calcularSimilaridadeCosseno,
  normalizarVetor,
} from "@/modules/biometria/application/services/comparar-template-facial.service";
import { hashTemplateFacial } from "@/modules/biometria/infrastructure/services/biometria-facial-crypto.service";
import { descriptografarTemplateFacial } from "@/modules/biometria/infrastructure/services/biometria-facial-crypto.service";
import { criarMarcacaoBrutaService } from "@/modules/marcacoes-brutas/application/services/criar-marcacao-bruta.service";
import { processarMarcacaoBrutaService } from "@/modules/marcacoes-brutas/application/services/processar-marcacao-bruta.service";
import { PERMISSOES_TOTEM_REGISTRO } from "@/modules/totem/application/totem-permissoes";
import { reconhecerCandidatoTotemSeguro } from "@/modules/totem/application/totem-reconhecimento-facial.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

const JANELA_ANTIDUPLICIDADE_MS = 10 * 60 * 1000;

type PayloadTotem = {
  template?: unknown;
  qualidade?: unknown;
  imagem?: unknown;
  metadados?: unknown;
};

function primeiroValorCabecalho(valor: string | null) {
  return valor?.split(",")[0]?.trim() || null;
}

function normalizarIp(valor: string | null) {
  return valor?.replace(/^::ffff:/, "").trim() || null;
}

function numeroMetadado(
  metadados: unknown,
  chave: "yaw" | "pitch" | "roll" | "facesNoFrame",
) {
  if (!metadados || typeof metadados !== "object" || Array.isArray(metadados)) {
    return null;
  }

  const valor = (metadados as Record<string, unknown>)[chave];
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

function templateCadastrado(biometria: {
  template: unknown;
  templateCriptografado: string | null;
  templateIv: string | null;
  templateTag: string | null;
}) {
  if (
    biometria.templateCriptografado &&
    biometria.templateIv &&
    biometria.templateTag
  ) {
    return descriptografarTemplateFacial({
      conteudo: biometria.templateCriptografado,
      iv: biometria.templateIv,
      tag: biometria.templateTag,
    });
  }

  return biometria.template as number[];
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];
  const autorizado = usuarioPossuiAlgumaPermissaoNoPerfil(
    session.user.perfilAtivo?.codigo,
    permissoes,
    PERMISSOES_TOTEM_REGISTRO,
  );

  if (!autorizado) {
    return NextResponse.json(
      { erro: "Voce nao possui permissao para operar o Totem." },
      { status: 403 },
    );
  }

  const payload = (await request.json()) as PayloadTotem;
  const templateRaw = Array.isArray(payload.template) ? payload.template : [];
  const template = templateRaw.filter(
    (valor): valor is number =>
      typeof valor === "number" && Number.isFinite(valor),
  );
  const qualidade = Number(payload.qualidade ?? 0);

  if (template.length < BIOMETRIA_FACIAL_THRESHOLDS.minTemplateDimensao) {
    return NextResponse.json(
      { reconhecido: false, mensagem: "Template facial incompleto." },
      { status: 400 },
    );
  }

  const orgaoIdsPerfil =
    session.user.perfilAtivo?.orgaos?.map((orgao) => orgao.id) ?? [];
  const escopoGlobal =
    session.user.perfilAtivo?.escopoGlobal ||
    permissoes.includes("marcacoes:registrar-totem:global") ||
    permissoes.includes("marcacoes:gerenciar:global") ||
    permissoes.includes("biometriafacial:visualizar:global");

  const biometrias = await prisma.biometriaFacialServidor.findMany({
    where: {
      status: "ATIVO",
      servidor: {
        ativo: true,
        ...(escopoGlobal || orgaoIdsPerfil.length === 0
          ? {}
          : { orgaoId: { in: orgaoIdsPerfil } }),
      },
    },
    include: {
      servidor: {
        include: {
          usuario: true,
          orgao: true,
        },
      },
    },
    take: 1500,
  });

  const templateNormalizado = normalizarVetor(template);
  const candidatos: Array<{
    biometria: (typeof biometrias)[number];
    distancia: number;
    similaridade: number;
  }> = [];

  for (const biometria of biometrias) {
    try {
      const cadastrado = templateCadastrado(biometria);
      const distancia = calcularDistanciaCosseno(
        cadastrado,
        templateNormalizado,
      );
      const similaridade = calcularSimilaridadeCosseno(
        cadastrado,
        templateNormalizado,
      );

      candidatos.push({ biometria, distancia, similaridade });
    } catch {
      continue;
    }
  }

  const candidatosOrdenados = [...candidatos].sort(
    (a, b) => a.distancia - b.distancia,
  );
  const limiar =
    candidatosOrdenados[0]?.biometria.limiarDistancia ??
    BIOMETRIA_FACIAL_THRESHOLDS.limiarDistanciaCosseno;
  const reconhecimento = reconhecerCandidatoTotemSeguro({
    candidatos,
    qualidade,
    yaw: numeroMetadado(payload.metadados, "yaw"),
    pitch: numeroMetadado(payload.metadados, "pitch"),
    roll: numeroMetadado(payload.metadados, "roll"),
    limiarDistanciaCadastro: limiar,
  });

  if (!reconhecimento.seguro) {
    return NextResponse.json({
      reconhecido: false,
      mensagem: reconhecimento.motivo,
      distancia: reconhecimento.melhor?.distancia,
      similaridade: reconhecimento.melhor?.similaridade,
      segundoMelhor: reconhecimento.segundo
        ? {
            distancia: reconhecimento.segundo.distancia,
            similaridade: reconhecimento.segundo.similaridade,
          }
        : null,
    });
  }

  const melhor = reconhecimento.melhor;
  const servidor = melhor.biometria.servidor;
  const agora = new Date();
  const limiteDuplicidade = new Date(
    agora.getTime() - JANELA_ANTIDUPLICIDADE_MS,
  );
  const marcacaoRecente = await prisma.marcacao.findFirst({
    where: {
      servidorId: servidor.id,
      dataHora: { gte: limiteDuplicidade },
      status: { not: "CANCELADA" },
    },
    orderBy: { dataHora: "desc" },
  });

  if (marcacaoRecente) {
    return NextResponse.json({
      reconhecido: true,
      duplicado: true,
      registradoAnteriormenteEm: marcacaoRecente.dataHora.toISOString(),
      servidor: {
        id: servidor.id,
        nome: servidor.usuario.nome,
        matricula: servidor.matricula,
        orgao: servidor.orgao.sigla,
      },
      mensagem: "Registro ja realizado anteriormente.",
      distancia: melhor.distancia,
      similaridade: melhor.similaridade,
    });
  }

  const requestHeaders = await headers();
  const ipOrigem = normalizarIp(
    primeiroValorCabecalho(requestHeaders.get("x-forwarded-for")) ??
      requestHeaders.get("x-real-ip") ??
      requestHeaders.get("cf-connecting-ip"),
  );
  const userAgent = requestHeaders.get("user-agent");
  const amostra = await prisma.amostraBiometricaFacial.create({
    data: {
      biometriaId: melhor.biometria.id,
      servidorId: servidor.id,
      tipo: "VALIDACAO",
      templateHash: hashTemplateFacial(templateNormalizado),
      qualidade,
      distancia: melhor.distancia,
      similaridade: melhor.similaridade,
      validada: true,
      criadoPorUsuarioId: session.user.id,
      metadados: {
        origem: "TOTEM_FACIAL_SECP",
        operadorUsuarioId: session.user.id,
        metadadosCliente: payload.metadados ?? null,
        politicaReconhecimento: {
          limiarDistanciaAplicado: limiar,
          facesNoFrame: numeroMetadado(payload.metadados, "facesNoFrame"),
        },
        segundoMelhor: reconhecimento.segundo
          ? {
              servidorId: reconhecimento.segundo.biometria.servidorId,
              distancia: reconhecimento.segundo.distancia,
              similaridade: reconhecimento.segundo.similaridade,
            }
          : null,
      },
    },
  });

  const resultadoBruta = await criarMarcacaoBrutaService({
    servidorId: servidor.id,
    matricula: servidor.matricula,
    cpf: servidor.cpf,
    dataHora: agora,
    origem: "TOTEM_FACIAL_SECP",
    equipamentoCodigo: "TOTEM_FACIAL_SECP",
    codigoExterno: crypto.randomUUID(),
    payloadOriginal: {
      origem: "TOTEM_FACIAL_SECP",
      operadorUsuarioId: session.user.id,
      servidorId: servidor.id,
      ip: ipOrigem,
      userAgent,
      qualidade,
      distancia: melhor.distancia,
      similaridade: melhor.similaridade,
      segundoMelhor: reconhecimento.segundo
        ? {
            servidorId: reconhecimento.segundo.biometria.servidorId,
            distancia: reconhecimento.segundo.distancia,
            similaridade: reconhecimento.segundo.similaridade,
          }
        : null,
    },
  });

  const processamento = await processarMarcacaoBrutaService({
    marcacaoBrutaId: resultadoBruta.marcacaoBruta.id,
    usuarioIdAuditoria: session.user.id,
  });

  if (!processamento.sucesso || !processamento.marcacaoId) {
    return NextResponse.json(
      {
        reconhecido: true,
        erro:
          processamento.mensagem ??
          "Servidor reconhecido, mas nao foi possivel registrar a marcacao.",
      },
      { status: 422 },
    );
  }

  await prisma.$transaction(async (tx) => {
    const marcacao = await tx.marcacao.findUnique({
      where: { id: processamento.marcacaoId! },
      select: { metadados: true },
    });
    const metadadosAtuais =
      marcacao?.metadados &&
      typeof marcacao.metadados === "object" &&
      !Array.isArray(marcacao.metadados)
        ? (marcacao.metadados as Record<string, unknown>)
        : {};

    await tx.marcacao.update({
      where: { id: processamento.marcacaoId! },
      data: {
        metadados: {
          ...metadadosAtuais,
          origemRegistro: "TOTEM_FACIAL_SECP",
          operadorTotemUsuarioId: session.user.id,
          registradoNoTotemEm: agora.toISOString(),
          qualidadeFacial: qualidade,
          distanciaFacial: melhor.distancia,
          similaridadeFacial: melhor.similaridade,
        },
      },
    });

    await salvarEvidenciaFacialMarcacao({
      tx,
      marcacaoId: processamento.marcacaoId!,
      imagemDataUrl: typeof payload.imagem === "string" ? payload.imagem : "",
      amostraBiometricaId: amostra.id,
      qualidade,
      similaridade: melhor.similaridade,
      distancia: melhor.distancia,
      metadados: {
        origem: "TOTEM_FACIAL_SECP",
        operadorUsuarioId: session.user.id,
        ip: ipOrigem,
        userAgent,
        registradoEm: agora.toISOString(),
        segundoMelhor: reconhecimento.segundo
          ? {
              servidorId: reconhecimento.segundo.biometria.servidorId,
              distancia: reconhecimento.segundo.distancia,
              similaridade: reconhecimento.segundo.similaridade,
            }
          : null,
      },
    });
  });

  return NextResponse.json({
    reconhecido: true,
    duplicado: false,
    marcacaoId: processamento.marcacaoId,
    servidor: {
      id: servidor.id,
      nome: servidor.usuario.nome,
      matricula: servidor.matricula,
      orgao: servidor.orgao.sigla,
    },
    dataHora: agora.toISOString(),
    distancia: melhor.distancia,
    similaridade: melhor.similaridade,
    mensagem: "Marcacao registrada pelo Totem.",
  });
}
