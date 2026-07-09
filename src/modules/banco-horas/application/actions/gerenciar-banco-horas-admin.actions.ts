"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import {
  obterPermissoesDaSessao,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { calcularSaldoBancoHoras } from "@/modules/banco-horas/application/services/calcular-banco-horas.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

const DESCRICAO_SALDO_INICIAL_CREDITO =
  "Saldo inicial positivo importado na implantação do banco de horas.";
const DESCRICAO_SALDO_INICIAL_DEBITO =
  "Saldo inicial negativo importado na implantação do banco de horas.";

const configurarBancoHorasServidorSchema = z.object({
  servidorId: z.string().uuid(),
  competenciaInicioControle: z.string().regex(/^\d{4}-\d{2}$/),
  saldoInicialCreditoHoras: z.coerce.number().min(0).max(9999),
  saldoInicialDebitoHoras: z.coerce.number().min(0).max(9999),
  processoSei: z.string().trim().max(80).optional(),
  atoAutorizativo: z.string().trim().max(160).optional(),
  justificativa: z.string().trim().min(10).max(2000),
});

const transferirSaldoBancoHorasSchema = z.object({
  servidorId: z.string().uuid(),
  tipo: z.enum(["CREDITO", "DEBITO"]),
  expiraAte: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  novaExpiracao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  processoSei: z.string().trim().max(80).optional(),
  decisaoDiretorForo: z.string().trim().min(3).max(160),
  justificativa: z.string().trim().min(10).max(2000),
});

function dataUtc(valor: string) {
  const [ano, mes, dia] = valor.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function dataInicioCompetencia(competencia: string) {
  return dataUtc(`${competencia}-01`);
}

function competenciaPartes(competencia: string) {
  const [anoReferencia, mesReferencia] = competencia.split("-").map(Number);
  return { anoReferencia, mesReferencia };
}

function horasParaMinutos(horas: number) {
  return Math.round(horas * 60);
}

async function exigirGestaoBancoHoras(servidorId: string) {
  const [permissao, escopo, servidor] = await Promise.all([
    obterPermissoesDaSessao(),
    obterEscopoOrgaoDaSessao(),
    prisma.servidor.findUnique({
      where: { id: servidorId },
      select: { id: true, orgaoId: true },
    }),
  ]);

  if (
    !permissao.permitido ||
    !usuarioPossuiPermissaoNoPerfil(
      permissao.perfilAtivoCodigo,
      permissao.permissoes,
      "banco-horas:gerenciar:global",
    ) ||
    !servidor
  ) {
    return null;
  }

  if (!escopo.global && !escopo.orgaoIds.includes(servidor.orgaoId)) {
    return null;
  }

  return permissao;
}

export async function configurarBancoHorasServidorAction(formData: FormData) {
  const parsed = configurarBancoHorasServidorSchema.safeParse({
    servidorId: formData.get("servidorId"),
    competenciaInicioControle: formData.get("competenciaInicioControle"),
    saldoInicialCreditoHoras: formData.get("saldoInicialCreditoHoras"),
    saldoInicialDebitoHoras: formData.get("saldoInicialDebitoHoras"),
    processoSei: String(formData.get("processoSei") ?? "").trim() || undefined,
    atoAutorizativo:
      String(formData.get("atoAutorizativo") ?? "").trim() || undefined,
    justificativa: formData.get("justificativa"),
  });

  if (!parsed.success) {
    return;
  }

  const permissao = await exigirGestaoBancoHoras(parsed.data.servidorId);

  if (!permissao?.usuarioId) {
    return;
  }

  const dataReferencia = dataInicioCompetencia(
    parsed.data.competenciaInicioControle,
  );
  const { anoReferencia, mesReferencia } = competenciaPartes(
    parsed.data.competenciaInicioControle,
  );
  const saldoInicialCreditoMinutos = horasParaMinutos(
    parsed.data.saldoInicialCreditoHoras,
  );
  const saldoInicialDebitoMinutos = horasParaMinutos(
    parsed.data.saldoInicialDebitoHoras,
  );

  await prisma.$transaction(async (tx) => {
    await tx.movimentoBancoHoras.deleteMany({
      where: {
        servidorId: parsed.data.servidorId,
        origem: "IMPORTACAO",
        descricao: {
          in: [
            DESCRICAO_SALDO_INICIAL_CREDITO,
            DESCRICAO_SALDO_INICIAL_DEBITO,
          ],
        },
      },
    });

    const dadosComuns = {
      servidorId: parsed.data.servidorId,
      origem: "IMPORTACAO" as const,
      status: "VALIDADO" as const,
      dataReferencia,
      anoReferencia,
      mesReferencia,
      autorizadoPorUsuarioId: permissao.usuarioId,
      autorizadoEm: new Date(),
      expiraEm: null,
      observacao: parsed.data.justificativa,
      metadados: {
        origem: "IMPLANTACAO_BANCO_HORAS",
        competenciaInicioControle: parsed.data.competenciaInicioControle,
        processoSei: parsed.data.processoSei ?? null,
        atoAutorizativo: parsed.data.atoAutorizativo ?? null,
        justificativa: parsed.data.justificativa,
      },
    };

    if (saldoInicialCreditoMinutos > 0) {
      await tx.movimentoBancoHoras.create({
        data: {
          ...dadosComuns,
          tipo: "CREDITO",
          minutos: saldoInicialCreditoMinutos,
          descricao: DESCRICAO_SALDO_INICIAL_CREDITO,
        },
      });
    }

    if (saldoInicialDebitoMinutos > 0) {
      await tx.movimentoBancoHoras.create({
        data: {
          ...dadosComuns,
          tipo: "DEBITO",
          minutos: saldoInicialDebitoMinutos,
          descricao: DESCRICAO_SALDO_INICIAL_DEBITO,
        },
      });
    }

    const movimentos = await tx.movimentoBancoHoras.findMany({
      where: {
        servidorId: parsed.data.servidorId,
      },
      orderBy: {
        dataReferencia: "asc",
      },
    });
    const saldo = calcularSaldoBancoHoras(movimentos, {
      competenciaInicioControle: parsed.data.competenciaInicioControle,
    });

    await tx.bancoHorasSaldo.upsert({
      where: {
        servidorId: parsed.data.servidorId,
      },
      update: {
        ...saldo,
        saldoInicialCreditoMinutos,
        saldoInicialDebitoMinutos,
        competenciaInicioControle: parsed.data.competenciaInicioControle,
      },
      create: {
        servidorId: parsed.data.servidorId,
        ...saldo,
        saldoInicialCreditoMinutos,
        saldoInicialDebitoMinutos,
        competenciaInicioControle: parsed.data.competenciaInicioControle,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "BancoHorasSaldo",
        entidadeId: parsed.data.servidorId,
        acao: "BANCO_HORAS_PARAMETROS_INICIAIS_ATUALIZADOS",
        dadosDepois: {
          servidorId: parsed.data.servidorId,
          competenciaInicioControle: parsed.data.competenciaInicioControle,
          saldoInicialCreditoMinutos,
          saldoInicialDebitoMinutos,
          saldo,
          processoSei: parsed.data.processoSei ?? null,
          atoAutorizativo: parsed.data.atoAutorizativo ?? null,
        },
      },
    });
  });

  revalidatePath("/administracao/banco-horas");
  revalidatePath(`/administracao/banco-horas/${parsed.data.servidorId}`);
  revalidatePath("/banco-horas");
}

export async function transferirSaldoBancoHorasAction(formData: FormData) {
  const parsed = transferirSaldoBancoHorasSchema.safeParse({
    servidorId: formData.get("servidorId"),
    tipo: formData.get("tipo"),
    expiraAte: formData.get("expiraAte"),
    novaExpiracao: formData.get("novaExpiracao"),
    processoSei: String(formData.get("processoSei") ?? "").trim() || undefined,
    decisaoDiretorForo: formData.get("decisaoDiretorForo"),
    justificativa: formData.get("justificativa"),
  });

  if (!parsed.success) {
    return;
  }

  const permissao = await exigirGestaoBancoHoras(parsed.data.servidorId);

  if (!permissao?.usuarioId) {
    return;
  }

  const expiraAte = dataUtc(parsed.data.expiraAte);
  const novaExpiracao = dataUtc(parsed.data.novaExpiracao);

  if (novaExpiracao <= expiraAte) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const movimentos = await tx.movimentoBancoHoras.findMany({
      where: {
        servidorId: parsed.data.servidorId,
        tipo: parsed.data.tipo,
        status: {
          in: ["PENDENTE", "VALIDADO", "EXPIRADO"],
        },
        expiraEm: {
          not: null,
          lte: expiraAte,
        },
      },
      orderBy: {
        expiraEm: "asc",
      },
    });

    for (const movimento of movimentos) {
      await tx.movimentoBancoHoras.update({
        where: {
          id: movimento.id,
        },
        data: {
          status: "VALIDADO",
          expiraEm: novaExpiracao,
          observacao: [
            movimento.observacao,
            `Saldo transferido para competência futura por decisão ${parsed.data.decisaoDiretorForo}.`,
          ]
            .filter(Boolean)
            .join("\n\n"),
          metadados: {
            ...(movimento.metadados &&
            typeof movimento.metadados === "object" &&
            !Array.isArray(movimento.metadados)
              ? movimento.metadados
              : {}),
            transferenciaSaldo: {
              usuarioId: permissao.usuarioId,
              processadoEm: new Date().toISOString(),
              expiraAte: parsed.data.expiraAte,
              novaExpiracao: parsed.data.novaExpiracao,
              processoSei: parsed.data.processoSei ?? null,
              decisaoDiretorForo: parsed.data.decisaoDiretorForo,
              justificativa: parsed.data.justificativa,
            },
          },
        },
      });
    }

    const saldoAtual = await tx.bancoHorasSaldo.findUnique({
      where: {
        servidorId: parsed.data.servidorId,
      },
      select: {
        competenciaInicioControle: true,
      },
    });
    const saldo = calcularSaldoBancoHoras(
      await tx.movimentoBancoHoras.findMany({
        where: {
          servidorId: parsed.data.servidorId,
        },
        orderBy: {
          dataReferencia: "asc",
        },
      }),
      {
        competenciaInicioControle: saldoAtual?.competenciaInicioControle,
      },
    );

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
        usuarioId: permissao.usuarioId,
        entidade: "BancoHoras",
        entidadeId: parsed.data.servidorId,
        acao: "BANCO_HORAS_SALDO_TRANSFERIDO_MESES_FUTUROS",
        dadosDepois: {
          servidorId: parsed.data.servidorId,
          tipo: parsed.data.tipo,
          expiraAte: parsed.data.expiraAte,
          novaExpiracao: parsed.data.novaExpiracao,
          movimentos: movimentos.map((movimento) => ({
            id: movimento.id,
            minutos: movimento.minutos,
            statusAnterior: movimento.status,
            expiraEmAnterior: movimento.expiraEm,
          })),
          totalMinutos: movimentos.reduce(
            (total, movimento) => total + movimento.minutos,
            0,
          ),
          saldo,
          processoSei: parsed.data.processoSei ?? null,
          decisaoDiretorForo: parsed.data.decisaoDiretorForo,
        },
      },
    });
  });

  revalidatePath("/administracao/banco-horas");
  revalidatePath(`/administracao/banco-horas/${parsed.data.servidorId}`);
  revalidatePath("/banco-horas");
}
