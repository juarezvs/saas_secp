import { prisma } from "@/shared/infrastructure/database/prisma";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

const DIAS_RETORNO_SOLICITACAO = 30;

export type NotificacaoPrioridade = "alta" | "media" | "baixa";
export type NotificacaoCategoria =
  | "solicitacao"
  | "frequencia"
  | "banco_horas"
  | "homologacao";

export type NotificacaoUsuario = {
  id: string;
  categoria: NotificacaoCategoria;
  prioridade: NotificacaoPrioridade;
  titulo: string;
  descricao: string;
  href: string;
  criadoEm: Date;
  origem: string;
  lida: boolean;
};

function dataLimiteRetornoSolicitacao() {
  const data = new Date();
  data.setDate(data.getDate() - DIAS_RETORNO_SOLICITACAO);
  return data;
}

function formatarMinutos(minutos: number) {
  const absoluto = Math.abs(minutos);
  const horas = Math.floor(absoluto / 60);
  const minutosRestantes = absoluto % 60;

  return `${horas}h${String(minutosRestantes).padStart(2, "0")}`;
}

function ordenarNotificacoes(notificacoes: NotificacaoUsuario[]) {
  const pesoPrioridade: Record<NotificacaoPrioridade, number> = {
    alta: 3,
    media: 2,
    baixa: 1,
  };

  return notificacoes.sort((a, b) => {
    const prioridade = pesoPrioridade[b.prioridade] - pesoPrioridade[a.prioridade];

    if (prioridade !== 0) {
      return prioridade;
    }

    return b.criadoEm.getTime() - a.criadoEm.getTime();
  });
}

async function listarIdsNotificacoesLidas(usuarioId: string) {
  const leituras = await prisma.notificacaoLeitura.findMany({
    where: {
      usuarioId,
    },
    select: {
      notificacaoId: true,
    },
  });

  return new Set(leituras.map((leitura) => leitura.notificacaoId));
}

export async function listarNotificacoesUsuario(
  usuarioId: string,
): Promise<NotificacaoUsuario[]> {
  const servidor = await prisma.servidor.findFirst({
    where: {
      usuarioId,
      ativo: true,
    },
    select: {
      id: true,
      bancoHorasSaldo: {
        select: {
          creditosPendentesMinutos: true,
          debitosPendentesMinutos: true,
          atualizadoEm: true,
        },
      },
    },
  });

  const [
    notificacoesLidas,
    solicitacoesParaChefia,
    solicitacoesDoUsuario,
    ocorrenciasFrequencia,
    homologacoesPendentes,
  ] = await Promise.all([
    listarIdsNotificacoesLidas(usuarioId),
    prisma.solicitacao.findMany({
      where: {
        status: {
          in: ["ENVIADA", "EM_ANALISE"],
        },
        OR: [
          {
            chefiaResponsavel: {
              servidor: {
                usuarioId,
              },
            },
          },
          {
            unidade: {
              gestores: {
                some: {
                  servidor: {
                    usuarioId,
                  },
                  ativo: true,
                  dataFim: null,
                  papel: {
                    in: [
                      "GESTOR_TITULAR",
                      "GESTOR_SUBSTITUTO",
                      "DELEGADO_CHEFIA",
                    ],
                  },
                },
              },
            },
          },
        ],
      },
      include: {
        servidor: {
          include: {
            usuario: true,
          },
        },
        unidade: true,
      },
      orderBy: {
        criadoEm: "desc",
      },
      take: 20,
    }),
    prisma.solicitacao.findMany({
      where: {
        usuarioSolicitanteId: usuarioId,
        OR: [
          {
            status: {
              in: ["ENVIADA", "EM_ANALISE"],
            },
          },
          {
            status: {
              in: ["DEFERIDA", "INDEFERIDA"],
            },
            atualizadoEm: {
              gte: dataLimiteRetornoSolicitacao(),
            },
          },
        ],
      },
      include: {
        unidade: true,
      },
      orderBy: {
        atualizadoEm: "desc",
      },
      take: 20,
    }),
    servidor
      ? prisma.ocorrenciaFrequencia.findMany({
          where: {
            servidorId: servidor.id,
            resolvida: false,
          },
          include: {
            apuracaoDiaria: true,
          },
          orderBy: {
            criadoEm: "desc",
          },
          take: 10,
        })
      : Promise.resolve([]),
    servidor
      ? prisma.homologacaoServidorMes.findMany({
          where: {
            servidorId: servidor.id,
            status: {
              in: ["PENDENTE", "COM_PENDENCIAS", "DEVOLVIDO"],
            },
          },
          include: {
            fechamento: {
              include: {
                unidade: true,
              },
            },
          },
          orderBy: {
            atualizadoEm: "desc",
          },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  const notificacoes: NotificacaoUsuario[] = [];

  for (const solicitacao of solicitacoesParaChefia) {
    notificacoes.push({
      id: `solicitacao-chefia-${solicitacao.id}`,
      categoria: "solicitacao",
      prioridade: "alta",
      titulo: "Solicitação aguardando análise",
      descricao: `${nomeServidor(solicitacao.servidor)} enviou "${solicitacao.titulo}" para ${solicitacao.unidade?.sigla ?? "a unidade"}.`,
      href: `/solicitacoes/${solicitacao.id}`,
      criadoEm: solicitacao.criadoEm,
      origem: "Solicitações",
      lida: false,
    });
  }

  for (const solicitacao of solicitacoesDoUsuario) {
    const foiAnalisada = ["DEFERIDA", "INDEFERIDA"].includes(solicitacao.status);

    notificacoes.push({
      id: `solicitacao-usuario-${solicitacao.id}`,
      categoria: "solicitacao",
      prioridade: foiAnalisada ? "media" : "baixa",
      titulo: foiAnalisada
        ? `Solicitação ${solicitacao.status === "DEFERIDA" ? "deferida" : "indeferida"}`
        : "Solicitação em andamento",
      descricao: `"${solicitacao.titulo}" está com status ${solicitacao.status.replace("_", " ").toLocaleLowerCase("pt-BR")}.`,
      href: `/solicitacoes/${solicitacao.id}`,
      criadoEm: solicitacao.atualizadoEm,
      origem: "Solicitações",
      lida: false,
    });
  }

  for (const ocorrencia of ocorrenciasFrequencia) {
    notificacoes.push({
      id: `ocorrencia-${ocorrencia.id}`,
      categoria: "frequencia",
      prioridade: "alta",
      titulo: "Pendência de frequência",
      descricao: ocorrencia.descricao,
      href: "/espelho-ponto",
      criadoEm: ocorrencia.criadoEm,
      origem: "Espelho de ponto",
      lida: false,
    });
  }

  if (servidor?.bancoHorasSaldo) {
    const pendenteCredito = servidor.bancoHorasSaldo.creditosPendentesMinutos;
    const pendenteDebito = servidor.bancoHorasSaldo.debitosPendentesMinutos;

    if (pendenteCredito > 0 || pendenteDebito > 0) {
      const partes = [
        pendenteCredito > 0
          ? `${formatarMinutos(pendenteCredito)} em créditos pendentes`
          : null,
        pendenteDebito > 0
          ? `${formatarMinutos(pendenteDebito)} em débitos pendentes`
          : null,
      ].filter(Boolean);

      notificacoes.push({
        id: `banco-horas-pendente-${servidor.id}`,
        categoria: "banco_horas",
        prioridade: "media",
        titulo: "Banco de horas com pendências",
        descricao: partes.join(" e "),
        href: "/banco-horas",
        criadoEm: servidor.bancoHorasSaldo.atualizadoEm,
        origem: "Banco de horas",
        lida: false,
      });
    }
  }

  for (const homologacao of homologacoesPendentes) {
    notificacoes.push({
      id: `homologacao-${homologacao.id}`,
      categoria: "homologacao",
      prioridade: homologacao.status === "COM_PENDENCIAS" ? "alta" : "media",
      titulo: "Homologação mensal pendente",
      descricao: `${homologacao.fechamento.unidade.sigla} - ${String(homologacao.fechamento.mesReferencia).padStart(2, "0")}/${homologacao.fechamento.anoReferencia}.`,
      href: "/homologacao",
      criadoEm: homologacao.atualizadoEm,
      origem: "Homologação",
      lida: false,
    });
  }

  return ordenarNotificacoes(
    notificacoes.map((notificacao) => ({
      ...notificacao,
      lida: notificacoesLidas.has(notificacao.id),
    })),
  );
}

export async function contarNotificacoesUsuario(usuarioId: string) {
  const notificacoes = await listarNotificacoesUsuario(usuarioId);
  return notificacoes.filter((notificacao) => !notificacao.lida).length;
}

export async function marcarNotificacaoComoLida(
  usuarioId: string,
  notificacaoId: string,
) {
  await prisma.notificacaoLeitura.upsert({
    where: {
      usuarioId_notificacaoId: {
        usuarioId,
        notificacaoId,
      },
    },
    create: {
      usuarioId,
      notificacaoId,
    },
    update: {
      lidaEm: new Date(),
    },
  });
}
