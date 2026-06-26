"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

const replicarCalendarioSchema = z.object({
  anoOrigem: z.coerce.number().int().min(2000).max(2100),
  anoDestino: z.coerce.number().int().min(2000).max(2100),
  somenteAtivos: z.coerce.boolean().default(true),
});

export type ReplicarCalendarioInstitucionalState = {
  sucesso: boolean;
  mensagem: string | null;
  copiados?: number;
  ignorados?: number;
  erros?: Record<string, string[]>;
};

function dataUtc(ano: number, mesZeroBased: number, dia: number) {
  return new Date(Date.UTC(ano, mesZeroBased, dia));
}

function ehMesDiaValido(ano: number, mesZeroBased: number, dia: number) {
  const data = dataUtc(ano, mesZeroBased, dia);

  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mesZeroBased &&
    data.getUTCDate() === dia
  );
}

function replicarDataOpcional(data: Date | null, anoDestino: number) {
  if (!data) {
    return null;
  }

  const mes = data.getUTCMonth();
  const dia = data.getUTCDate();

  if (!ehMesDiaValido(anoDestino, mes, dia)) {
    return null;
  }

  return dataUtc(anoDestino, mes, dia);
}

export async function replicarCalendarioInstitucionalAction(
  _estadoAnterior: ReplicarCalendarioInstitucionalState,
  formData: FormData,
): Promise<ReplicarCalendarioInstitucionalState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "configuracoes:gerenciar:global",
  );
  const parsed = replicarCalendarioSchema.safeParse({
    anoOrigem: formData.get("anoOrigem"),
    anoDestino: formData.get("anoDestino"),
    somenteAtivos:
      formData.get("somenteAtivos") === "on" ||
      formData.get("somenteAtivos") === "true",
  });

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os anos informados.",
      erros: parsed.error.flatten().fieldErrors,
    };
  }

  if (parsed.data.anoOrigem === parsed.data.anoDestino) {
    return {
      sucesso: false,
      mensagem: "O ano de destino deve ser diferente do ano de origem.",
      erros: {
        anoDestino: ["Informe um ano de destino diferente."],
      },
    };
  }

  const inicioOrigem = dataUtc(parsed.data.anoOrigem, 0, 1);
  const fimOrigem = dataUtc(parsed.data.anoOrigem + 1, 0, 1);
  const inicioDestino = dataUtc(parsed.data.anoDestino, 0, 1);
  const fimDestino = dataUtc(parsed.data.anoDestino + 1, 0, 1);

  const resultado = await prisma.$transaction(async (tx) => {
    const [eventosOrigem, eventosDestino] = await Promise.all([
      tx.calendarioInstitucional.findMany({
        where: {
          ...(parsed.data.somenteAtivos ? { ativo: true } : {}),
          dataReferencia: {
            gte: inicioOrigem,
            lt: fimOrigem,
          },
        },
        orderBy: [{ dataReferencia: "asc" }, { descricao: "asc" }],
      }),
      tx.calendarioInstitucional.findMany({
        where: {
          dataReferencia: {
            gte: inicioDestino,
            lt: fimDestino,
          },
        },
        select: {
          dataReferencia: true,
        },
      }),
    ]);
    const datasDestinoExistentes = new Set(
      eventosDestino.map((evento) =>
        evento.dataReferencia.toISOString().slice(0, 10),
      ),
    );
    const eventosParaCriar = [];
    let ignorados = 0;

    for (const evento of eventosOrigem) {
      const mes = evento.dataReferencia.getUTCMonth();
      const dia = evento.dataReferencia.getUTCDate();

      if (!ehMesDiaValido(parsed.data.anoDestino, mes, dia)) {
        ignorados++;
        continue;
      }

      const dataDestino = dataUtc(parsed.data.anoDestino, mes, dia);
      const chaveDestino = dataDestino.toISOString().slice(0, 10);

      if (datasDestinoExistentes.has(chaveDestino)) {
        ignorados++;
        continue;
      }

      datasDestinoExistentes.add(chaveDestino);
      eventosParaCriar.push({
        dataReferencia: dataDestino,
        descricao: evento.descricao,
        tipo: evento.tipo,
        contaComoDiaUtil: evento.contaComoDiaUtil,
        geraApuracaoRegular: evento.geraApuracaoRegular,
        janelaInicio: evento.janelaInicio,
        janelaFim: evento.janelaFim,
        dataOriginal: replicarDataOpcional(
          evento.dataOriginal,
          parsed.data.anoDestino,
        ),
        dataSubstituida: evento.dataSubstituida,
        observacao: evento.observacao,
        ativo: evento.ativo,
      });
    }

    if (eventosParaCriar.length > 0) {
      await tx.calendarioInstitucional.createMany({
        data: eventosParaCriar,
      });
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "CalendarioInstitucional",
        acao: "CALENDARIO_INSTITUCIONAL_REPLICADO",
        dadosDepois: {
          anoOrigem: parsed.data.anoOrigem,
          anoDestino: parsed.data.anoDestino,
          somenteAtivos: parsed.data.somenteAtivos,
          eventosOrigem: eventosOrigem.length,
          copiados: eventosParaCriar.length,
          ignorados,
        },
      },
    });

    return {
      copiados: eventosParaCriar.length,
      ignorados,
      eventosOrigem: eventosOrigem.length,
    };
  });

  revalidatePath("/administracao/calendario");
  revalidatePath("/homologacao");
  revalidatePath("/boletim-frequencia");

  return {
    sucesso: true,
    copiados: resultado.copiados,
    ignorados: resultado.ignorados,
    mensagem: `${resultado.copiados} evento(s) replicado(s). ${resultado.ignorados} evento(s) ignorado(s). Revise feriados móveis manualmente.`,
  };
}
