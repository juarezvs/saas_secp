"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { criarMarcacaoBrutaService } from "../services/criar-marcacao-bruta.service";
import { processarMarcacaoBrutaService } from "../services/processar-marcacao-bruta.service";

export async function registrarMarcacaoWebAutorizadaAction() {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("marcacoes:registrar-web:proprio")) {
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
}