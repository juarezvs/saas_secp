"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/auth";
import type { Prisma } from "@/generated/prisma/client";
import { usuarioPossuiPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import { classificarDiaInstitucional } from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

const tratarPendenciaSchema = z.object({
  movimentoId: z.string().uuid(),
  acao: z.enum([
    "NOTIFICAR_DEBITO",
    "REGISTRAR_DEFESA",
    "ACOLHER_DEFESA",
    "REJEITAR_DEFESA",
    "ENCAMINHAR_FOLHA",
    "REFERENDAR_LIMITE",
  ]),
  justificativa: z.string().trim().max(3000).optional(),
  processoSei: z.string().trim().max(80).optional(),
});

function metadadosComoObjeto(metadados: unknown): Prisma.InputJsonObject {
  if (!metadados || typeof metadados !== "object" || Array.isArray(metadados)) {
    return {};
  }

  return JSON.parse(JSON.stringify(metadados)) as Prisma.InputJsonObject;
}

async function adicionarDiasUteis(data: Date, dias: number) {
  const resultado = new Date(data);
  resultado.setUTCHours(0, 0, 0, 0);
  let adicionados = 0;

  while (adicionados < dias) {
    resultado.setUTCDate(resultado.getUTCDate() + 1);
    const classificacao = await classificarDiaInstitucional(resultado);

    if (classificacao.contaComoDiaUtil) {
      adicionados += 1;
    }
  }

  return resultado;
}

async function usuarioPodeAtuar(params: {
  usuarioId: string;
  perfilCodigo?: string | null;
  permissoes?: string[];
  servidorId: string;
  acao: z.infer<typeof tratarPendenciaSchema>["acao"];
}) {
  const { usuarioId, perfilCodigo, permissoes = [], servidorId, acao } = params;

  if (
    usuarioPossuiPermissaoNoPerfil(
      perfilCodigo,
      permissoes,
      "banco-horas:gerenciar:global",
    )
  ) {
    return true;
  }

  const servidor = await prisma.servidor.findUnique({
    where: {
      id: servidorId,
    },
    select: {
      usuarioId: true,
      lotacoes: {
        where: {
          status: "ATIVO",
        },
        select: {
          unidadeId: true,
        },
        take: 1,
      },
    },
  });

  if (acao === "REGISTRAR_DEFESA") {
    return servidor?.usuarioId === usuarioId;
  }

  if (
    !usuarioPossuiPermissaoNoPerfil(
      perfilCodigo,
      permissoes,
      "banco-horas:consultar:chefia",
    ) &&
    perfilCodigo?.toUpperCase() !== "CHEFIA"
  ) {
    return false;
  }

  const unidades = await listarIdsUnidadesSubordinadasPorUsuario(usuarioId);
  const unidadeServidor = servidor?.lotacoes[0]?.unidadeId;

  return Boolean(unidadeServidor && unidades.includes(unidadeServidor));
}

export async function tratarPendenciaBancoHorasAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const parsed = tratarPendenciaSchema.safeParse({
    movimentoId: formData.get("movimentoId"),
    acao: formData.get("acao"),
    justificativa: formData.get("justificativa") || undefined,
    processoSei: formData.get("processoSei") || undefined,
  });

  if (!parsed.success) {
    return;
  }

  const movimento = await prisma.movimentoBancoHoras.findUnique({
    where: {
      id: parsed.data.movimentoId,
    },
    select: {
      id: true,
      servidorId: true,
      tipo: true,
      status: true,
      minutos: true,
      dataReferencia: true,
      expiraEm: true,
      anoReferencia: true,
      mesReferencia: true,
      metadados: true,
    },
  });

  if (!movimento) {
    return;
  }

  const permitido = await usuarioPodeAtuar({
    usuarioId: session.user.id,
    perfilCodigo: session.user.perfilAtivo?.codigo,
    permissoes: session.user.perfilAtivo?.permissoes,
    servidorId: movimento.servidorId,
    acao: parsed.data.acao,
  });

  if (!permitido) {
    redirect("/acesso-negado?permissao=banco-horas");
  }

  const agora = new Date();
  const metadados = metadadosComoObjeto(movimento.metadados);
  const justificativa = parsed.data.justificativa ?? "";

  await prisma.$transaction(async (tx) => {
    if (parsed.data.acao === "NOTIFICAR_DEBITO") {
      if (movimento.tipo !== "DEBITO") return;
      const prazoDefesaEm = await adicionarDiasUteis(agora, 2);

      await tx.movimentoBancoHoras.update({
        where: { id: movimento.id },
        data: {
          metadados: {
            ...metadados,
            defesaDebito: {
              status: "AGUARDANDO_DEFESA",
              notificadoEm: agora.toISOString(),
              notificadoPorUsuarioId: session.user.id,
              prazoDefesaEm: prazoDefesaEm.toISOString(),
              justificativaChefia: justificativa,
            },
          },
        },
      });
    }

    if (parsed.data.acao === "REGISTRAR_DEFESA") {
      if (movimento.tipo !== "DEBITO") return;

      await tx.movimentoBancoHoras.update({
        where: { id: movimento.id },
        data: {
          metadados: {
            ...metadados,
            defesaDebito: {
              ...(metadados.defesaDebito as Prisma.InputJsonObject | undefined),
              status: "DEFESA_APRESENTADA",
              defesaApresentadaEm: agora.toISOString(),
              defesaUsuarioId: session.user.id,
              defesa: justificativa,
            },
          },
        },
      });
    }

    if (parsed.data.acao === "ACOLHER_DEFESA" || parsed.data.acao === "REJEITAR_DEFESA") {
      if (movimento.tipo !== "DEBITO") return;

      await tx.movimentoBancoHoras.update({
        where: { id: movimento.id },
        data: {
          metadados: {
            ...metadados,
            defesaDebito: {
              ...(metadados.defesaDebito as Prisma.InputJsonObject | undefined),
              status:
                parsed.data.acao === "ACOLHER_DEFESA"
                  ? "DEFESA_ACOLHIDA"
                  : "DEFESA_REJEITADA",
              analisadoEm: agora.toISOString(),
              analisadoPorUsuarioId: session.user.id,
              decisao: justificativa,
            },
          },
        },
      });
    }

    if (parsed.data.acao === "ENCAMINHAR_FOLHA") {
      if (movimento.tipo !== "DEBITO") return;

      await tx.movimentoBancoHoras.update({
        where: { id: movimento.id },
        data: {
          status: "EXPIRADO",
          observacao:
            "Débito não compensado no prazo regulamentar e encaminhado para providência de desconto em folha.",
          metadados: {
            ...metadados,
            descontoFolha: {
              status: "ENCAMINHADO",
              encaminhadoEm: agora.toISOString(),
              encaminhadoPorUsuarioId: session.user.id,
              processoSei: parsed.data.processoSei ?? null,
              justificativa,
            },
          },
        },
      });
    }

    if (parsed.data.acao === "REFERENDAR_LIMITE") {
      if (movimento.tipo !== "HORAS_ACIMA_LIMITE") return;

      await tx.movimentoBancoHoras.update({
        where: { id: movimento.id },
        data: {
          metadados: {
            ...metadados,
            referendoDiref: {
              status: "REFERENDADO",
              referendadoEm: agora.toISOString(),
              referendadoPorUsuarioId: session.user.id,
              processoSei: parsed.data.processoSei ?? null,
              justificativa,
            },
          },
        },
      });

      await tx.movimentoBancoHoras.create({
        data: {
          servidorId: movimento.servidorId,
          tipo: "CREDITO",
          origem: "AJUSTE_ADMINISTRATIVO",
          status: "PENDENTE",
          dataReferencia: movimento.dataReferencia,
          mesReferencia: movimento.mesReferencia,
          anoReferencia: movimento.anoReferencia,
          minutos: movimento.minutos,
          expiraEm: movimento.expiraEm,
          autorizadoPorUsuarioId: session.user.id,
          autorizadoEm: agora,
          descricao:
            "Crédito excepcional incluído por referendo da Direção do Foro para horas acima do limite ordinário.",
          metadados: {
            movimentoOrigemId: movimento.id,
            referendoDiref: {
              status: "REFERENDADO",
              processoSei: parsed.data.processoSei ?? null,
              justificativa,
            },
          },
        },
      });
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "MovimentoBancoHoras",
        entidadeId: movimento.id,
        acao: `BANCO_HORAS_${parsed.data.acao}`,
        dadosDepois: {
          movimentoId: movimento.id,
          servidorId: movimento.servidorId,
          acao: parsed.data.acao,
          justificativa,
          processoSei: parsed.data.processoSei ?? null,
        },
      },
    });
  });

  revalidatePath("/banco-horas");
  revalidatePath("/banco-horas/chefia");
  revalidatePath("/banco-horas/vencimentos");
  revalidatePath("/homologacao");
}
