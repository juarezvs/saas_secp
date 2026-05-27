"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  lotacaoSchema,
  type LotacaoFormState,
} from "../schemas/lotacao.schema";

function extrairDadosLotacao(servidorId: string, formData: FormData) {
  return {
    servidorId,
    unidadeId: String(formData.get("unidadeId") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    dataInicio: String(formData.get("dataInicio") ?? ""),
    dataFim: String(formData.get("dataFim") ?? ""),
  };
}

export async function vincularLotacaoAction(
  servidorId: string,
  _estadoAnterior: LotacaoFormState,
  formData: FormData
): Promise<LotacaoFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "servidores:gerenciar:global"
  );

  const dados = extrairDadosLotacao(servidorId, formData);
  const parsed = lotacaoSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos da lotação.",
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
      await tx.lotacao.updateMany({
        where: {
          servidorId,
          status: "ATIVO",
          dataFim: null,
        },
        data: {
          status: "INATIVO",
          dataFim: dataInicio,
        },
      });
    }

    const lotacao = await tx.lotacao.create({
      data: {
        servidorId,
        unidadeId: parsed.data.unidadeId,
        tipo: parsed.data.tipo,
        status: dataFim ? "INATIVO" : "ATIVO",
        dataInicio,
        dataFim,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Lotacao",
        entidadeId: lotacao.id,
        acao: "LOTACAO_VINCULADA",
        dadosDepois: {
          id: lotacao.id,
          servidorId,
          unidadeId: lotacao.unidadeId,
          tipo: lotacao.tipo,
          status: lotacao.status,
          dataInicio: lotacao.dataInicio,
          dataFim: lotacao.dataFim,
        },
      },
    });
  });

  revalidatePath("/servidores");
  revalidatePath(`/servidores/${servidorId}`);

  return {
    sucesso: true,
    mensagem: "Lotação vinculada com sucesso.",
  };
}