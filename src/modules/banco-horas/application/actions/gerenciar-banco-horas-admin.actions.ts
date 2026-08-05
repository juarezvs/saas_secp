"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import {
  obterPermissoesDaSessao,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { calcularSaldoBancoHoras } from "@/modules/banco-horas/application/services/calcular-banco-horas.service";
import type { Prisma } from "@/generated/prisma/client";
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

const configurarBancoHorasLoteSchema = z
  .object({
    escopoTipo: z.enum(["SERVIDOR", "UNIDADE", "ORGAO"]),
    servidorId: z.string().uuid().optional(),
    unidadeId: z.string().uuid().optional(),
    orgaoId: z.string().uuid().optional(),
    incluirSubunidades: z.coerce.boolean().optional(),
    competenciaInicioControle: z.string().regex(/^\d{4}-\d{2}$/),
    saldoInicialCreditoHoras: z.coerce.number().min(0).max(9999),
    saldoInicialDebitoHoras: z.coerce.number().min(0).max(9999),
    zerarMovimentosAnteriores: z.coerce.boolean().optional(),
    processoSei: z.string().trim().max(80).optional(),
    atoAutorizativo: z.string().trim().max(160).optional(),
    justificativa: z.string().trim().min(10).max(2000),
    confirmacao: z.string().trim(),
  })
  .superRefine((dados, ctx) => {
    if (dados.escopoTipo === "SERVIDOR" && !dados.servidorId) {
      ctx.addIssue({
        code: "custom",
        path: ["servidorId"],
        message: "Servidor obrigatório.",
      });
    }

    if (dados.escopoTipo === "UNIDADE" && !dados.unidadeId) {
      ctx.addIssue({
        code: "custom",
        path: ["unidadeId"],
        message: "Unidade obrigatória.",
      });
    }

    if (dados.escopoTipo === "ORGAO" && !dados.orgaoId) {
      ctx.addIssue({
        code: "custom",
        path: ["orgaoId"],
        message: "Seccional obrigatória.",
      });
    }

    if (dados.confirmacao !== "CONFIRMAR") {
      ctx.addIssue({
        code: "custom",
        path: ["confirmacao"],
        message: "Confirmação inválida.",
      });
    }
  });

export type BancoHorasLoteActionState = {
  status: "idle" | "erro" | "sucesso";
  mensagem: string;
  totalServidores?: number;
};

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

async function exigirGestaoBancoHorasGlobal() {
  const [permissao, escopo] = await Promise.all([
    obterPermissoesDaSessao(),
    obterEscopoOrgaoDaSessao(),
  ]);

  if (
    !permissao.permitido ||
    !usuarioPossuiPermissaoNoPerfil(
      permissao.perfilAtivoCodigo,
      permissao.permissoes,
      "banco-horas:gerenciar:global",
    ) ||
    !permissao.usuarioId
  ) {
    return null;
  }

  return { ...permissao, escopo };
}

function metadadosComoObjeto(
  metadados: Prisma.JsonValue | null,
): Prisma.JsonObject {
  if (
    !metadados ||
    typeof metadados !== "object" ||
    Array.isArray(metadados)
  ) {
    return {};
  }

  return metadados;
}

async function listarUnidadesDescendentesTx(
  tx: Prisma.TransactionClient,
  unidadeId: string,
) {
  const ids = new Set([unidadeId]);
  let fronteira = [unidadeId];

  while (fronteira.length > 0) {
    const filhas = await tx.unidadeOrganizacional.findMany({
      where: {
        unidadePaiId: {
          in: fronteira,
        },
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    fronteira = filhas
      .map((unidade) => unidade.id)
      .filter((id) => !ids.has(id));

    for (const id of fronteira) {
      ids.add(id);
    }
  }

  return Array.from(ids);
}

async function listarServidoresEscopoBancoHorasTx(
  tx: Prisma.TransactionClient,
  params: {
    escopoTipo: "SERVIDOR" | "UNIDADE" | "ORGAO";
    servidorId?: string;
    unidadeId?: string;
    orgaoId?: string;
    incluirSubunidades?: boolean;
    orgaoIdsPermitidos?: string[];
  },
) {
  const whereOrgaoPermitido = params.orgaoIdsPermitidos
    ? {
        orgaoId: {
          in: params.orgaoIdsPermitidos,
        },
      }
    : {};

  if (params.escopoTipo === "SERVIDOR") {
    return tx.servidor.findMany({
      where: {
        id: params.servidorId,
        ativo: true,
        ...whereOrgaoPermitido,
      },
      select: {
        id: true,
        orgaoId: true,
      },
    });
  }

  if (params.escopoTipo === "ORGAO") {
    return tx.servidor.findMany({
      where: {
        ativo: true,
        orgaoId: params.orgaoId,
        ...whereOrgaoPermitido,
      },
      select: {
        id: true,
        orgaoId: true,
      },
    });
  }

  const unidadeIds = params.unidadeId
    ? params.incluirSubunidades
      ? await listarUnidadesDescendentesTx(tx, params.unidadeId)
      : [params.unidadeId]
    : [];

  return tx.servidor.findMany({
    where: {
      ativo: true,
      ...whereOrgaoPermitido,
      lotacoes: {
        some: {
          status: "ATIVO",
          unidadeId: {
            in: unidadeIds,
          },
        },
      },
    },
    select: {
      id: true,
      orgaoId: true,
    },
  });
}

async function aplicarParametrosBancoHorasServidorTx(
  tx: Prisma.TransactionClient,
  params: {
    servidorId: string;
    usuarioId: string;
    competenciaInicioControle: string;
    saldoInicialCreditoMinutos: number;
    saldoInicialDebitoMinutos: number;
    processoSei?: string;
    atoAutorizativo?: string;
    justificativa: string;
    zerarMovimentosAnteriores?: boolean;
    contexto?: Prisma.InputJsonObject;
  },
) {
  const dataReferencia = dataInicioCompetencia(params.competenciaInicioControle);
  const { anoReferencia, mesReferencia } = competenciaPartes(
    params.competenciaInicioControle,
  );

  await tx.movimentoBancoHoras.deleteMany({
    where: {
      servidorId: params.servidorId,
      origem: "IMPORTACAO",
      descricao: {
        in: [
          DESCRICAO_SALDO_INICIAL_CREDITO,
          DESCRICAO_SALDO_INICIAL_DEBITO,
        ],
      },
    },
  });

  if (params.zerarMovimentosAnteriores) {
    const movimentosAnteriores = await tx.movimentoBancoHoras.findMany({
      where: {
        servidorId: params.servidorId,
        origem: {
          not: "IMPORTACAO",
        },
        status: {
          in: ["PENDENTE", "VALIDADO", "EXPIRADO"],
        },
        OR: [
          {
            anoReferencia: {
              lt: anoReferencia,
            },
          },
          {
            anoReferencia,
            mesReferencia: {
              lt: mesReferencia,
            },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        observacao: true,
        metadados: true,
      },
    });

    for (const movimento of movimentosAnteriores) {
      await tx.movimentoBancoHoras.update({
        where: {
          id: movimento.id,
        },
        data: {
          status: "DESCONSIDERADO",
          observacao: [
            movimento.observacao,
            `Movimento desconsiderado por marco administrativo do banco de horas em ${params.competenciaInicioControle}.`,
          ]
            .filter(Boolean)
            .join("\n\n"),
          metadados: {
            ...metadadosComoObjeto(movimento.metadados),
            zeramentoAdministrativo: {
              usuarioId: params.usuarioId,
              processadoEm: new Date().toISOString(),
              competenciaInicioControle: params.competenciaInicioControle,
              statusAnterior: movimento.status,
              processoSei: params.processoSei ?? null,
              atoAutorizativo: params.atoAutorizativo ?? null,
              justificativa: params.justificativa,
            },
          },
        },
      });
    }
  }

  const dadosComuns = {
    servidorId: params.servidorId,
    origem: "IMPORTACAO" as const,
    status: "VALIDADO" as const,
    dataReferencia,
    anoReferencia,
    mesReferencia,
    autorizadoPorUsuarioId: params.usuarioId,
    autorizadoEm: new Date(),
    expiraEm: null,
    observacao: params.justificativa,
    metadados: {
      origem: "IMPLANTACAO_BANCO_HORAS",
      competenciaInicioControle: params.competenciaInicioControle,
      processoSei: params.processoSei ?? null,
      atoAutorizativo: params.atoAutorizativo ?? null,
      justificativa: params.justificativa,
      zerarMovimentosAnteriores: params.zerarMovimentosAnteriores ?? false,
      contexto: params.contexto ?? null,
    },
  };

  if (params.saldoInicialCreditoMinutos > 0) {
    await tx.movimentoBancoHoras.create({
      data: {
        ...dadosComuns,
        tipo: "CREDITO",
        minutos: params.saldoInicialCreditoMinutos,
        descricao: DESCRICAO_SALDO_INICIAL_CREDITO,
      },
    });
  }

  if (params.saldoInicialDebitoMinutos > 0) {
    await tx.movimentoBancoHoras.create({
      data: {
        ...dadosComuns,
        tipo: "DEBITO",
        minutos: params.saldoInicialDebitoMinutos,
        descricao: DESCRICAO_SALDO_INICIAL_DEBITO,
      },
    });
  }

  const movimentos = await tx.movimentoBancoHoras.findMany({
    where: {
      servidorId: params.servidorId,
    },
    orderBy: {
      dataReferencia: "asc",
    },
  });
  const saldo = calcularSaldoBancoHoras(movimentos, {
    competenciaInicioControle: params.competenciaInicioControle,
  });

  await tx.bancoHorasSaldo.upsert({
    where: {
      servidorId: params.servidorId,
    },
    update: {
      ...saldo,
      saldoInicialCreditoMinutos: params.saldoInicialCreditoMinutos,
      saldoInicialDebitoMinutos: params.saldoInicialDebitoMinutos,
      competenciaInicioControle: params.competenciaInicioControle,
    },
    create: {
      servidorId: params.servidorId,
      ...saldo,
      saldoInicialCreditoMinutos: params.saldoInicialCreditoMinutos,
      saldoInicialDebitoMinutos: params.saldoInicialDebitoMinutos,
      competenciaInicioControle: params.competenciaInicioControle,
    },
  });

  return saldo;
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

  const usuarioId = permissao.usuarioId;
  const saldoInicialCreditoMinutos = horasParaMinutos(
    parsed.data.saldoInicialCreditoHoras,
  );
  const saldoInicialDebitoMinutos = horasParaMinutos(
    parsed.data.saldoInicialDebitoHoras,
  );

  await prisma.$transaction(async (tx) => {
    const saldo = await aplicarParametrosBancoHorasServidorTx(tx, {
      servidorId: parsed.data.servidorId,
      usuarioId,
      competenciaInicioControle: parsed.data.competenciaInicioControle,
      saldoInicialCreditoMinutos,
      saldoInicialDebitoMinutos,
      processoSei: parsed.data.processoSei,
      atoAutorizativo: parsed.data.atoAutorizativo,
      justificativa: parsed.data.justificativa,
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

export async function configurarBancoHorasLoteAction(
  _estadoAnterior: BancoHorasLoteActionState,
  formData: FormData,
): Promise<BancoHorasLoteActionState> {
  const parsed = configurarBancoHorasLoteSchema.safeParse({
    escopoTipo: formData.get("escopoTipo"),
    servidorId: String(formData.get("servidorId") ?? "").trim() || undefined,
    unidadeId: String(formData.get("unidadeId") ?? "").trim() || undefined,
    orgaoId: String(formData.get("orgaoId") ?? "").trim() || undefined,
    incluirSubunidades: formData.get("incluirSubunidades") === "on",
    competenciaInicioControle: formData.get("competenciaInicioControle"),
    saldoInicialCreditoHoras: formData.get("saldoInicialCreditoHoras"),
    saldoInicialDebitoHoras: formData.get("saldoInicialDebitoHoras"),
    zerarMovimentosAnteriores: formData.get("zerarMovimentosAnteriores") === "on",
    processoSei: String(formData.get("processoSei") ?? "").trim() || undefined,
    atoAutorizativo:
      String(formData.get("atoAutorizativo") ?? "").trim() || undefined,
    justificativa: formData.get("justificativa"),
    confirmacao: formData.get("confirmacao"),
  });

  if (!parsed.success) {
    const primeiraMensagem =
      parsed.error.issues[0]?.message ??
      "Revise os campos obrigatórios antes de aplicar o lote.";

    return {
      status: "erro",
      mensagem:
        primeiraMensagem === "Confirmação inválida."
          ? "Digite CONFIRMAR no campo Confirmação para liberar a aplicação em lote."
          : primeiraMensagem,
    };
  }

  const permissao = await exigirGestaoBancoHorasGlobal();

  if (!permissao?.usuarioId) {
    return {
      status: "erro",
      mensagem: "Usuário sem permissão para gerenciar banco de horas em lote.",
    };
  }

  const usuarioId = permissao.usuarioId;
  const saldoInicialCreditoMinutos = horasParaMinutos(
    parsed.data.saldoInicialCreditoHoras,
  );
  const saldoInicialDebitoMinutos = horasParaMinutos(
    parsed.data.saldoInicialDebitoHoras,
  );

  const totalServidores = await prisma.$transaction(
    async (tx) => {
      const servidores = await listarServidoresEscopoBancoHorasTx(tx, {
        escopoTipo: parsed.data.escopoTipo,
        servidorId: parsed.data.servidorId,
        unidadeId: parsed.data.unidadeId,
        orgaoId: parsed.data.orgaoId,
        incluirSubunidades: parsed.data.incluirSubunidades,
        orgaoIdsPermitidos: permissao.escopo.global
          ? undefined
          : permissao.escopo.orgaoIds,
      });

      if (servidores.length === 0) {
        return 0;
      }

      if (parsed.data.escopoTipo === "ORGAO" && parsed.data.orgaoId) {
        await tx.regulamentacaoPontoOrgao.upsert({
          where: {
            orgaoId: parsed.data.orgaoId,
          },
          update: {
            bancoHorasAtivo: true,
            bancoHorasCompetenciaInicio:
              parsed.data.competenciaInicioControle,
          },
          create: {
            orgaoId: parsed.data.orgaoId,
            bancoHorasAtivo: true,
            bancoHorasCompetenciaInicio:
              parsed.data.competenciaInicioControle,
          },
        });
      }

      const contexto = {
        escopoTipo: parsed.data.escopoTipo,
        servidorId: parsed.data.servidorId ?? null,
        unidadeId: parsed.data.unidadeId ?? null,
        orgaoId: parsed.data.orgaoId ?? null,
        incluirSubunidades: parsed.data.incluirSubunidades ?? false,
      } satisfies Prisma.InputJsonObject;

      const saldos = [];

      for (const servidor of servidores) {
        const saldo = await aplicarParametrosBancoHorasServidorTx(tx, {
          servidorId: servidor.id,
          usuarioId,
          competenciaInicioControle: parsed.data.competenciaInicioControle,
          saldoInicialCreditoMinutos,
          saldoInicialDebitoMinutos,
          processoSei: parsed.data.processoSei,
          atoAutorizativo: parsed.data.atoAutorizativo,
          justificativa: parsed.data.justificativa,
          zerarMovimentosAnteriores: parsed.data.zerarMovimentosAnteriores,
          contexto,
        });

        saldos.push({
          servidorId: servidor.id,
          saldo,
        });
      }

      await tx.auditoriaEvento.create({
        data: {
          usuarioId: permissao.usuarioId,
          entidade: "BancoHorasSaldo",
          entidadeId:
            parsed.data.servidorId ??
            parsed.data.unidadeId ??
            parsed.data.orgaoId ??
            "LOTE",
          acao: "BANCO_HORAS_PARAMETROS_INICIAIS_LOTE_ATUALIZADOS",
          dadosDepois: {
            ...contexto,
            totalServidores: servidores.length,
            competenciaInicioControle: parsed.data.competenciaInicioControle,
            saldoInicialCreditoMinutos,
            saldoInicialDebitoMinutos,
            zerarMovimentosAnteriores:
              parsed.data.zerarMovimentosAnteriores ?? false,
            processoSei: parsed.data.processoSei ?? null,
            atoAutorizativo: parsed.data.atoAutorizativo ?? null,
            servidores: saldos,
          },
        },
      });

      return servidores.length;
    },
    { timeout: 60_000 },
  );

  revalidatePath("/administracao/banco-horas");
  revalidatePath("/banco-horas");

  if (totalServidores === 0) {
    return {
      status: "erro",
      mensagem:
        "Nenhum servidor foi encontrado para o escopo informado. O banco de horas não foi alterado.",
      totalServidores,
    };
  }

  return {
    status: "sucesso",
    mensagem: `Banco de horas atualizado para ${totalServidores} servidor${totalServidores === 1 ? "" : "es"}. ${
      parsed.data.zerarMovimentosAnteriores
        ? "O saldo anterior à competência inicial foi zerado."
        : "O saldo anterior à competência inicial foi preservado."
    }`,
    totalServidores,
  };
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
