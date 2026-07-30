"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { usuarioPossuiPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { validarERegistrarProcedimentoFrequencia } from "@/modules/procedimentos-frequencia/application/services/motor-procedimentos-frequencia.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { calcularSaldoBancoHoras } from "../services/calcular-banco-horas.service";

const incluirAjusteManualBancoHorasSchema = z.object({
  servidorId: z.string().uuid(),
  tipo: z.enum(["CREDITO", "DEBITO"]),
  dataReferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horas: z.coerce.number().positive().max(240),
  processoSei: z.string().trim().max(80).optional(),
  atoAutorizativo: z.string().trim().max(160).optional(),
  autoridade: z.string().trim().max(160).optional(),
  justificativa: z.string().trim().min(10).max(2000),
});

function dataReferenciaFromInput(valor: string) {
  return new Date(`${valor}T00:00:00`);
}

function montarDescricaoAjusteManual(params: {
  tipo: "CREDITO" | "DEBITO";
  processoSei?: string;
  atoAutorizativo?: string;
  autoridade?: string;
}) {
  const partes = [
    params.tipo === "CREDITO"
      ? "Credito incluido por ajuste administrativo"
      : "Debito incluido por ajuste administrativo",
  ];

  if (params.processoSei) {
    partes.push(`Processo SEI ${params.processoSei}`);
  }

  if (params.atoAutorizativo) {
    partes.push(params.atoAutorizativo);
  }

  if (params.autoridade) {
    partes.push(`Autoridade: ${params.autoridade}`);
  }

  return `${partes.join(" - ")}.`;
}

async function periodoEstaHomologado(params: {
  servidorId: string;
  dataReferencia: Date;
}) {
  return Boolean(
    await prisma.homologacaoServidorMes.findFirst({
      where: {
        servidorId: params.servidorId,
        status: {
          in: ["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"],
        },
        fechamento: {
          anoReferencia: params.dataReferencia.getUTCFullYear(),
          mesReferencia: params.dataReferencia.getUTCMonth() + 1,
        },
      },
      select: {
        id: true,
      },
    }),
  );
}

export async function incluirAjusteManualBancoHorasAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  if (
    !usuarioPossuiPermissaoNoPerfil(
      session.user.perfilAtivo?.codigo,
      session.user.perfilAtivo?.permissoes,
      "banco-horas:gerenciar:global",
    )
  ) {
    return;
  }

  const parsed = incluirAjusteManualBancoHorasSchema.safeParse({
    servidorId: formData.get("servidorId"),
    tipo: formData.get("tipo"),
    dataReferencia: formData.get("dataReferencia"),
    horas: formData.get("horas"),
    processoSei: String(formData.get("processoSei") ?? "").trim() || undefined,
    atoAutorizativo:
      String(formData.get("atoAutorizativo") ?? "").trim() || undefined,
    autoridade: String(formData.get("autoridade") ?? "").trim() || undefined,
    justificativa: formData.get("justificativa"),
  });

  if (!parsed.success) {
    return;
  }

  const dataReferencia = dataReferenciaFromInput(parsed.data.dataReferencia);
  const anoReferencia = dataReferencia.getFullYear();
  const mesReferencia = dataReferencia.getMonth() + 1;
  const minutos = Math.round(parsed.data.horas * 60);
  const periodoFechado = await periodoEstaHomologado({
    servidorId: parsed.data.servidorId,
    dataReferencia,
  });

  await prisma.$transaction(async (tx) => {
    const procedimento =
      await validarERegistrarProcedimentoFrequencia({
        tx,
        categoria: periodoFechado
          ? "AJUSTE_BANCO_FECHADO"
          : "AJUSTE_BANCO_ABERTO",
        servidorId: parsed.data.servidorId,
        usuarioId: session.user.id,
        permissoesUsuario: session.user.perfilAtivo?.permissoes ?? [],
        dataInicio: dataReferencia,
        dataFim: dataReferencia,
        processoSei: parsed.data.processoSei,
        documentoSei: parsed.data.atoAutorizativo,
        autoridade: parsed.data.autoridade,
        justificativa: parsed.data.justificativa,
        titulo: periodoFechado
          ? "Ajuste administrativo em banco fechado"
          : "Ajuste administrativo em banco aberto",
        impactoMinutos: parsed.data.tipo === "CREDITO" ? minutos : -minutos,
        permitirBancoFechado: periodoFechado,
        exigePermissao: "autorizar",
        exigeRecalculo: !periodoFechado,
        dadosEntrada: {
          origem: "BANCO_HORAS_AJUSTE_MANUAL",
          tipo: parsed.data.tipo,
          dataReferencia,
          minutos,
          periodoFechado,
        },
      });

    const movimento = await tx.movimentoBancoHoras.create({
      data: {
        servidorId: parsed.data.servidorId,
        tipo: parsed.data.tipo,
        origem: "AJUSTE_ADMINISTRATIVO",
        status: "VALIDADO",
        dataReferencia,
        anoReferencia,
        mesReferencia,
        minutos,
        descricao: montarDescricaoAjusteManual(parsed.data),
        observacao: parsed.data.justificativa,
        autorizadoPorUsuarioId: session.user.id,
        autorizadoEm: new Date(),
        metadados: {
          processoSei: parsed.data.processoSei ?? null,
          atoAutorizativo: parsed.data.atoAutorizativo ?? null,
          autoridade: parsed.data.autoridade ?? null,
          justificativa: parsed.data.justificativa,
          origem: "INCLUSAO_MANUAL_ADMINISTRATIVA",
          procedimentoFrequenciaId: procedimento.procedimento.id,
          procedimentoFrequenciaExecucaoId: procedimento.execucao?.id ?? null,
          procedimentoFrequenciaCodigo: procedimento.procedimento.codigo,
          periodoFechado,
        },
      },
    });

    const movimentos = await tx.movimentoBancoHoras.findMany({
      where: {
        servidorId: parsed.data.servidorId,
      },
      orderBy: {
        dataReferencia: "asc",
      },
    });
    const saldoAtual = await tx.bancoHorasSaldo.findUnique({
      where: {
        servidorId: parsed.data.servidorId,
      },
      select: {
        competenciaInicioControle: true,
      },
    });
    const saldo = calcularSaldoBancoHoras(movimentos, {
      competenciaInicioControle: saldoAtual?.competenciaInicioControle,
    });

    await tx.bancoHorasSaldo.upsert({
      where: {
        servidorId: parsed.data.servidorId,
      },
      update: saldo,
      create: {
        servidorId: parsed.data.servidorId,
        ...saldo,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "MovimentoBancoHoras",
        entidadeId: movimento.id,
        acao: "BANCO_HORAS_AJUSTE_MANUAL_INCLUIDO",
        dadosDepois: {
          movimentoId: movimento.id,
          servidorId: parsed.data.servidorId,
          tipo: parsed.data.tipo,
          origem: "AJUSTE_ADMINISTRATIVO",
          status: "VALIDADO",
          dataReferencia,
          anoReferencia,
          mesReferencia,
          minutos,
          saldo,
          processoSei: parsed.data.processoSei ?? null,
          atoAutorizativo: parsed.data.atoAutorizativo ?? null,
          autoridade: parsed.data.autoridade ?? null,
          procedimentoFrequenciaId: procedimento.procedimento.id,
          procedimentoFrequenciaExecucaoId: procedimento.execucao?.id ?? null,
          procedimentoFrequenciaCodigo: procedimento.procedimento.codigo,
          periodoFechado,
        },
      },
    });
  });

  revalidatePath("/banco-horas");
  revalidatePath("/homologacao");
}
