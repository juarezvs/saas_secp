"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { listarAutorizacoesHorasExtrasParaExecucao } from "../../infrastructure/repositories/horas-extras-execucao.repository";
import {
  gerarLoteFolhaHorasExtrasSchema,
  type GerarLoteFolhaHorasExtrasFormState,
  type GerarLoteFolhaHorasExtrasInput,
} from "../schemas/horas-extras-lote-folha.schema";
import { rubricaHorasExtrasPorPercentual } from "../services/horas-extras-folha.service";

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function extrairDados(
  formData: FormData,
): Partial<GerarLoteFolhaHorasExtrasInput> {
  return {
    orgaoId: texto(formData, "orgaoId"),
    competence: texto(formData, "competence"),
  };
}

function competenciaDaData(data: Date) {
  return data.toISOString().slice(0, 7);
}

export async function gerarLoteFolhaHorasExtrasAction(
  _estadoAnterior: GerarLoteFolhaHorasExtrasFormState,
  formData: FormData,
): Promise<GerarLoteFolhaHorasExtrasFormState> {
  const dados = extrairDados(formData);
  const parsed = gerarLoteFolhaHorasExtrasSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os dados do lote.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const permissao = await exigirPermissao("horas-extras:gerar-lote:global");

  if (
    !permissao.perfilAtivoEscopoGlobal &&
    permissao.orgaoIds?.length &&
    !permissao.orgaoIds.includes(parsed.data.orgaoId)
  ) {
    return {
      sucesso: false,
      mensagem: "O órgão selecionado está fora do seu escopo.",
      campos: parsed.data,
    };
  }

  const loteAberto = await prisma.overtimePayrollBatch.findFirst({
    where: {
      orgaoId: parsed.data.orgaoId,
      competence: parsed.data.competence,
      status: {
        in: ["DRAFT", "CALCULATING", "PENDING_REVIEW", "READY_TO_CLOSE"],
      },
    },
  });

  if (loteAberto) {
    return {
      sucesso: false,
      mensagem: "Já existe lote aberto para esta competência e órgão.",
      campos: parsed.data,
    };
  }

  const autorizacoes = await listarAutorizacoesHorasExtrasParaExecucao({
    orgaoIds: [parsed.data.orgaoId],
    escopoGlobal: false,
    limite: 500,
  });
  const linhasPorServidor = new Map<
    string,
    {
      servidor: (typeof autorizacoes)[number]["servidor"];
      linhas: Array<{
        authorizationId: string;
        authorizationDayId: string;
        requestId: string;
        employeeId: string;
        date: Date;
        minutes: number;
        ratePercent: string;
        rubricaCode: string;
        requestNumber: string;
      }>;
    }
  >();

  for (const item of autorizacoes) {
    const diasAutorizacao = new Map(
      item.authorization.days.map((day) => [day.id, day]),
    );

    for (const dia of item.diasExecucao) {
      if (
        competenciaDaData(dia.date) !== parsed.data.competence ||
        dia.executedMinutes <= 0
      ) {
        continue;
      }

      const diaAutorizacao = diasAutorizacao.get(dia.authorizationDayId);

      if (!diaAutorizacao) {
        continue;
      }

      const grupo = linhasPorServidor.get(item.authorization.employeeId) ?? {
        servidor: item.servidor,
        linhas: [],
      };

      grupo.linhas.push({
        authorizationId: item.authorization.id,
        authorizationDayId: dia.authorizationDayId,
        requestId: item.authorization.requestId,
        employeeId: item.authorization.employeeId,
        date: dia.date,
        minutes: dia.executedMinutes,
        ratePercent: diaAutorizacao.ratePercent.toString(),
        rubricaCode: rubricaHorasExtrasPorPercentual(diaAutorizacao.ratePercent),
        requestNumber: item.authorization.request.requestNumber,
      });
      linhasPorServidor.set(item.authorization.employeeId, grupo);
    }
  }

  const grupos = Array.from(linhasPorServidor.entries());

  if (grupos.length === 0) {
    return {
      sucesso: false,
      mensagem: "Não há horas extras executadas para gerar lote nesta competência.",
      campos: parsed.data,
    };
  }

  const totalMinutes = grupos.reduce(
    (total, [, grupo]) =>
      total + grupo.linhas.reduce((subtotal, linha) => subtotal + linha.minutes, 0),
    0,
  );
  const checksum = createHash("sha256")
    .update(
      JSON.stringify(
        grupos.flatMap(([employeeId, grupo]) =>
          grupo.linhas.map((linha) => ({
            employeeId,
            authorizationDayId: linha.authorizationDayId,
            minutes: linha.minutes,
          })),
        ),
      ),
    )
    .digest("hex");

  const batch = await prisma.$transaction(async (tx) => {
    const novoBatch = await tx.overtimePayrollBatch.create({
      data: {
        orgaoId: parsed.data.orgaoId,
        competence: parsed.data.competence,
        status: "PENDING_REVIEW",
        filters: {
          competence: parsed.data.competence,
          orgaoId: parsed.data.orgaoId,
        },
        totalEmployees: grupos.length,
        totalMinutes,
        totalAmount: 0,
        checksum,
        createdByUserId: permissao.usuarioId ?? null,
      },
    });

    for (const [employeeId, grupo] of grupos) {
      const minutosServidor = grupo.linhas.reduce(
        (total, linha) => total + linha.minutes,
        0,
      );
      const batchEmployee = await tx.overtimePayrollBatchEmployee.create({
        data: {
          batchId: novoBatch.id,
          employeeId,
          registration: grupo.servidor?.matricula ?? null,
          employeeName: grupo.servidor?.nome ?? null,
          organizationalUnitLabel: grupo.servidor?.unidade ?? null,
          totalMinutes: minutosServidor,
          totalAmount: 0,
          metadata: {
            orgao: grupo.servidor?.orgao ?? null,
          },
        },
      });

      await tx.overtimePayrollBatchLine.createMany({
        data: grupo.linhas.map((linha) => ({
          batchId: novoBatch.id,
          batchEmployeeId: batchEmployee.id,
          authorizationId: linha.authorizationId,
          authorizationDayId: linha.authorizationDayId,
          requestId: linha.requestId,
          employeeId: linha.employeeId,
          date: linha.date,
          competence: parsed.data.competence,
          minutes: linha.minutes,
          ratePercent: linha.ratePercent,
          amount: 0,
          rubricaCode: linha.rubricaCode,
          metadata: {
            requestNumber: linha.requestNumber,
          },
        })),
      });
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId ?? null,
        entidade: "OvertimePayrollBatch",
        entidadeId: novoBatch.id,
        acao: "HORAS_EXTRAS_LOTE_FOLHA_GERADO",
        dadosDepois: {
          orgaoId: parsed.data.orgaoId,
          competence: parsed.data.competence,
          totalEmployees: grupos.length,
          totalMinutes,
          checksum,
        },
        metadados: {
          permissao: "horas-extras:gerar-lote:global",
          perfilAtivo: permissao.perfilAtivoCodigo,
        },
      },
    });

    return novoBatch;
  });

  revalidatePath("/folha/horas-extras");
  redirect(`/folha/horas-extras/${batch.id}`);
}
