"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import {
  carregarCalendarioInstitucionalPeriodo,
  classificarDiaInstitucional,
} from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  criarSolicitacaoHorasExtrasSchema,
  type CriarSolicitacaoHorasExtrasFormState,
  type CriarSolicitacaoHorasExtrasInput,
} from "../schemas/horas-extras-solicitacao.schema";
import {
  inferOvertimeDayType,
  mapClassificacaoInstitucionalParaOvertimeDayType,
  parseIsoDateOnly,
} from "../services/horas-extras-datas.service";
import { validateOvertimeRequestedDays } from "../services/validar-solicitacao-horas-extras.service";
import {
  buscarConfiguracaoAtivaHorasExtras,
  buscarServidorSolicitanteHorasExtras,
} from "../../infrastructure/repositories/horas-extras-solicitacao.repository";

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function minutosDeHoraMinuto(valor: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(valor);

  if (!match) {
    return 0;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function extrairDias(formData: FormData) {
  const bruto = texto(formData, "days");

  if (!bruto) {
    return [];
  }

  try {
    const dias = JSON.parse(bruto) as Array<{
      date?: unknown;
      requestedTime?: unknown;
      paymentDestination?: unknown;
    }>;

    if (!Array.isArray(dias)) {
      return [];
    }

    return dias
      .map((day) => {
        const requestedTime = String(day.requestedTime ?? "").trim();
        const paymentDestination =
          day.paymentDestination === "BANCO_DE_HORAS"
            ? ("BANCO_DE_HORAS" as const)
            : ("PECUNIA" as const);

        return {
          date: String(day.date ?? "").trim(),
          requestedTime,
          requestedMinutes: minutosDeHoraMinuto(requestedTime),
          paymentDestination,
        };
      })
      .filter((day) => day.date || day.requestedTime);
  } catch {
    return [];
  }
}

function destinoConsolidado(
  days: ReturnType<typeof extrairDias>,
): "PECUNIA" | "BANCO_DE_HORAS" | "A_DEFINIR" {
  const destinos = new Set(days.map((day) => day.paymentDestination));

  if (destinos.size === 1) {
    return days[0]?.paymentDestination ?? ("A_DEFINIR" as const);
  }

  return "A_DEFINIR" as const;
}

function extrairDados(formData: FormData): Partial<CriarSolicitacaoHorasExtrasInput> {
  const intent = texto(formData, "intent");
  const days = extrairDias(formData);

  return {
    requestId: texto(formData, "requestId"),
    periodStart: texto(formData, "periodStart"),
    periodEnd: texto(formData, "periodEnd"),
    justification: texto(formData, "justification"),
    activitiesDescription: texto(formData, "activitiesDescription"),
    paymentDestination: destinoConsolidado(days),
    days,
    intent: intent === "draft" ? "draft" : "submit",
  };
}

function montarPoliticaValidacao(
  policyVersion: NonNullable<
    Awaited<ReturnType<typeof buscarConfiguracaoAtivaHorasExtras>>["policyVersion"]
  >,
) {
  return {
    dailyLimitMinutesByDayType: Object.fromEntries(
      policyVersion.rateRules.map((rule) => [
        rule.dayType,
        rule.dailyLimitMinutes ?? undefined,
      ]),
    ),
    monthlyLimitMinutes: policyVersion.monthlyLimitMinutes ?? undefined,
    annualLimitMinutes: policyVersion.annualLimitMinutes ?? undefined,
    normativeBasis: policyVersion.normativeBasis ?? undefined,
  };
}

function proximoNumeroSolicitacao(params: {
  ano: number;
  sequencial: number;
}) {
  return `HE-${params.ano}-${String(params.sequencial).padStart(5, "0")}`;
}

function resolverEtapaAposEnvio(
  workflowVersion: NonNullable<
    Awaited<ReturnType<typeof buscarConfiguracaoAtivaHorasExtras>>["workflowVersion"]
  >,
) {
  return (
    workflowVersion.transitions.find(
      (transition) =>
        transition.fromStepCode === workflowVersion.initialStepCode &&
        transition.actionCode === "SUBMIT",
    )?.toStepCode ?? workflowVersion.initialStepCode
  );
}

function diaSeguinte(data: Date) {
  const proxima = new Date(data);
  proxima.setUTCDate(proxima.getUTCDate() + 1);
  return proxima;
}

async function gerarNumeroSolicitacao(params: {
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
  orgaoId: string;
  ano: number;
}) {
  const prefixo = `HE-${params.ano}-`;
  const totalAno = await params.tx.overtimeRequest.count({
    where: {
      orgaoId: params.orgaoId,
      requestNumber: {
        startsWith: prefixo,
      },
    },
  });

  return proximoNumeroSolicitacao({
    ano: params.ano,
    sequencial: totalAno + 1,
  });
}

export async function criarSolicitacaoHorasExtrasAction(
  _estadoAnterior: CriarSolicitacaoHorasExtrasFormState,
  formData: FormData,
): Promise<CriarSolicitacaoHorasExtrasFormState> {
  const permissao = await exigirPermissao("horas-extras:solicitar:proprio");
  const dados = extrairDados(formData);
  const parsed = criarSolicitacaoHorasExtrasSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos da solicitação de horas extras.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  if (!permissao.usuarioId) {
    return {
      sucesso: false,
      mensagem: "Sessão sem usuário identificado.",
      campos: parsed.data,
    };
  }

  const servidor = await buscarServidorSolicitanteHorasExtras(permissao.usuarioId);

  if (!servidor) {
    return {
      sucesso: false,
      mensagem: "Nenhum servidor ativo foi encontrado para o usuário autenticado.",
      campos: parsed.data,
    };
  }

  const lotacaoAtual = servidor.lotacoes[0];

  if (!lotacaoAtual) {
    return {
      sucesso: false,
      mensagem: "Servidor sem lotação ativa. Regularize a lotação antes de solicitar horas extras.",
      campos: parsed.data,
    };
  }

  const dataReferencia = parseIsoDateOnly(parsed.data.periodStart);
  const dataFim = parseIsoDateOnly(parsed.data.periodEnd);
  const configuracao = await buscarConfiguracaoAtivaHorasExtras({
    orgaoId: servidor.orgaoId,
    scopeUnitId: lotacaoAtual.unidadeId,
    dataReferencia,
  });

  if (!configuracao.policyVersion || !configuracao.workflowVersion) {
    return {
      sucesso: false,
      mensagem: "Não há política ou workflow ativo de horas extras para o órgão do servidor.",
      campos: parsed.data,
    };
  }

  const calendario = await carregarCalendarioInstitucionalPeriodo({
    inicio: dataReferencia,
    fimExclusivo: diaSeguinte(dataFim),
  });
  const tiposPorData = new Map<string, ReturnType<typeof inferOvertimeDayType>>();

  for (const day of parsed.data.days) {
    const classificacao = await classificarDiaInstitucional(
      parseIsoDateOnly(day.date),
      calendario,
      servidor.id,
    );
    tiposPorData.set(
      day.date,
      mapClassificacaoInstitucionalParaOvertimeDayType(classificacao),
    );
  }

  const diasClassificados = parsed.data.days.map((day) => ({
    ...day,
    dayType: tiposPorData.get(day.date) ?? inferOvertimeDayType(day.date),
  }));

  const issues = validateOvertimeRequestedDays({
    periodStart: parsed.data.periodStart,
    periodEnd: parsed.data.periodEnd,
    days: diasClassificados,
    policy: montarPoliticaValidacao(configuracao.policyVersion),
  });

  if (issues.some((issue) => issue.severity === "error")) {
    return {
      sucesso: false,
      mensagem: "Corrija os impedimentos antes de salvar a solicitação.",
      erros: {
        days: issues.map((issue) => issue.message),
      },
      campos: parsed.data,
    };
  }

  const rateRules = new Map(
    configuracao.policyVersion.rateRules.map((rule) => [rule.dayType, rule]),
  );
  const submitted = parsed.data.intent === "submit";
  const stepAfterSubmit = resolverEtapaAposEnvio(configuracao.workflowVersion);
  const now = new Date();
  const rascunhoExistente = parsed.data.requestId
    ? await prisma.overtimeRequest.findFirst({
        where: {
          id: parsed.data.requestId,
          requesterUserId: permissao.usuarioId!,
          employeeId: servidor.id,
          currentLifecycleStatus: "DRAFT",
        },
        select: {
          id: true,
        },
      })
    : null;

  if (parsed.data.requestId && !rascunhoExistente) {
    return {
      sucesso: false,
      mensagem:
        "Rascunho de horas extras não encontrado para o usuário autenticado.",
      campos: parsed.data,
    };
  }

  const request = await prisma.$transaction(async (tx) => {
    const diasData = diasClassificados.map((day) => {
      const dayType = day.dayType;
      const rateRule = rateRules.get(dayType);

      return {
        date: parseIsoDateOnly(day.date),
        requestedMinutes: day.requestedMinutes,
        paymentDestination: day.paymentDestination,
        dayTypeSnapshot: dayType,
        ratePercentSnapshot: rateRule?.ratePercent ?? null,
        requestDecision: "REQUESTED" as const,
      };
    });

    if (parsed.data.requestId) {
      await tx.overtimeRequestDay.deleteMany({
        where: {
          requestId: rascunhoExistente!.id,
        },
      });

      const atualizada = await tx.overtimeRequest.update({
        where: {
          id: rascunhoExistente!.id,
        },
        data: {
          orgaoId: servidor.orgaoId,
          requesterUserId: permissao.usuarioId!,
          employeeId: servidor.id,
          organizationalUnitId: lotacaoAtual.unidadeId,
          workUnitId: lotacaoAtual.unidadeId,
          policyVersionId: configuracao.policyVersion!.id,
          workflowVersionId: configuracao.workflowVersion!.id,
          periodStart: parseIsoDateOnly(parsed.data.periodStart),
          periodEnd: parseIsoDateOnly(parsed.data.periodEnd),
          justification: parsed.data.justification,
          activitiesDescription: parsed.data.activitiesDescription,
          paymentDestination: parsed.data.paymentDestination,
          currentLifecycleStatus: submitted ? "SUBMITTED" : "DRAFT",
          currentWorkflowStepCode: submitted ? stepAfterSubmit : null,
          submittedAt: submitted ? now : null,
          days: {
            create: diasData,
          },
          history: {
            create: {
              userId: permissao.usuarioId,
              action: submitted ? "SUBMIT" : "SAVE_DRAFT",
              fromStatus: "DRAFT",
              toStatus: submitted ? "SUBMITTED" : "DRAFT",
              toStepCode: submitted ? stepAfterSubmit : null,
              metadata: {
                policyVersionId: configuracao.policyVersion!.id,
                workflowVersionId: configuracao.workflowVersion!.id,
                days: parsed.data.days.length,
                updatedDraft: true,
              },
            },
          },
        },
      });

      await tx.auditoriaEvento.create({
        data: {
          usuarioId: permissao.usuarioId,
          entidade: "OvertimeRequest",
          entidadeId: atualizada.id,
          acao: submitted
            ? "HORAS_EXTRAS_RASCUNHO_ENVIADO"
            : "HORAS_EXTRAS_RASCUNHO_ATUALIZADO",
          dadosDepois: {
            id: atualizada.id,
            requestNumber: atualizada.requestNumber,
            status: atualizada.currentLifecycleStatus,
            currentWorkflowStepCode: atualizada.currentWorkflowStepCode,
          },
          metadados: {
            permissao: "horas-extras:solicitar:proprio",
            perfilAtivo: permissao.perfilAtivoCodigo,
          },
        },
      });

      return atualizada;
    }

    const requestNumber = await gerarNumeroSolicitacao({
      tx,
      orgaoId: servidor.orgaoId,
      ano: dataReferencia.getUTCFullYear(),
    });
    const novaSolicitacao = await tx.overtimeRequest.create({
      data: {
        orgaoId: servidor.orgaoId,
        requestNumber,
        requesterUserId: permissao.usuarioId!,
        employeeId: servidor.id,
        organizationalUnitId: lotacaoAtual.unidadeId,
        workUnitId: lotacaoAtual.unidadeId,
        policyVersionId: configuracao.policyVersion!.id,
        workflowVersionId: configuracao.workflowVersion!.id,
        periodStart: parseIsoDateOnly(parsed.data.periodStart),
        periodEnd: parseIsoDateOnly(parsed.data.periodEnd),
        justification: parsed.data.justification,
        activitiesDescription: parsed.data.activitiesDescription,
        paymentDestination: parsed.data.paymentDestination,
        currentLifecycleStatus: submitted ? "SUBMITTED" : "DRAFT",
        currentWorkflowStepCode: submitted ? stepAfterSubmit : null,
        submittedAt: submitted ? now : null,
        days: {
          create: diasData,
        },
        history: {
          create: {
            userId: permissao.usuarioId,
            action: submitted ? "SUBMIT" : "SAVE_DRAFT",
            toStatus: submitted ? "SUBMITTED" : "DRAFT",
            toStepCode: submitted ? stepAfterSubmit : null,
            metadata: {
              policyVersionId: configuracao.policyVersion!.id,
              workflowVersionId: configuracao.workflowVersion!.id,
              days: parsed.data.days.length,
            },
          },
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "OvertimeRequest",
        entidadeId: novaSolicitacao.id,
        acao: submitted
          ? "HORAS_EXTRAS_SOLICITACAO_ENVIADA"
          : "HORAS_EXTRAS_SOLICITACAO_RASCUNHO_CRIADO",
        dadosDepois: {
          id: novaSolicitacao.id,
          requestNumber: novaSolicitacao.requestNumber,
          employeeId: novaSolicitacao.employeeId,
          orgaoId: novaSolicitacao.orgaoId,
          organizationalUnitId: novaSolicitacao.organizationalUnitId,
          status: novaSolicitacao.currentLifecycleStatus,
          currentWorkflowStepCode: novaSolicitacao.currentWorkflowStepCode,
        },
        metadados: {
          permissao: "horas-extras:solicitar:proprio",
          perfilAtivo: permissao.perfilAtivoCodigo,
        },
      },
    });

    return novaSolicitacao;
  });

  revalidatePath("/horas-extras");
  revalidatePath("/horas-extras/nova");
  redirect(`/horas-extras?solicitacao=${request.id}`);
}
