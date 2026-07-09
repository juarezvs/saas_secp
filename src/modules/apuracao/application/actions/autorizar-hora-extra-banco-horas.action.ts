"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import { recalcularMesServidorService } from "@/modules/recalculo/application/services/recalcular-mes-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

function parseDataReferencia(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return null;
  }

  const data = new Date(`${texto}T00:00:00.000Z`);
  return Number.isNaN(data.getTime()) ? null : data;
}

function parseTempoAutorizado(formData: FormData) {
  const tempo = String(formData.get("tempoAutorizado") ?? "").trim();

  if (tempo) {
    const match = tempo.match(/^(\d{1,3}):([0-5]\d)$/);

    if (!match) {
      return 0;
    }

    return Number(match[1]) * 60 + Number(match[2]);
  }

  return Number(formData.get("minutos") ?? 0);
}

async function chefiaPodeGerenciarServidor(params: {
  usuarioId: string;
  servidorId: string;
}) {
  const unidadesIds = await listarIdsUnidadesSubordinadasPorUsuario(
    params.usuarioId,
  );

  if (unidadesIds.length === 0) {
    return false;
  }

  const lotacao = await prisma.lotacao.findFirst({
    where: {
      servidorId: params.servidorId,
      status: "ATIVO",
      unidadeId: {
        in: unidadesIds,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(lotacao);
}

export async function autorizarHoraExtraBancoHorasAction(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    return;
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];
  const perfilCodigo = session.user.perfilAtivo?.codigo;
  const podeGerenciarGlobal = usuarioPossuiAlgumaPermissaoNoPerfil(
    perfilCodigo,
    permissoes,
    ["homologacao:gerenciar:global", "apuracao:recalcular:global"],
  );
  const podeGerenciarChefia = usuarioPossuiAlgumaPermissaoNoPerfil(
    perfilCodigo,
    permissoes,
    ["homologacao:gerenciar:chefia", "boletim-frequencia:gerar:chefia"],
  );

  if (!podeGerenciarGlobal && !podeGerenciarChefia) {
    return;
  }

  const servidorId = String(formData.get("servidorId") ?? "");
  const anoReferencia = Number(formData.get("anoReferencia") ?? 0);
  const mesReferencia = Number(formData.get("mesReferencia") ?? 0);
  const minutos = parseTempoAutorizado(formData);
  const minutosMaximos = Number(formData.get("minutosMaximos") ?? 0);
  const dataReferencia = parseDataReferencia(formData.get("dataReferencia"));

  if (
    !servidorId ||
    !dataReferencia ||
    !Number.isInteger(anoReferencia) ||
    !Number.isInteger(mesReferencia) ||
    mesReferencia < 1 ||
    mesReferencia > 12 ||
    !Number.isInteger(minutos) ||
    minutos <= 0 ||
    (Number.isInteger(minutosMaximos) &&
      minutosMaximos > 0 &&
      minutos > minutosMaximos)
  ) {
    return;
  }

  if (
    !podeGerenciarGlobal &&
    !(await chefiaPodeGerenciarServidor({
      usuarioId: session.user.id,
      servidorId,
    }))
  ) {
    return;
  }

  const fim = new Date(dataReferencia);
  fim.setUTCDate(fim.getUTCDate() + 1);

  await prisma.$transaction(async (tx) => {
    const servidor = await tx.servidor.findUnique({
      where: { id: servidorId },
      select: {
        usuarioId: true,
        lotacoes: {
          where: {
            status: "ATIVO",
          },
          select: {
            unidadeId: true,
          },
          orderBy: {
            dataInicio: "desc",
          },
          take: 1,
        },
      },
    });

    if (!servidor) {
      return;
    }

    const solicitacao = await tx.solicitacao.create({
      data: {
        servidorId,
        usuarioSolicitanteId: servidor.usuarioId,
        unidadeId: servidor.lotacoes[0]?.unidadeId ?? null,
        analisadaPorUsuarioId: session.user.id,
        tipo: "HORA_CREDITO_PREVIA",
        status: "DEFERIDA",
        titulo: "Hora extra autorizada pela chefia",
        descricao:
          "Autorização administrativa criada no espelho de ponto para converter hora extra não autorizada em crédito de banco de horas.",
        dataReferencia,
        dataInicio: dataReferencia,
        dataFim: fim,
        dadosSolicitados: {
          origem: "ESPELHO_PONTO",
          minutosSolicitados: minutos,
          tipoCompensacao: "CREDITO",
        },
        justificativaAnalise:
          "Hora extra autorizada pela chefia no espelho de ponto.",
        analisadaEm: new Date(),
      },
    });

    const autorizacao = await tx.autorizacaoBancoHoras.create({
      data: {
        solicitacaoId: solicitacao.id,
        servidorId,
        autorizadoPorUsuarioId: session.user.id,
        tipo: "CREDITO",
        status: "AUTORIZADA",
        dataInicio: dataReferencia,
        dataFim: fim,
        minutosAutorizados: minutos,
        justificativa:
          "Autorização de hora extra concedida pela chefia no espelho de ponto.",
      },
    });

    await tx.solicitacaoEvento.create({
      data: {
        solicitacaoId: solicitacao.id,
        usuarioId: session.user.id,
        tipo: "DEFERIDA",
        descricao:
          "Hora extra autorizada para crédito no banco de horas pelo espelho de ponto.",
        metadados: {
          autorizacaoBancoHorasId: autorizacao.id,
          minutosAutorizados: minutos,
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "AutorizacaoBancoHoras",
        entidadeId: autorizacao.id,
        acao: "HORA_EXTRA_AUTORIZADA_ESPELHO",
        dadosDepois: {
          servidorId,
          dataReferencia,
          minutosAutorizados: minutos,
          solicitacaoId: solicitacao.id,
        },
      },
    });
  });

  await recalcularMesServidorService({
    servidorId,
    anoReferencia,
    mesReferencia,
    usuarioIdAuditoria: session.user.id,
    origem: "AUTORIZACAO_HORA_EXTRA_ESPELHO",
  });

  revalidatePath("/espelho-ponto");
  revalidatePath("/banco-horas");
}
