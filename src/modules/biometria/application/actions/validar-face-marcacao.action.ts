"use server";

import { auth } from "@/auth";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
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
import { BIOMETRIA_FACIAL_THRESHOLDS } from "../services/biometria-facial-config";
import {
  calcularDistanciaCosseno,
  calcularSimilaridadeCosseno,
  normalizarVetor,
} from "../services/comparar-template-facial.service";
import {
  descriptografarTemplateFacial,
  hashTemplateFacial,
} from "../../infrastructure/services/biometria-facial-crypto.service";

export async function validarFaceMarcacaoAction(
  _estadoAnterior: BiometriaFormState,
  formData: FormData,
): Promise<BiometriaFormState> {
  const session = await auth();

  if (!session?.user) {
    return {
      sucesso: false,
      mensagem: "Sessao expirada. Faca login novamente.",
    };
  }

  const podeValidar = usuarioPossuiAlgumaPermissaoNoPerfil(
    session.user.perfilAtivo?.codigo,
    session.user.perfilAtivo?.permissoes,
    ["biometria:validar:proprio", "biometria:gerenciar:global"],
  );

  if (!podeValidar) {
    return {
      sucesso: false,
      mensagem: "Voce nao possui permissao para validar biometria facial.",
    };
  }

  const servidor = await buscarServidorBiometriaPorUsuarioId(session.user.id);

  if (!servidor) {
    return {
      sucesso: false,
      mensagem: "Servidor nao localizado.",
    };
  }

  const templateRaw = String(formData.get("template") ?? "[]");
  const metadadosRaw = String(formData.get("metadados") ?? "{}");
  const qualidade = Number(formData.get("qualidade") ?? 0);

  let template: number[];
  let metadadosForm: Record<string, unknown> = {};

  try {
    template = JSON.parse(templateRaw) as number[];
  } catch {
    return {
      sucesso: false,
      mensagem: "Template facial invalido.",
    };
  }

  try {
    metadadosForm = JSON.parse(metadadosRaw) as Record<string, unknown>;
  } catch {
    metadadosForm = {};
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
      mensagem: parsed.error.issues[0]?.message ?? "Template facial invalido.",
    };
  }

  const biometria = await buscarBiometriaAtivaPorServidorId(servidor.id);

  if (!biometria || biometria.status !== "ATIVO") {
    return {
      sucesso: false,
      mensagem: "Servidor sem biometria facial ativa.",
    };
  }

  const templateCadastrado =
    biometria.templateCriptografado && biometria.templateIv && biometria.templateTag
      ? descriptografarTemplateFacial({
          conteudo: biometria.templateCriptografado,
          iv: biometria.templateIv,
          tag: biometria.templateTag,
        })
      : (biometria.template as number[]);
  let templateCapturado: number[];
  let similaridade: number;
  let distancia: number;

  try {
    templateCapturado = normalizarVetor(parsed.data.template);
    similaridade = calcularSimilaridadeCosseno(
      templateCadastrado,
      templateCapturado,
    );
    distancia = calcularDistanciaCosseno(templateCadastrado, templateCapturado);
  } catch (error) {
    return {
      sucesso: false,
      mensagem:
        error instanceof Error
          ? error.message
          : "Nao foi possivel comparar o template facial.",
    };
  }

  const limiarDistancia =
    biometria.limiarDistancia ??
    BIOMETRIA_FACIAL_THRESHOLDS.limiarDistanciaCosseno;
  const validada = distancia <= limiarDistancia;

  const amostra = await prisma.$transaction(async (tx) => {
    const amostraCriada = await tx.amostraBiometricaFacial.create({
      data: {
        biometriaId: biometria.id,
        servidorId: servidor.id,
        tipo: "VALIDACAO",
        templateHash: hashTemplateFacial(templateCapturado),
        qualidade,
        distancia,
        similaridade,
        validada,
        criadoPorUsuarioId: session.user.id,
        metadados: {
          limiarDistancia,
          metrica: "COSINE_DISTANCE",
          origem: "VALIDACAO_WEB",
          ...metadadosForm,
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
          amostraId: amostraCriada.id,
          distancia,
          similaridade,
          validada,
          limiarDistancia,
          metrica: "COSINE_DISTANCE",
          autorizacaoGerada: validada,
          metadados: metadadosForm,
        } as never,
      },
    });

    return amostraCriada;
  });

  let autorizacaoId: string | undefined;
  let autorizacaoToken: string | undefined;
  let expiraEm: string | undefined;

  if (validada) {
    const autorizacao = await criarAutorizacaoBiometricaMarcacao({
      servidorId: servidor.id,
      amostraId: amostra.id,
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
      ? "Biometria facial validada com sucesso. Voce ja pode registrar a marcacao."
      : "Biometria facial nao conferiu com o cadastro.",
    distancia,
    similaridade,
    autorizacaoId,
    autorizacaoToken,
    expiraEm,
  };
}
