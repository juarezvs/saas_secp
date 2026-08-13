import { prisma } from "@/shared/infrastructure/database/prisma";

const STATUS_SERVIDOR_APTO_ATESTO = new Set([
  "REGULAR",
  "ATESTADO",
  "CALCULADO",
  "PRONTO_PARA_FOLHA",
  "PROCESSADO_EM_FOLHA",
]);

const CATEGORIAS = [
  "COMPENSACAO_DEBITO",
  "EXCEDENTE_A_AUTORIZACAO",
  "FORA_FAIXA_PERMITIDA",
  "HORA_EXTRA_RECONHECIDA",
  "HORA_CREDITO",
  "NAO_AUTORIZADA",
] as const;

function somarClassificacoes(
  classificacoes: Array<{ categoria: string; minutos: number }>,
) {
  const totais = Object.fromEntries(
    CATEGORIAS.map((categoria) => [categoria, 0]),
  ) as Record<(typeof CATEGORIAS)[number], number>;

  for (const classificacao of classificacoes) {
    if (classificacao.categoria in totais) {
      totais[classificacao.categoria as keyof typeof totais] +=
        classificacao.minutos;
    }
  }

  return totais;
}

export async function gerarAtestoHorasExtras(params: {
  autorizacaoId: string;
  gestorUsuarioId: string;
  texto?: string;
  perfilAtivoCodigo?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const autorizacao = await tx.autorizacaoHoraExtraAdministrativa.findUnique({
      where: {
        id: params.autorizacaoId,
      },
      include: {
        servidores: {
          include: {
            classificacoes: {
              select: {
                categoria: true,
                minutos: true,
                data: true,
                inicio: true,
                fim: true,
              },
            },
          },
        },
      },
    });

    if (!autorizacao) {
      throw new Error("Autorizacao de horas extras nao localizada.");
    }

    if (autorizacao.servidores.length === 0) {
      throw new Error("Autorizacao sem servidores cadastrados.");
    }

    const servidoresPendentes = autorizacao.servidores.filter(
      (servidor) => !STATUS_SERVIDOR_APTO_ATESTO.has(servidor.status),
    );

    if (servidoresPendentes.length > 0) {
      throw new Error(
        `Existem ${servidoresPendentes.length} servidor(es) pendente(s) para atesto.`,
      );
    }

    const servidores = autorizacao.servidores.map((servidor) => ({
      id: servidor.id,
      servidorId: servidor.servidorId,
      matricula: servidor.matriculaSnapshot,
      nome: servidor.nomeSnapshot,
      unidade: servidor.unidadeSnapshot,
      autorizadoMinutos: servidor.quantidadeMaximaMinutos,
      totais: somarClassificacoes(servidor.classificacoes),
    }));
    const totais = servidores.reduce(
      (acumulado, servidor) => {
        for (const categoria of CATEGORIAS) {
          acumulado[categoria] += servidor.totais[categoria];
        }

        return acumulado;
      },
      Object.fromEntries(CATEGORIAS.map((categoria) => [categoria, 0])) as Record<
        (typeof CATEGORIAS)[number],
        number
      >,
    );
    const texto =
      params.texto?.trim() ||
      "Atesto que o servico extraordinario autorizado foi conferido e efetivamente prestado conforme classificacoes registradas no SECP.";

    const atesto = await tx.horaExtraAtesto.create({
      data: {
        autorizacaoId: autorizacao.id,
        gestorUsuarioId: params.gestorUsuarioId,
        texto,
        snapshot: {
          processoSei: autorizacao.processoSei,
          documentoAutorizacao: autorizacao.documentoAutorizacao,
          mesReferencia: autorizacao.mesReferencia,
          servidores,
          totais,
        },
      },
    });

    await tx.autorizacaoHoraExtraServidor.updateMany({
      where: {
        autorizacaoId: autorizacao.id,
      },
      data: {
        status: "ATESTADO",
      },
    });

    await tx.autorizacaoHoraExtraAdministrativa.update({
      where: {
        id: autorizacao.id,
      },
      data: {
        status: "ATESTADA",
      },
    });

    await tx.horaExtraEvento.create({
      data: {
        autorizacaoId: autorizacao.id,
        usuarioId: params.gestorUsuarioId,
        acao: "ATESTO_GERADO",
        dadosDepois: {
          atestoId: atesto.id,
          totais,
        },
        metadados: {
          perfilAtivo: params.perfilAtivoCodigo ?? null,
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: params.gestorUsuarioId,
        entidade: "HoraExtraAtesto",
        entidadeId: atesto.id,
        acao: "HORAS_EXTRAS_ATESTO_GERADO",
        dadosDepois: {
          autorizacaoId: autorizacao.id,
          totais,
        },
        metadados: {
          perfilAtivo: params.perfilAtivoCodigo ?? null,
        },
      },
    });

    return {
      atestoId: atesto.id,
      totais,
    };
  });
}
