"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  jornadaServidorSchema,
  type JornadaServidorFormState,
} from "../schemas/jornada-servidor.schema";
import { avaliarCompatibilidadeJornadaDedicacaoIntegral } from "../services/dedicacao-integral.service";

function extrairDados(formData: FormData) {
  return {
    servidorId: String(formData.get("servidorId") ?? ""),
    jornadaId: String(formData.get("jornadaId") ?? ""),
    escalaId: String(formData.get("escalaId") ?? ""),
    dataInicio: String(formData.get("dataInicio") ?? ""),
    dataFim: String(formData.get("dataFim") ?? ""),
    horarioDiferenciadoAutorizado:
      formData.get("horarioDiferenciadoAutorizado") === "on" ||
      formData.get("horarioDiferenciadoAutorizado") === "true",
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

  const [jornada, servidor] = await Promise.all([
    prisma.jornada.findUnique({
      where: { id: parsed.data.jornadaId },
      select: {
        horarioDiferenciadoPermitido: true,
        cargaDiariaMinutos: true,
      },
    }),
    prisma.servidor.findUnique({
      where: { id: parsed.data.servidorId },
      select: {
        cargo: {
          select: {
            descricao: true,
          },
        },
        lotacoes: {
          where: {
            status: "ATIVO",
          },
          select: {
            cargo: {
              select: {
                descricao: true,
              },
            },
          },
          orderBy: {
            dataInicio: "desc",
          },
        },
      },
    }),
  ]);

  if (!jornada) {
    return {
      sucesso: false,
      mensagem: "Jornada não encontrada.",
    };
  }

  if (!servidor) {
    return {
      sucesso: false,
      mensagem: "Servidor nao encontrado.",
    };
  }

  const avaliacaoDedicacaoIntegral =
    avaliarCompatibilidadeJornadaDedicacaoIntegral({
      descricaoCargoServidor: servidor.cargo?.descricao,
      descricoesCargosLotacoes: servidor.lotacoes.map(
        (lotacao) => lotacao.cargo?.descricao,
      ),
      jornadaCargaDiariaMinutos: jornada.cargaDiariaMinutos,
      justificativa: parsed.data.justificativa,
    });

  if (!avaliacaoDedicacaoIntegral.compativel) {
    return {
      sucesso: false,
      mensagem:
        "Servidor ocupante de FC/CJ deve cumprir dedicacao integral, preferencialmente com jornada de 8 horas.",
      erros: {
        justificativa: [
          "Informe justificativa formal para atribuir jornada inferior a 8 horas a ocupante de FC/CJ.",
        ],
      },
      campos: dados,
    };
  }

  if (
    parsed.data.horarioDiferenciadoAutorizado &&
    !jornada.horarioDiferenciadoPermitido
  ) {
    return {
      sucesso: false,
      mensagem: "A jornada selecionada não admite horário diferenciado.",
      erros: {
        horarioDiferenciadoAutorizado: [
          "Selecione uma jornada que permita horário diferenciado.",
        ],
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
        horarioDiferenciadoAutorizado:
          parsed.data.horarioDiferenciadoAutorizado,
        autorizadoPorUsuarioId: parsed.data.horarioDiferenciadoAutorizado
          ? permissao.usuarioId
          : null,
        autorizadoEm: parsed.data.horarioDiferenciadoAutorizado
          ? new Date()
          : null,
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
          horarioDiferenciadoAutorizado:
            vinculo.horarioDiferenciadoAutorizado,
          autorizadoPorUsuarioId: vinculo.autorizadoPorUsuarioId,
          autorizadoEm: vinculo.autorizadoEm,
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
