"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  analisarSolicitacaoSchema,
  type AnalisarSolicitacaoFormState,
} from "../schemas/solicitacao.schema";
import { aplicarEfeitosSolicitacaoDeferida } from "../services/aplicar-efeitos-solicitacao.service";
import { buscarSolicitacaoPorId } from "../../infrastructure/repositories/solicitacao.repository";

function extrairDados(formData: FormData) {
  return {
    resultado: String(formData.get("resultado") ?? ""),
    justificativaAnalise: String(formData.get("justificativaAnalise") ?? "").trim(),
  };
}

export async function analisarSolicitacaoAction(
  solicitacaoId: string,
  _estadoAnterior: AnalisarSolicitacaoFormState,
  formData: FormData
): Promise<AnalisarSolicitacaoFormState> {
  const session = await auth();

  if (!session?.user) {
    return {
      sucesso: false,
      mensagem: "Sessão expirada. Faça login novamente.",
    };
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  const podeAnalisar =
    permissoes.includes("solicitacoes:analisar:chefia") ||
    permissoes.includes("solicitacoes:consultar:global");

  if (!podeAnalisar) {
    return {
      sucesso: false,
      mensagem: "Você não possui permissão para analisar solicitações.",
    };
  }

  const solicitacaoAtual = await buscarSolicitacaoPorId(solicitacaoId);

  if (!solicitacaoAtual) {
    return {
      sucesso: false,
      mensagem: "Solicitação não encontrada.",
    };
  }

  if (!["ENVIADA", "EM_ANALISE"].includes(solicitacaoAtual.status)) {
    return {
      sucesso: false,
      mensagem: "Esta solicitação não pode mais ser analisada.",
    };
  }

  const dados = extrairDados(formData);
  const parsed = analisarSolicitacaoSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique a análise da solicitação.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const novoStatus =
    parsed.data.resultado === "DEFERIR" ? "DEFERIDA" : "INDEFERIDA";

  await prisma.$transaction(async (tx) => {
    let dadosResultado: unknown = null;

    if (novoStatus === "DEFERIDA") {
      const efeito = await aplicarEfeitosSolicitacaoDeferida({
        tx,
        usuarioAnaliseId: session.user.id,
        solicitacao: {
          id: solicitacaoAtual.id,
          servidorId: solicitacaoAtual.servidorId,
          usuarioSolicitanteId: solicitacaoAtual.usuarioSolicitanteId,
          tipo: solicitacaoAtual.tipo,
          dataReferencia: solicitacaoAtual.dataReferencia,
          dadosSolicitados: solicitacaoAtual.dadosSolicitados,
        },
      });

      dadosResultado = efeito;

      await tx.solicitacaoEvento.create({
        data: {
          solicitacaoId,
          usuarioId: session.user.id,
          tipo: "EFEITO_APLICADO",
          descricao: efeito.mensagem,
          metadados: efeito,
        },
      });
    }

    await tx.solicitacao.update({
      where: {
        id: solicitacaoId,
      },
      data: {
        status: novoStatus,
        analisadaPorUsuarioId: session.user.id,
        analisadaEm: new Date(),
        justificativaAnalise: parsed.data.justificativaAnalise,
        dadosResultado,
      },
    });

    await tx.solicitacaoEvento.create({
      data: {
        solicitacaoId,
        usuarioId: session.user.id,
        tipo: novoStatus === "DEFERIDA" ? "DEFERIDA" : "INDEFERIDA",
        descricao:
          novoStatus === "DEFERIDA"
            ? "Solicitação deferida pela chefia."
            : "Solicitação indeferida pela chefia.",
        metadados: {
          justificativaAnalise: parsed.data.justificativaAnalise,
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "Solicitacao",
        entidadeId: solicitacaoId,
        acao:
          novoStatus === "DEFERIDA"
            ? "SOLICITACAO_DEFERIDA"
            : "SOLICITACAO_INDEFERIDA",
        dadosAntes: {
          status: solicitacaoAtual.status,
        },
        dadosDepois: {
          status: novoStatus,
          justificativaAnalise: parsed.data.justificativaAnalise,
          dadosResultado,
        },
      },
    });
  });

  revalidatePath("/solicitacoes");
  revalidatePath(`/solicitacoes/${solicitacaoId}`);
  revalidatePath("/marcacoes");
  revalidatePath("/apuracao");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");

  return {
    sucesso: true,
    mensagem:
      novoStatus === "DEFERIDA"
        ? "Solicitação deferida com sucesso."
        : "Solicitação indeferida com sucesso.",
  };
}