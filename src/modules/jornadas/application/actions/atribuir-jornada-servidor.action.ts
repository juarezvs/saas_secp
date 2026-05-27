"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  jornadaServidorSchema,
  type JornadaServidorFormState,
} from "../schemas/jornada-servidor.schema";

function extrairDados(formData: FormData) {
  return {
    servidorId: String(formData.get("servidorId") ?? ""),
    jornadaId: String(formData.get("jornadaId") ?? ""),
    escalaId: String(formData.get("escalaId") ?? ""),
    dataInicio: String(formData.get("dataInicio") ?? ""),
    dataFim: String(formData.get("dataFim") ?? ""),
    justificativa: String(formData.get("justificativa") ?? "").trim(),
  };
}

export async function atribuirJornadaServidorAction(
  _estadoAnterior: JornadaServidorFormState,
  formData: FormData
): Promise<JornadaServidorFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "jornadas:gerenciar:global"
  );

  const dados = extrairDados(formData);
  const parsed = jornadaServidorSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do formulário.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const dataInicio = new Date(`${parsed.data.dataInicio}T00:00:00`);
  const dataFim = parsed.data.dataFim
    ? new Date(`${parsed.data.dataFim}T00:00:00`)
    : null;

  if (dataFim && dataFim < dataInicio) {
    return {
      sucesso: false,
      mensagem: "A data final não pode ser anterior à data inicial.",
      erros: {
        dataFim: ["A data final não pode ser anterior à data inicial."],
      },
      campos: dados,
    };
  }

  await prisma.$transaction(async (tx) => {
    if (!dataFim) {
      await tx.jornadaServidor.updateMany({
        where: {
          servidorId: parsed.data.servidorId,
          ativo: true,
          dataFim: null,
        },
        data: {
          ativo: false,
          dataFim: dataInicio,
        },
      });
    }

    const vinculo = await tx.jornadaServidor.create({
      data: {
        servidorId: parsed.data.servidorId,
        jornadaId: parsed.data.jornadaId,
        escalaId: parsed.data.escalaId || null,
        dataInicio,
        dataFim,
        ativo: !dataFim,
        justificativa: parsed.data.justificativa || null,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "JornadaServidor",
        entidadeId: vinculo.id,
        acao: "JORNADA_SERVIDOR_ATRIBUIDA",
        dadosDepois: {
          id: vinculo.id,
          servidorId: vinculo.servidorId,
          jornadaId: vinculo.jornadaId,
          escalaId: vinculo.escalaId,
          dataInicio: vinculo.dataInicio,
          dataFim: vinculo.dataFim,
          justificativa: vinculo.justificativa,
        },
      },
    });
  });

  revalidatePath("/jornadas");
  revalidatePath("/servidores");
  revalidatePath(`/servidores/${parsed.data.servidorId}`);

  return {
    sucesso: true,
    mensagem: "Jornada atribuída ao servidor com sucesso.",
  };
}