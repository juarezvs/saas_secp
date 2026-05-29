"use server";

import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  buscarBiometriaAtivaPorServidorId,
  buscarServidorBiometriaPorUsuarioId,
} from "../../infrastructure/repositories/biometria.repository";
import {
  templateFacialSchema,
  type BiometriaFormState,
} from "../schemas/biometria.schema";
import { criarAutorizacaoBiometricaMarcacao } from "../services/autorizacao-biometrica-marcacao.service";
import {
  calcularDistanciaCosseno,
  calcularSimilaridadeCosseno,
  normalizarVetor,
} from "../services/comparar-template-facial.service";

export async function validarFaceMarcacaoAction(
  _estadoAnterior: BiometriaFormState,
  formData: FormData,
): Promise<BiometriaFormState> {
  const session = await auth();

  if (!session?.user) {
    return {
      sucesso: false,
      mensagem: "Sessão expirada. Faça login novamente.",
    };
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("biometria:validar:proprio")) {
    return {
      sucesso: false,
      mensagem: "Você não possui permissão para validar biometria facial.",
    };
  }

  const servidor = await buscarServidorBiometriaPorUsuarioId(session.user.id);

  if (!servidor) {
    return {
      sucesso: false,
      mensagem: "Servidor não localizado.",
    };
  }

  const templateRaw = String(formData.get("template") ?? "[]");
  const qualidade = Number(formData.get("qualidade") ?? 0);

  let template: number[];

  try {
    template = JSON.parse(templateRaw) as number[];
  } catch {
    return {
      sucesso: false,
      mensagem: "Template facial inválido.",
    };
  }

  const parsed = templateFacialSchema.safeParse({
    template,
    qualidade,
    metadados: {
      origem: "VALIDACAO_WEB",
    },
  });

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: parsed.error.issues[0]?.message ?? "Template facial inválido.",
    };
  }

  const biometria = await buscarBiometriaAtivaPorServidorId(servidor.id);

  if (!biometria || biometria.status !== "ATIVO") {
    return {
      sucesso: false,
      mensagem: "Servidor sem biometria facial ativa.",
    };
  }

  const templateCadastrado = biometria.template as number[];
  const templateCapturado = normalizarVetor(parsed.data.template);

  const similaridade = calcularSimilaridadeCosseno(
    templateCadastrado,
    templateCapturado,
  );

  const distancia = calcularDistanciaCosseno(
    templateCadastrado,
    templateCapturado,
  );

  /*
   * Regra:
   * - distância menor é melhor.
   * - similaridade maior é melhor.
   *
   * Para distância cosseno, um limiar inicial razoável para teste local
   * é algo entre 0.30 e 0.45.
   */
  const limiarDistancia = biometria.limiarDistancia ?? 0.4;
  const validada = distancia <= limiarDistancia;

  await prisma.$transaction(async (tx) => {
    await tx.amostraBiometricaFacial.create({
      data: {
        biometriaId: biometria.id,
        servidorId: servidor.id,
        tipo: "VALIDACAO",
        template: templateCapturado,
        qualidade,
        distancia,
        similaridade,
        validada,
        criadoPorUsuarioId: session.user.id,
        metadados: {
          limiarDistancia,
          metrica: "COSINE_DISTANCE",
          origem: "VALIDACAO_WEB",
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "BiometriaFacialServidor",
        entidadeId: biometria.id,
        acao: validada
          ? "BIOMETRIA_FACIAL_VALIDADA"
          : "BIOMETRIA_FACIAL_REJEITADA",
        dadosDepois: {
          servidorId: servidor.id,
          distancia,
          similaridade,
          validada,
          limiarDistancia,
          metrica: "COSINE_DISTANCE",
          autorizacaoGerada: validada,
        },
      },
    });
  });

  let autorizacaoId: string | undefined;
  let autorizacaoToken: string | undefined;
  let expiraEm: string | undefined;

  if (validada) {
    const autorizacao = await criarAutorizacaoBiometricaMarcacao({
      servidorId: servidor.id,
      similaridade,
      distancia,
    });

    autorizacaoId = autorizacao.id;
    autorizacaoToken = autorizacao.token;
    expiraEm = autorizacao.expiraEm.toISOString();
  }

  return {
    sucesso: validada,
    mensagem: validada
      ? "Biometria facial validada com sucesso. Você já pode registrar a marcação."
      : "Biometria facial não conferiu com o cadastro.",
    distancia,
    similaridade,
    autorizacaoId,
    autorizacaoToken,
    expiraEm,
  };
}
