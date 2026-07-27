"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { validarAssinaturaDocumento } from "@/modules/documentos-autenticacao/application/services/validar-assinatura-documento.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { criarMarcacaoBrutaService } from "../services/criar-marcacao-bruta.service";
import { processarMarcacaoBrutaService } from "../services/processar-marcacao-bruta.service";

type RegistrarMarcacaoWebActionState = {
  erro?: string | null;
  sucesso?: string | null;
};

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

  const resultado = await criarMarcacaoBrutaService({
    matricula: servidor.matricula,
    cpf: servidor.cpf ?? null,
    dataHora: new Date(),
    origem: "WEB_AUTORIZADO",
    codigoExterno: crypto.randomUUID(),
    payloadOriginal: {
      usuarioId: session.user.id,
      origem: "WEB_AUTORIZADO",
      userAgent: "SECP_WEB",
      assinatura: {
        usuarioId: assinatura.usuarioId,
        matricula: assinatura.matricula,
        nome: assinatura.nome,
        assinadoEm: assinatura.assinadoEm.toISOString(),
      },
    },
  });

  await processarMarcacaoBrutaService({
    marcacaoBrutaId: resultado.marcacaoBruta.id,
    usuarioIdAuditoria: session.user.id,
  });

  revalidatePath("/marcacoes");
  revalidatePath("/marcacoes/registrar");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");

  return { sucesso: "Marcação assinada e registrada com sucesso." };
}
