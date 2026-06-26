"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import { perfilEhAdministradorSistema } from "@/modules/auth/domain/constants/perfis-sistema";
import { recalcularDiaServidorService } from "@/modules/recalculo/application/services/recalcular-dia-servidor.service";
import { regerarBancoHorasMesService } from "@/modules/recalculo/application/services/regerar-banco-horas-mes.service";
import { resolverFusoHorarioServidorNoBanco } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { listarDatasImpactadasSolicitacao } from "../services/periodo-solicitacao.service";

function obterDatasImpactadasFallback(solicitacao: {
  dataReferencia: Date | null;
  dataInicio: Date | null;
  dataFim: Date | null;
  criadoEm: Date;
}) {
  if (solicitacao.dataReferencia) {
    return [normalizarDataReferencia(solicitacao.dataReferencia)];
  }

  if (solicitacao.dataInicio) {
    return [normalizarDataReferencia(solicitacao.dataInicio)];
  }

  if (solicitacao.dataFim) {
    return [normalizarDataReferencia(solicitacao.dataFim)];
  }

  return [normalizarDataReferencia(solicitacao.criadoEm)];
}

function competenciasDasDatas(datas: Date[]) {
  const competencias = new Map<
    string,
    { anoReferencia: number; mesReferencia: number }
  >();

  for (const data of datas) {
    const anoReferencia = data.getUTCFullYear();
    const mesReferencia = data.getUTCMonth() + 1;
    competencias.set(`${anoReferencia}-${mesReferencia}`, {
      anoReferencia,
      mesReferencia,
    });
  }

  return Array.from(competencias.values());
}

function metadadosContemSolicitacao(
  metadados: unknown,
  solicitacaoId: string,
) {
  return (
    metadados &&
    typeof metadados === "object" &&
    (metadados as { solicitacaoId?: unknown }).solicitacaoId === solicitacaoId
  );
}

export async function excluirSolicitacaoAction(solicitacaoId: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Sessao expirada. Faca login novamente.");
  }

  if (!perfilEhAdministradorSistema(session.user.perfilAtivo)) {
    throw new Error("Apenas o Administrador do Sistema pode excluir solicitacoes.");
  }

  const solicitacao = await prisma.solicitacao.findUnique({
    where: { id: solicitacaoId },
    include: {
      autorizacaoBancoHoras: {
        include: {
          movimentos: true,
        },
      },
      eventos: true,
    },
  });

  if (!solicitacao) {
    redirect("/solicitacoes");
  }

  const fusoHorario = await resolverFusoHorarioServidorNoBanco({
    servidorId: solicitacao.servidorId,
    dataReferencia:
      solicitacao.dataReferencia ??
      solicitacao.dataInicio ??
      solicitacao.dataFim ??
      solicitacao.criadoEm,
  });
  const datasCalculadas = listarDatasImpactadasSolicitacao(
    solicitacao,
    fusoHorario,
  );
  const datasImpactadas =
    datasCalculadas.length > 0
      ? datasCalculadas
      : obterDatasImpactadasFallback(solicitacao);
  const competencias = competenciasDasDatas(datasImpactadas);
  const marcacoesCandidatas = await prisma.marcacao.findMany({
    where: {
      servidorId: solicitacao.servidorId,
      fonte: "MANUAL_ADMINISTRATIVO",
      status: "AJUSTADA",
      OR: [
        {
          observacao: {
            contains: solicitacao.id,
          },
        },
        ...datasImpactadas.map((dataReferencia) => ({ dataReferencia })),
      ],
    },
    select: {
      id: true,
      dataReferencia: true,
      observacao: true,
      metadados: true,
    },
  });
  const marcacoesGeradasPelaSolicitacao = marcacoesCandidatas.filter(
    (marcacao) =>
      metadadosContemSolicitacao(marcacao.metadados, solicitacao.id) ||
      marcacao.observacao?.includes(solicitacao.id),
  );

  await prisma.$transaction(async (tx) => {
    if (solicitacao.autorizacaoBancoHoras) {
      await tx.movimentoBancoHoras.deleteMany({
        where: {
          autorizacaoBancoHorasId: solicitacao.autorizacaoBancoHoras.id,
        },
      });
    }

    if (marcacoesGeradasPelaSolicitacao.length > 0) {
      await tx.marcacao.deleteMany({
        where: {
          id: {
            in: marcacoesGeradasPelaSolicitacao.map((marcacao) => marcacao.id),
          },
        },
      });
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "Solicitacao",
        entidadeId: solicitacao.id,
        acao: "SOLICITACAO_EXCLUIDA_ADMIN",
        dadosAntes: {
          solicitacao,
          marcacoesExcluidas: marcacoesGeradasPelaSolicitacao,
          datasImpactadas,
          competencias,
        },
      },
    });

    await tx.solicitacao.delete({
      where: {
        id: solicitacao.id,
      },
    });
  });

  for (const dataReferencia of datasImpactadas) {
    await recalcularDiaServidorService({
      servidorId: solicitacao.servidorId,
      dataReferencia,
      usuarioIdAuditoria: session.user.id,
      origem: "SOLICITACAO_EXCLUIDA_ADMIN",
      ignorarBloqueioHomologacao: true,
    });
  }

  for (const competencia of competencias) {
    await regerarBancoHorasMesService({
      servidorId: solicitacao.servidorId,
      ...competencia,
      usuarioIdAuditoria: session.user.id,
      origem: "SOLICITACAO_EXCLUIDA_ADMIN",
    });
  }

  revalidatePath("/solicitacoes");
  revalidatePath("/marcacoes");
  revalidatePath("/apuracao");
  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");

  for (const competencia of competencias) {
    revalidatePath(
      `/espelho-ponto?servidorId=${solicitacao.servidorId}&competencia=${competencia.anoReferencia}-${String(
        competencia.mesReferencia,
      ).padStart(2, "0")}`,
    );
  }

  redirect("/solicitacoes");
}
