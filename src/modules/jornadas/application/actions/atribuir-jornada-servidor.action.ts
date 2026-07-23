"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
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
    tipoVinculacao: String(formData.get("tipoVinculacao") ?? "PERMANENTE"),
    motivo: String(formData.get("motivo") ?? "").trim(),
    fundamentoDocumental: String(
      formData.get("fundamentoDocumental") ?? "",
    ).trim(),
    documentoSei: String(formData.get("documentoSei") ?? "").trim(),
    autoridadeResponsavel: String(
      formData.get("autoridadeResponsavel") ?? "",
    ).trim(),
    horarioDiferenciadoAutorizado:
      formData.get("horarioDiferenciadoAutorizado") === "on" ||
      formData.get("horarioDiferenciadoAutorizado") === "true",
    justificativa: String(formData.get("justificativa") ?? "").trim(),
  };
}

const DATA_FIM_ABERTA = new Date("9999-12-31T00:00:00");

function adicionarDias(data: Date, dias: number) {
  const proxima = new Date(data);
  proxima.setDate(proxima.getDate() + dias);
  return proxima;
}

function menorOuIgual(a: Date, b: Date) {
  return a.getTime() <= b.getTime();
}

function maiorOuIgual(a: Date, b: Date) {
  return a.getTime() >= b.getTime();
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
  const escopoOrgao = await obterEscopoOrgaoDaSessao();

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
        orgaoId: true,
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

  if (!escopoOrgao.global && !escopoOrgao.orgaoIds.includes(servidor.orgaoId)) {
    return {
      sucesso: false,
      mensagem: "Servidor fora do escopo da seccional vinculada ao perfil ativo.",
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
    const dataFimComparacao = dataFim ?? DATA_FIM_ABERTA;
    const vinculosSobrepostos = await tx.jornadaServidor.findMany({
      where: {
        servidorId: parsed.data.servidorId,
        ativo: true,
        status: "ATIVO",
        dataInicio: {
          lte: dataFimComparacao,
        },
        OR: [
          {
            dataFim: null,
          },
          {
            dataFim: {
              gte: dataInicio,
            },
          },
        ],
      },
      orderBy: {
        dataInicio: "asc",
      },
    });

    for (const existente of vinculosSobrepostos) {
      const fimExistente = existente.dataFim ?? DATA_FIM_ABERTA;
      const comecaAntesDoNovo = existente.dataInicio < dataInicio;
      const terminaDepoisDoNovo = fimExistente > dataFimComparacao;
      const fimAntesDoNovo = adicionarDias(dataInicio, -1);
      const inicioDepoisDoNovo = dataFim
        ? adicionarDias(dataFim, 1)
        : null;

      if (comecaAntesDoNovo && terminaDepoisDoNovo && inicioDepoisDoNovo) {
        await tx.jornadaServidor.update({
          where: {
            id: existente.id,
          },
          data: {
            dataFim: fimAntesDoNovo,
          },
        });

        await tx.jornadaServidor.create({
          data: {
            servidorId: existente.servidorId,
            jornadaId: existente.jornadaId,
            escalaId: existente.escalaId,
            dataInicio: inicioDepoisDoNovo,
            dataFim: existente.dataFim,
            ativo: true,
            status: "ATIVO",
            tipoVinculacao: existente.tipoVinculacao,
            motivo: existente.motivo,
            fundamentoDocumental: existente.fundamentoDocumental,
            documentoSei: existente.documentoSei,
            autoridadeResponsavel: existente.autoridadeResponsavel,
            justificativa: existente.justificativa,
            horarioDiferenciadoAutorizado:
              existente.horarioDiferenciadoAutorizado,
            autorizadoPorUsuarioId: existente.autorizadoPorUsuarioId,
            autorizadoEm: existente.autorizadoEm,
          },
        });
        continue;
      }

      if (comecaAntesDoNovo && maiorOuIgual(fimExistente, dataInicio)) {
        if (maiorOuIgual(fimAntesDoNovo, existente.dataInicio)) {
          await tx.jornadaServidor.update({
            where: {
              id: existente.id,
            },
            data: {
              dataFim: fimAntesDoNovo,
            },
          });
        } else {
          await tx.jornadaServidor.update({
            where: {
              id: existente.id,
            },
            data: {
              ativo: false,
              status: "SUBSTITUIDA",
            },
          });
        }
        continue;
      }

      if (
        inicioDepoisDoNovo &&
        menorOuIgual(existente.dataInicio, dataFimComparacao) &&
        terminaDepoisDoNovo
      ) {
        await tx.jornadaServidor.update({
          where: {
            id: existente.id,
          },
          data: {
            dataInicio: inicioDepoisDoNovo,
          },
        });
        continue;
      }

      await tx.jornadaServidor.update({
        where: {
          id: existente.id,
        },
        data: {
          ativo: false,
          status: "SUBSTITUIDA",
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
        ativo: true,
        status: "ATIVO",
        tipoVinculacao: parsed.data.tipoVinculacao,
        motivo: parsed.data.motivo || null,
        fundamentoDocumental: parsed.data.fundamentoDocumental || null,
        documentoSei: parsed.data.documentoSei || null,
        autoridadeResponsavel: parsed.data.autoridadeResponsavel || null,
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
          tipoVinculacao: vinculo.tipoVinculacao,
          motivo: vinculo.motivo,
          fundamentoDocumental: vinculo.fundamentoDocumental,
          documentoSei: vinculo.documentoSei,
          autoridadeResponsavel: vinculo.autoridadeResponsavel,
          status: vinculo.status,
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
  revalidatePath("/jornadas/atribuicoes");
  revalidatePath("/servidores");
  revalidatePath(`/servidores/${parsed.data.servidorId}`);

  return {
    sucesso: true,
    mensagem: "Jornada atribuída ao servidor com sucesso.",
  };
}
