import { prisma } from "@/shared/infrastructure/database/prisma";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import type { PerfilSessao } from "@/modules/auth/domain/entities/usuario-autenticado";

const DIAS_RETORNO_SOLICITACAO = 30;
const ORGAO_ID_SEM_ACESSO = "00000000-0000-4000-8000-000000000000";

export type NotificacaoPrioridade = "alta" | "media" | "baixa";
export type NotificacaoCategoria =
  "solicitacao" | "frequencia" | "banco_horas" | "homologacao" | "marcacao";

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
  pendente: boolean;
};

type ContextoNotificacoes = {
  perfilAtivo?: Pick<
    PerfilSessao,
    "codigo" | "permissoes" | "escopoGlobal" | "orgaos"
  > | null;
};

function permissoesDoPerfil(contexto?: ContextoNotificacoes) {
  return contexto?.perfilAtivo?.permissoes ?? [];
}

function possuiPermissao(
  contexto: ContextoNotificacoes | undefined,
  permissoes: string[],
) {
  const permissoesPerfil = permissoesDoPerfil(contexto);

  return permissoes.some((permissao) => permissoesPerfil.includes(permissao));
}

function perfilPossuiEscopoGlobal(contexto?: ContextoNotificacoes) {
  return Boolean(contexto?.perfilAtivo?.escopoGlobal);
}

function orgaoIdsDoPerfil(contexto?: ContextoNotificacoes) {
  return contexto?.perfilAtivo?.orgaos?.map((orgao) => orgao.id) ?? [];
}

function whereOrgaoPerfil(contexto?: ContextoNotificacoes) {
  if (perfilPossuiEscopoGlobal(contexto)) {
    return {};
  }

  const orgaoIds = orgaoIdsDoPerfil(contexto);

  if (orgaoIds.length === 0) {
    return { id: ORGAO_ID_SEM_ACESSO };
  }

  return { id: { in: orgaoIds } };
}

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

function chaveDataReferenciaUtc(data: Date) {
  return data.toISOString().slice(0, 10);
}

function competenciaDaDataUtc(data: Date) {
  return data.toISOString().slice(0, 7);
}

function formatarHorarioNotificacao(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Manaus",
  }).format(data);
}

function rotuloTipoMarcacao(tipo: string) {
  const rotulos: Record<string, string> = {
    ENTRADA: "Entrada",
    SAIDA_INTERVALO: "Saida intervalo",
    RETORNO_INTERVALO: "Retorno intervalo",
    SAIDA: "Saida",
    MANUAL: "Manual",
    AJUSTE: "Ajuste",
  };

  return rotulos[tipo] ?? tipo;
}

function hrefEspelhoOcorrencia(params: {
  servidorId: string;
  ocorrenciaId: string;
  dataReferencia: Date;
}) {
  const data = chaveDataReferenciaUtc(params.dataReferencia);
  const query = new URLSearchParams({
    servidorId: params.servidorId,
    competencia: competenciaDaDataUtc(params.dataReferencia),
    destaqueData: data,
    destaqueOcorrencia: params.ocorrenciaId,
  });

  return `/espelho-ponto?${query.toString()}#espelho-dia-${data}`;
}

function ordenarNotificacoes(notificacoes: NotificacaoUsuario[]) {
  const pesoPrioridade: Record<NotificacaoPrioridade, number> = {
    alta: 3,
    media: 2,
    baixa: 1,
  };

  return notificacoes.sort((a, b) => {
    const prioridade =
      pesoPrioridade[b.prioridade] - pesoPrioridade[a.prioridade];

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
  contexto?: ContextoNotificacoes,
): Promise<NotificacaoUsuario[]> {
  const podeVerPropriasSolicitacoes = possuiPermissao(contexto, [
    "solicitacoes:criar:proprio",
    "solicitacoes:consultar:proprio",
    "solicitacoes:visualizar:proprio",
  ]);
  const podeAnalisarSolicitacoesChefia = possuiPermissao(contexto, [
    "solicitacoes:analisar:chefia",
    "solicitacoes:analisar:subordinados",
    "solicitacoes:consultar:seccional",
    "solicitacoes:consultar:global",
  ]);
  const podeConsultarSolicitacoesPorEscopo = possuiPermissao(contexto, [
    "solicitacoes:consultar:seccional",
    "solicitacoes:consultar:global",
  ]);
  const podeVerFrequenciaPropria = possuiPermissao(contexto, [
    "marcacoes:consultar:proprio",
    "marcacoes:visualizar:proprio",
    "espelho-ponto:visualizar:proprio",
  ]);
  const podeVerBancoHorasProprio = possuiPermissao(contexto, [
    "banco-horas:visualizar:proprio",
    "banco-horas:consultar:proprio",
  ]);
  const podeVerHomologacaoPropria = possuiPermissao(contexto, [
    "homologacao:consultar:proprio",
  ]);
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
    marcacoesTotemRecentes,
  ] = await Promise.all([
    listarIdsNotificacoesLidas(usuarioId),
    podeAnalisarSolicitacoesChefia
      ? prisma.solicitacao.findMany({
          where: {
            status: {
              in: ["ENVIADA", "EM_ANALISE"],
            },
            unidade: {
              orgao: whereOrgaoPerfil(contexto),
            },
            OR: [
              ...(podeConsultarSolicitacoesPorEscopo ? [{}] : []),
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
        })
      : Promise.resolve([]),
    podeVerPropriasSolicitacoes
      ? prisma.solicitacao.findMany({
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
        })
      : Promise.resolve([]),
    servidor && podeVerFrequenciaPropria
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
    servidor && podeVerHomologacaoPropria
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
    servidor && podeVerFrequenciaPropria
      ? prisma.marcacao.findMany({
          where: {
            servidorId: servidor.id,
            fonte: "BIOMETRIA_FACIAL",
            status: { not: "CANCELADA" },
            criadoEm: {
              gte: dataLimiteRetornoSolicitacao(),
            },
          },
          include: {
            evidenciaFacial: true,
          },
          orderBy: {
            criadoEm: "desc",
          },
          take: 20,
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
      pendente: true,
    });
  }

  for (const solicitacao of solicitacoesDoUsuario) {
    const foiAnalisada = ["DEFERIDA", "INDEFERIDA"].includes(
      solicitacao.status,
    );

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
      pendente: !foiAnalisada,
    });
  }

  for (const ocorrencia of ocorrenciasFrequencia) {
    notificacoes.push({
      id: `ocorrencia-${ocorrencia.id}`,
      categoria: "frequencia",
      prioridade: "alta",
      titulo: "Pendência de frequência",
      descricao: ocorrencia.descricao,
      href: hrefEspelhoOcorrencia({
        servidorId: ocorrencia.servidorId,
        ocorrenciaId: ocorrencia.id,
        dataReferencia: ocorrencia.apuracaoDiaria.dataReferencia,
      }),
      criadoEm: ocorrencia.criadoEm,
      origem: "Espelho de ponto",
      lida: false,
      pendente: true,
    });
  }

  if (servidor?.bancoHorasSaldo && podeVerBancoHorasProprio) {
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
        pendente: true,
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
      pendente: true,
    });
  }

  for (const marcacao of marcacoesTotemRecentes) {
    const metadados = marcacao.metadados;
    const evidenciaMetadados = marcacao.evidenciaFacial?.metadados;
    const origemMarcacao =
      metadados && typeof metadados === "object" && !Array.isArray(metadados)
        ? (metadados as Record<string, unknown>).origemRegistro
        : null;
    const origemEvidencia =
      evidenciaMetadados &&
      typeof evidenciaMetadados === "object" &&
      !Array.isArray(evidenciaMetadados)
        ? (evidenciaMetadados as Record<string, unknown>).origem
        : null;

    if (
      origemMarcacao !== "TOTEM_MULTI_FACIAL" &&
      origemEvidencia !== "TOTEM_MULTI_FACIAL"
    ) {
      continue;
    }

    notificacoes.push({
      id: `marcacao-totem-${marcacao.id}`,
      categoria: "marcacao",
      prioridade: "baixa",
      titulo: "Ponto registrado no Totem",
      descricao: `${rotuloTipoMarcacao(marcacao.tipo)} registrada as ${formatarHorarioNotificacao(marcacao.dataHora)} por reconhecimento facial no Totem.`,
      href: "/marcacoes/registrar",
      criadoEm: marcacao.criadoEm,
      origem: "Totem",
      lida: false,
      pendente: true,
    });
  }

  return ordenarNotificacoes(
    notificacoes.map((notificacao) => ({
      ...notificacao,
      lida: notificacoesLidas.has(notificacao.id),
    })),
  );
}

export async function contarNotificacoesUsuario(
  usuarioId: string,
  contexto?: ContextoNotificacoes,
) {
  const notificacoes = await listarNotificacoesPendentesUsuario(
    usuarioId,
    contexto,
  );
  return notificacoes.length;
}

export async function listarNotificacoesPendentesUsuario(
  usuarioId: string,
  contexto?: ContextoNotificacoes,
) {
  const notificacoes = await listarNotificacoesUsuario(usuarioId, contexto);
  return notificacoes.filter(
    (notificacao) => notificacao.pendente && !notificacao.lida,
  );
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
