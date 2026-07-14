"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { buscarEventoCalendarioInstitucionalPorId } from "../../infrastructure/repositories/calendario-institucional.repository";
import { enfileirarReflexosCalendarioInstitucional } from "../queues/calendario-institucional-queue";

function revalidarRotasRelacionadas() {
  revalidatePath("/administracao");
  revalidatePath("/administracao/calendario");
  revalidatePath("/homologacao");
  revalidatePath("/boletim-frequencia");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");
  revalidatePath("/relatorios");
}

export async function excluirCalendarioInstitucionalAction(calendarioId: string) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "configuracoes:gerenciar:global",
  );
  const evento = await buscarEventoCalendarioInstitucionalPorId(calendarioId);

  if (!evento) {
    notFound();
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "CalendarioInstitucional",
        entidadeId: evento.id,
        acao: "CALENDARIO_INSTITUCIONAL_EXCLUIDO",
        dadosAntes: evento,
      },
    });

    await tx.calendarioInstitucional.delete({
      where: {
        id: evento.id,
      },
    });
  });

  await enfileirarReflexosCalendarioInstitucional({
    calendarioId: evento.id,
    datasReferencia: [
      evento.dataReferencia,
      ...(evento.dataOriginal ? [evento.dataOriginal] : []),
    ],
    usuarioIdAuditoria: permissao.usuarioId,
    calendarioEscopo: {
      abrangencia: evento.abrangencia,
      uf: evento.uf,
      municipio: evento.municipio,
      municipioIbge: evento.municipioIbge,
      orgaoId: evento.orgaoId,
      unidadeId: evento.unidadeId,
    },
  });

  revalidarRotasRelacionadas();
  redirect("/administracao/calendario");
}

export async function excluirCalendariosInstitucionaisAction(formData: FormData) {
  const permissao = await exigirPermissaoOuRedirecionar(
    "configuracoes:gerenciar:global",
  );
  const ids = formData
    .getAll("calendarioId")
    .map((id) => String(id))
    .filter(Boolean);
  const redirectTo =
    String(formData.get("redirectTo") ?? "") || "/administracao/calendario";

  if (ids.length === 0) {
    redirect(redirectTo);
  }

  const eventos = await prisma.calendarioInstitucional.findMany({
    where: { id: { in: ids } },
  });

  if (eventos.length === 0) {
    redirect(redirectTo);
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditoriaEvento.createMany({
      data: eventos.map((evento) => ({
        usuarioId: permissao.usuarioId,
        entidade: "CalendarioInstitucional",
        entidadeId: evento.id,
        acao: "CALENDARIO_INSTITUCIONAL_EXCLUIDO",
        dadosAntes: evento,
      })),
    });

    await tx.calendarioInstitucional.deleteMany({
      where: { id: { in: eventos.map((evento) => evento.id) } },
    });
  });

  await Promise.all(
    eventos.map((evento) =>
      enfileirarReflexosCalendarioInstitucional({
        calendarioId: evento.id,
        datasReferencia: [
          evento.dataReferencia,
          ...(evento.dataOriginal ? [evento.dataOriginal] : []),
        ],
        usuarioIdAuditoria: permissao.usuarioId,
        calendarioEscopo: {
          abrangencia: evento.abrangencia,
          uf: evento.uf,
          municipio: evento.municipio,
          municipioIbge: evento.municipioIbge,
          orgaoId: evento.orgaoId,
          unidadeId: evento.unidadeId,
        },
      }),
    ),
  );

  revalidarRotasRelacionadas();
  redirect(redirectTo);
}
