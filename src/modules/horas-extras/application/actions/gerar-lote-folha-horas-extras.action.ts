"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  gerarLoteFolhaHorasExtrasSchema,
  type GerarLoteFolhaHorasExtrasFormState,
  type GerarLoteFolhaHorasExtrasInput,
} from "../schemas/horas-extras-lote-folha.schema";

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
      mensagem: "O orgao selecionado esta fora do seu escopo.",
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
      mensagem: "Ja existe lote aberto para esta competencia e orgao.",
      campos: parsed.data,
    };
  }

  const calculos = await prisma.horaExtraCalculo.findMany({
    where: {
      competencia: parsed.data.competence,
      status: "CALCULADO",
      autorizacao: {
        orgaoId: parsed.data.orgaoId,
        status: "CALCULADA",
      },
    },
    include: {
      autorizacao: true,
      itens: {
        include: {
          servidorAutorizado: true,
        },
        orderBy: [{ data: "asc" }, { inicio: "asc" }],
      },
    },
    orderBy: {
      calculadoEm: "asc",
    },
  });
  const linhasPorServidor = new Map<
    string,
    {
      servidor: {
        matricula: string;
        nome: string;
        unidade: string | null;
        orgao: string | null;
      };
      linhas: Array<{
        calculoId: string;
        calculoItemId: string;
        authorizationId: string;
        authorizationDayId: string;
        requestId: string;
        employeeId: string;
        date: Date;
        minutes: number;
        ratePercent: string;
        rubricaCode: string;
        amountCentavos: number;
        processoSei: string;
        documentoAutorizacao: string;
      }>;
    }
  >();

  for (const calculo of calculos) {
    for (const item of calculo.itens) {
      const servidorAutorizado = item.servidorAutorizado;
      const grupo = linhasPorServidor.get(servidorAutorizado.servidorId) ?? {
        servidor: {
          matricula: servidorAutorizado.matriculaSnapshot,
          nome: servidorAutorizado.nomeSnapshot,
          unidade: servidorAutorizado.unidadeSnapshot,
          orgao: calculo.autorizacao.orgaoId,
        },
        linhas: [],
      };

      grupo.linhas.push({
        calculoId: calculo.id,
        calculoItemId: item.id,
        authorizationId: calculo.autorizacaoId,
        authorizationDayId: item.classificacaoIntervaloId,
        requestId: calculo.id,
        employeeId: servidorAutorizado.servidorId,
        date: item.data,
        minutes: item.minutos,
        ratePercent: item.percentual.toString(),
        rubricaCode: item.rubrica ?? "",
        amountCentavos: item.valorCentavos,
        processoSei: calculo.autorizacao.processoSei,
        documentoAutorizacao: calculo.autorizacao.documentoAutorizacao,
      });
      linhasPorServidor.set(servidorAutorizado.servidorId, grupo);
    }
  }

  const grupos = Array.from(linhasPorServidor.entries());

  if (grupos.length === 0) {
    return {
      sucesso: false,
      mensagem:
        "Nao ha horas extras calculadas e prontas para lote nesta competencia.",
      campos: parsed.data,
    };
  }

  const totalMinutes = grupos.reduce(
    (total, [, grupo]) =>
      total +
      grupo.linhas.reduce((subtotal, linha) => subtotal + linha.minutes, 0),
    0,
  );
  const totalAmountCentavos = grupos.reduce(
    (total, [, grupo]) =>
      total +
      grupo.linhas.reduce(
        (subtotal, linha) => subtotal + linha.amountCentavos,
        0,
      ),
    0,
  );
  const checksum = createHash("sha256")
    .update(
      JSON.stringify(
        grupos.flatMap(([employeeId, grupo]) =>
          grupo.linhas.map((linha) => ({
            employeeId,
            calculoItemId: linha.calculoItemId,
            minutes: linha.minutes,
            amountCentavos: linha.amountCentavos,
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
          origem: "HORAS_EXTRAS_REENGENHARIA_SECAP",
        },
        totalEmployees: grupos.length,
        totalMinutes,
        totalAmount: totalAmountCentavos / 100,
        checksum,
        createdByUserId: permissao.usuarioId ?? null,
      },
    });

    for (const [employeeId, grupo] of grupos) {
      const minutosServidor = grupo.linhas.reduce(
        (total, linha) => total + linha.minutes,
        0,
      );
      const valorServidorCentavos = grupo.linhas.reduce(
        (total, linha) => total + linha.amountCentavos,
        0,
      );
      const batchEmployee = await tx.overtimePayrollBatchEmployee.create({
        data: {
          batchId: novoBatch.id,
          employeeId,
          registration: grupo.servidor.matricula,
          employeeName: grupo.servidor.nome,
          organizationalUnitLabel: grupo.servidor.unidade,
          totalMinutes: minutosServidor,
          totalAmount: valorServidorCentavos / 100,
          metadata: {
            orgao: grupo.servidor.orgao,
            origem: "HORAS_EXTRAS_REENGENHARIA_SECAP",
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
          amount: linha.amountCentavos / 100,
          rubricaCode: linha.rubricaCode,
          metadata: {
            origem: "HORAS_EXTRAS_REENGENHARIA_SECAP",
            calculoId: linha.calculoId,
            calculoItemId: linha.calculoItemId,
            processoSei: linha.processoSei,
            documentoAutorizacao: linha.documentoAutorizacao,
          },
        })),
      });
    }

    const autorizacaoIds = [
      ...new Set(calculos.map((calculo) => calculo.autorizacaoId)),
    ];

    await tx.autorizacaoHoraExtraAdministrativa.updateMany({
      where: {
        id: {
          in: autorizacaoIds,
        },
      },
      data: {
        status: "PRONTA_PARA_FOLHA",
      },
    });

    await tx.autorizacaoHoraExtraServidor.updateMany({
      where: {
        autorizacaoId: {
          in: autorizacaoIds,
        },
        status: "CALCULADO",
      },
      data: {
        status: "PRONTO_PARA_FOLHA",
      },
    });

    await tx.horaExtraEvento.createMany({
      data: autorizacaoIds.map((autorizacaoId) => ({
        autorizacaoId,
        usuarioId: permissao.usuarioId ?? null,
        acao: "LOTE_FOLHA_GERADO",
        dadosDepois: {
          batchId: novoBatch.id,
          competence: parsed.data.competence,
        },
        metadados: {
          perfilAtivo: permissao.perfilAtivoCodigo,
          origem: "HORAS_EXTRAS_REENGENHARIA_SECAP",
        },
      })),
    });

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
          totalAmountCentavos,
          checksum,
        },
        metadados: {
          permissao: "horas-extras:gerar-lote:global",
          perfilAtivo: permissao.perfilAtivoCodigo,
          origem: "HORAS_EXTRAS_REENGENHARIA_SECAP",
        },
      },
    });

    return novoBatch;
  });

  revalidatePath("/folha/horas-extras");
  revalidatePath("/horas-extras/autorizacoes");
  redirect(`/folha/horas-extras/${batch.id}`);
}
