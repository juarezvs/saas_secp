"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  consumirAutorizacaoBiometricaMarcacao,
  validarAutorizacaoBiometricaMarcacao,
} from "@/modules/biometria/application/services/autorizacao-biometrica-marcacao.service";
import { criarMarcacaoBrutaService } from "../services/criar-marcacao-bruta.service";
import { processarMarcacaoBrutaService } from "../services/processar-marcacao-bruta.service";

export async function registrarMarcacaoFacialAutorizadaAction(
  formData: FormData,
) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("marcacoes:registrar-facial:proprio")) {
    return;
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
    return;
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
    return;
  }

  const resultadoBruta = await criarMarcacaoBrutaService({
    matricula: servidor.matricula,
    cpf: servidor.cpf ?? null,
    dataHora: new Date(),
    origem: "FACIAL_AUTORIZADO",
    codigoExterno: crypto.randomUUID(),
    payloadOriginal: {
      usuarioId: session.user.id,
      autorizacaoBiometricaId,
      origem: "FACIAL_AUTORIZADO",
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
  }

  revalidatePath("/marcacoes");
  revalidatePath("/marcacoes/registrar");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");
}