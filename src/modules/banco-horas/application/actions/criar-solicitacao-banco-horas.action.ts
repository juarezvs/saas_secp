"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import { resolverChefiaResponsavelDaUnidade } from "@/modules/chefias/application/services/resolver-chefia.service";
import { buscarServidorSolicitantePorUsuarioId } from "@/modules/solicitacoes/infrastructure/repositories/solicitacao.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

const criarSolicitacaoBancoHorasSchema = z.object({
  modalidade: z.enum(["GERAR_CREDITO", "UTILIZAR_SALDO", "COMPENSAR_DEBITO"]),
  dataInicio: z.string().min(1, "Informe a data inicial."),
  dataFim: z.string().min(1, "Informe a data final."),
  horasSolicitadas: z.coerce
    .number()
    .positive("Informe uma quantidade de horas maior que zero.")
    .max(16, "A solicitacao ordinaria nao pode exceder 16 horas."),
  titulo: z
    .string()
    .trim()
    .min(5, "Informe um titulo com pelo menos 5 caracteres.")
    .max(180, "O titulo deve ter no maximo 180 caracteres."),
  justificativa: z
    .string()
    .trim()
    .min(10, "Informe a justificativa com mais detalhes.")
    .max(3000, "A justificativa deve ter no maximo 3000 caracteres."),
}).superRefine((data, ctx) => {
  if (data.dataInicio && data.dataFim) {
    const inicio = dataLocal(data.dataInicio);
    const fim = dataLocal(data.dataFim);

    if (fim < inicio) {
      ctx.addIssue({
        code: "custom",
        path: ["dataFim"],
        message: "A data final deve ser igual ou posterior a data inicial.",
      });
    }
  }
});

function dataLocal(valor: string) {
  return new Date(`${valor}T00:00:00.000Z`);
}

function proximoDiaLocal(valor: string) {
  const data = dataLocal(valor);
  data.setUTCDate(data.getUTCDate() + 1);
  return data;
}

function tipoSolicitacao(modalidade: z.infer<typeof criarSolicitacaoBancoHorasSchema>["modalidade"]) {
  if (modalidade === "GERAR_CREDITO") {
    return "HORA_CREDITO_PREVIA" as const;
  }

  if (modalidade === "UTILIZAR_SALDO") {
    return "FOLGA_BANCO_HORAS" as const;
  }

  return "COMPENSACAO" as const;
}

function tipoCompensacao(modalidade: z.infer<typeof criarSolicitacaoBancoHorasSchema>["modalidade"]) {
  if (modalidade === "COMPENSAR_DEBITO") {
    return "COMPENSAR_DEBITO";
  }

  if (modalidade === "UTILIZAR_SALDO") {
    return "UTILIZAR_CREDITO";
  }

  return null;
}

export async function criarSolicitacaoBancoHorasAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("solicitacoes:criar:proprio")) {
    redirect(
      "/acesso-negado?permissao=solicitacoes%3Acriar%3Aproprio",
    );
  }

  const parsed = criarSolicitacaoBancoHorasSchema.safeParse({
    modalidade: String(formData.get("modalidade") ?? ""),
    dataInicio: String(formData.get("dataInicio") ?? ""),
    dataFim: String(formData.get("dataFim") ?? ""),
    horasSolicitadas: formData.get("horasSolicitadas"),
    titulo: String(formData.get("titulo") ?? ""),
    justificativa: String(formData.get("justificativa") ?? ""),
  });

  if (!parsed.success) {
    const mensagem = encodeURIComponent(
      parsed.error.issues[0]?.message ?? "Verifique os dados da solicitacao.",
    );
    redirect(`/banco-horas/solicitacoes?erro=${mensagem}`);
  }

  const servidor = await buscarServidorSolicitantePorUsuarioId(session.user.id);

  if (!servidor?.lotacoes[0]) {
    redirect(
      "/banco-horas/solicitacoes?erro=Servidor%20sem%20lotacao%20ativa%20para%20resolver%20a%20chefia.",
    );
  }

  const lotacaoAtual = servidor.lotacoes[0];
  const chefiaResolvida = await resolverChefiaResponsavelDaUnidade(
    lotacaoAtual.unidadeId,
  );
  const minutosSolicitados = Math.round(parsed.data.horasSolicitadas * 60);

  const solicitacao = await prisma.$transaction(async (tx) => {
    const novaSolicitacao = await tx.solicitacao.create({
      data: {
        servidorId: servidor.id,
        usuarioSolicitanteId: session.user.id,
        unidadeId: lotacaoAtual.unidadeId,
        chefiaResponsavelId: chefiaResolvida?.gestorUnidadeId ?? null,
        tipo: tipoSolicitacao(parsed.data.modalidade),
        status: "ENVIADA",
        titulo: parsed.data.titulo,
        descricao: parsed.data.justificativa,
        dataInicio: dataLocal(parsed.data.dataInicio),
        dataFim: proximoDiaLocal(parsed.data.dataFim),
        dadosSolicitados: {
          modalidadeBancoHoras: parsed.data.modalidade,
          tipoCompensacao: tipoCompensacao(parsed.data.modalidade),
          horasSolicitadas: parsed.data.horasSolicitadas,
          minutosSolicitados,
          saldoNaoAlteradoAntesDaAprovacao: true,
          lotacaoAtual: {
            unidadeId: lotacaoAtual.unidadeId,
            unidadeSigla: lotacaoAtual.unidade.sigla,
          },
          chefiaResolvida: chefiaResolvida ?? null,
        },
      },
    });

    await tx.solicitacaoEvento.create({
      data: {
        solicitacaoId: novaSolicitacao.id,
        usuarioId: session.user.id,
        tipo: "CRIADA",
        descricao: "Solicitacao de banco de horas criada e enviada para analise.",
        metadados: {
          status: "ENVIADA",
          modalidadeBancoHoras: parsed.data.modalidade,
          minutosSolicitados,
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "Solicitacao",
        entidadeId: novaSolicitacao.id,
        acao: "SOLICITACAO_BANCO_HORAS_CRIADA",
        dadosDepois: {
          id: novaSolicitacao.id,
          tipo: novaSolicitacao.tipo,
          modalidadeBancoHoras: parsed.data.modalidade,
          minutosSolicitados,
          servidorId: servidor.id,
          unidadeId: lotacaoAtual.unidadeId,
          chefiaResponsavelId: chefiaResolvida?.gestorUnidadeId ?? null,
        },
      },
    });

    return novaSolicitacao;
  });

  revalidatePath("/banco-horas");
  revalidatePath("/banco-horas/solicitacoes");
  revalidatePath("/solicitacoes");
  redirect(`/solicitacoes/${solicitacao.id}`);
}
