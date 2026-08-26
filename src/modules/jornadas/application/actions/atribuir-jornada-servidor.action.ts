"use server";

import { revalidatePath } from "next/cache";

import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { validarERegistrarProcedimentoFrequencia } from "@/modules/procedimentos-frequencia/application/services/motor-procedimentos-frequencia.service";
import { resolverEscopoGestaoUsuarios } from "@/modules/usuarios/application/services/escopo-gestao-usuarios.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  jornadaServidorSchema,
  type JornadaServidorFormState,
} from "../schemas/jornada-servidor.schema";
import { avaliarCompatibilidadeJornadaDedicacaoIntegral } from "../services/dedicacao-integral.service";

function extrairDados(formData: FormData) {
  const servidorIds = Array.from(
    new Set(
      [
        ...formData.getAll("servidorIds").map((valor) => String(valor)),
        String(formData.get("servidorId") ?? ""),
      ].filter(Boolean),
    ),
  );

  return {
    modoSelecao: String(formData.get("modoSelecao") ?? "PESSOAS"),
    servidorIds,
    servidorId: servidorIds[0] ?? "",
    orgaoId: String(formData.get("orgaoId") ?? ""),
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

function categoriaProcedimentoJornada(params: {
  tipoVinculacao: string;
  dataFim: Date | null;
  cargaDiariaMinutos: number;
  motivo?: string | null;
}) {
  const motivo = params.motivo?.toLowerCase() ?? "";

  if (
    params.cargaDiariaMinutos < 420 ||
    motivo.includes("medic") ||
    motivo.includes("especial") ||
    motivo.includes("reduz")
  ) {
    return "JORNADA_ESPECIAL" as const;
  }

  if (params.tipoVinculacao === "TEMPORARIA" || params.dataFim) {
    return "ALTERACAO_TEMPORARIA_JORNADA" as const;
  }

  return "JORNADA_DIARIA" as const;
}

export async function atribuirJornadaServidorAction(
  _estadoAnterior: JornadaServidorFormState,
  formData: FormData,
): Promise<JornadaServidorFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "jornadas:gerenciar:global",
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
  const escopoUsuarios = await resolverEscopoGestaoUsuarios(permissao);
  const atribuirPorSeccional = parsed.data.modoSelecao === "SECCIONAL";

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

  if (
    atribuirPorSeccional &&
    !escopoUsuarios.permitirEscopoGlobal &&
    !escopoUsuarios.orgaoIdsPermitidos.includes(parsed.data.orgaoId ?? "")
  ) {
    return {
      sucesso: false,
      mensagem: "Selecione uma seccional vinculada ao seu perfil ativo.",
      erros: {
        orgaoId: ["Selecione uma seccional vinculada ao seu perfil ativo."],
      },
      campos: dados,
    };
  }

  const [jornada, servidores] = await Promise.all([
    prisma.jornada.findUnique({
      where: { id: parsed.data.jornadaId },
      select: {
        horarioDiferenciadoPermitido: true,
        cargaDiariaMinutos: true,
      },
    }),
    prisma.servidor.findMany({
      where: {
        ...(atribuirPorSeccional
          ? { orgaoId: parsed.data.orgaoId }
          : {
              id: {
                in: parsed.data.servidorIds,
              },
            }),
        ativo: true,
        usuario: {
          ativo: true,
        },
      },
      select: {
        id: true,
        matricula: true,
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
      mensagem: "Horario nao encontrado.",
    };
  }

  if (!atribuirPorSeccional && servidores.length !== parsed.data.servidorIds.length) {
    return {
      sucesso: false,
      mensagem: "Uma ou mais pessoas selecionadas não foram encontradas.",
      campos: dados,
    };
  }

  if (atribuirPorSeccional && servidores.length === 0) {
    return {
      sucesso: false,
      mensagem: "Nenhuma pessoa ativa foi encontrada para a seccional selecionada.",
      erros: {
        orgaoId: [
          "Nenhuma pessoa ativa foi encontrada para a seccional selecionada.",
        ],
      },
      campos: dados,
    };
  }

  const servidorForaEscopo = servidores.find(
    (servidor) =>
      !escopoUsuarios.permitirEscopoGlobal &&
      !escopoUsuarios.orgaoIdsPermitidos.includes(servidor.orgaoId),
  );

  if (servidorForaEscopo) {
    return {
      sucesso: false,
      mensagem:
        "Uma ou mais pessoas estão fora do escopo da seccional vinculada ao perfil ativo.",
      campos: dados,
    };
  }

  for (const servidor of servidores) {
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
          "Pessoa ocupante de FC/CJ deve cumprir dedicação integral, preferencialmente com horário de 8 horas.",
        erros: {
          justificativa: [
            `Informe justificativa formal para ${servidor.matricula}.`,
          ],
        },
        campos: dados,
      };
    }
  }

  if (
    parsed.data.horarioDiferenciadoAutorizado &&
    !jornada.horarioDiferenciadoPermitido
  ) {
    return {
      sucesso: false,
      mensagem: "O horário selecionado não admite horário diferenciado.",
      erros: {
        horarioDiferenciadoAutorizado: [
          "Selecione um horário que permita horário diferenciado.",
        ],
      },
      campos: dados,
    };
  }

  await prisma.$transaction(async (tx) => {
    const dataFimComparacao = dataFim ?? DATA_FIM_ABERTA;

    for (const servidor of servidores) {
      const procedimento = await validarERegistrarProcedimentoFrequencia({
        tx,
        categoria: categoriaProcedimentoJornada({
          tipoVinculacao: parsed.data.tipoVinculacao,
          dataFim,
          cargaDiariaMinutos: jornada.cargaDiariaMinutos,
          motivo: parsed.data.motivo,
        }),
        servidorId: servidor.id,
        usuarioId: permissao.usuarioId,
        permissoesUsuario: permissao.permissoes,
        dataInicio,
        dataFim,
        processoSei: parsed.data.documentoSei,
        documentoSei:
          parsed.data.fundamentoDocumental || parsed.data.documentoSei,
        autoridade: parsed.data.autoridadeResponsavel,
        justificativa:
          parsed.data.justificativa ||
          parsed.data.motivo ||
          "Atribuição administrativa de horário à pessoa.",
        titulo: "Associação de horário à pessoa",
        exigePermissao: "autorizar",
        exigeRecalculo: true,
        validarDocumentos:
          parsed.data.tipoVinculacao === "TEMPORARIA" ||
          Boolean(dataFim) ||
          jornada.cargaDiariaMinutos < 420,
        dadosEntrada: {
          origem: "ATRIBUICAO_JORNADA_SERVIDOR",
          jornadaId: parsed.data.jornadaId,
          escalaId: parsed.data.escalaId || null,
          tipoVinculacao: parsed.data.tipoVinculacao,
          modoSelecao: parsed.data.modoSelecao,
          orgaoId: parsed.data.orgaoId || null,
          horarioDiferenciadoAutorizado:
            parsed.data.horarioDiferenciadoAutorizado,
        },
      });

      const vinculosSobrepostos = await tx.jornadaServidor.findMany({
        where: {
          servidorId: servidor.id,
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
          servidorId: servidor.id,
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
            procedimentoFrequenciaId: procedimento.procedimento.id,
            procedimentoFrequenciaExecucaoId: procedimento.execucao?.id ?? null,
            procedimentoFrequenciaCodigo: procedimento.procedimento.codigo,
          },
        },
      });
    }
  });

  revalidatePath("/jornadas");
  revalidatePath("/jornadas/atribuicoes");
  revalidatePath("/servidores");

  for (const servidor of servidores) {
    revalidatePath(`/servidores/${servidor.id}`);
  }

  return {
    sucesso: true,
    mensagem: `Horário associado a ${servidores.length} pessoa(s) com sucesso.`,
  };
}
