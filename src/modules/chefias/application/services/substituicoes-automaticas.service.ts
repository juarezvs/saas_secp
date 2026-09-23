import type { PerfilSessao } from "@/modules/auth/domain/entities/usuario-autenticado";
import { perfilEhAdministradorSistema } from "@/modules/auth/domain/constants/perfis-sistema";
import { prisma } from "@/shared/infrastructure/database/prisma";

const CODIGOS_PERFIS_NAO_HERDAVEIS = new Set([
  "ADMIN",
  "MASTER",
  "NUTEC",
  "SUPORTE",
  "SUPORTE_TECNICO",
]);
const CODIGOS_PERFIS_GLOBAIS_HERDAVEIS = new Set(["CHEFIA"]);

function inicioDoDia(dataReferencia: Date) {
  const data = new Date(dataReferencia);
  data.setHours(0, 0, 0, 0);
  return data;
}

function perfilPodeSerHerdado(perfil: {
  codigo?: string | null;
  administrativo?: boolean | null;
  excecao?: boolean | null;
  global?: boolean | null;
}) {
  const codigo = perfil.codigo?.toUpperCase() ?? "";

  return (
    !CODIGOS_PERFIS_NAO_HERDAVEIS.has(codigo) &&
    !perfilEhAdministradorSistema(perfil) &&
    (!perfil.global || CODIGOS_PERFIS_GLOBAIS_HERDAVEIS.has(codigo)) &&
    !perfil.excecao
  );
}

export async function listarSubstituicoesAutomaticasEfetivasPorUsuario(
  usuarioId: string,
  dataReferencia = new Date(),
) {
  const hoje = inicioDoDia(dataReferencia);

  return prisma.substituicaoFuncao.findMany({
    where: {
      tipo: "AUTOMATICA",
      status: "ATIVA",
      dataInicio: {
        lte: hoje,
      },
      OR: [{ dataFim: null }, { dataFim: { gte: hoje } }],
      substitutoServidor: {
        ativo: true,
        usuarioId,
      },
      titularServidor: {
        ativo: true,
        afastamentosSarh: {
          some: {
            ativo: true,
            dataInicio: {
              lte: hoje,
            },
            OR: [{ dataFim: null }, { dataFim: { gte: hoje } }],
          },
        },
      },
    },
    include: {
      unidade: {
        select: {
          id: true,
        },
      },
      titularServidor: {
        include: {
          gestores: {
            where: {
              ativo: true,
              dataInicio: {
                lte: hoje,
              },
              OR: [{ dataFim: null }, { dataFim: { gte: hoje } }],
            },
            select: {
              unidadeId: true,
            },
          },
          usuario: {
            include: {
              perfis: {
                where: {
                  ativo: true,
                },
                include: {
                  orgao: {
                    select: {
                      id: true,
                      sigla: true,
                      nome: true,
                    },
                  },
                  perfil: {
                    include: {
                      orgao: {
                        select: {
                          id: true,
                          sigla: true,
                          nome: true,
                        },
                      },
                      permissoes: {
                        include: {
                          permissao: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function listarIdsUnidadesBasePorSubstituicaoAutomatica(
  usuarioId: string,
  dataReferencia = new Date(),
) {
  const substituicoes =
    await listarSubstituicoesAutomaticasEfetivasPorUsuario(
      usuarioId,
      dataReferencia,
    );
  const unidadesIds = new Set<string>();

  for (const substituicao of substituicoes) {
    if (substituicao.unidadeId) {
      unidadesIds.add(substituicao.unidadeId);
    }

    for (const gestor of substituicao.titularServidor.gestores) {
      unidadesIds.add(gestor.unidadeId);
    }
  }

  return Array.from(unidadesIds);
}

export async function listarPerfisHerdadosPorSubstituicaoAutomatica(
  usuarioId: string,
  dataReferencia = new Date(),
): Promise<PerfilSessao[]> {
  const substituicoes =
    await listarSubstituicoesAutomaticasEfetivasPorUsuario(
      usuarioId,
      dataReferencia,
    );
  const perfis = new Map<string, PerfilSessao>();

  for (const substituicao of substituicoes) {
    adicionarPerfisHerdados(perfis, substituicao.titularServidor.usuario.perfis);
  }

  return Array.from(perfis.values());
}

function adicionarPerfisHerdados(
  perfis: Map<string, PerfilSessao>,
  usuariosPerfis: Array<{
    orgao: { id: string; sigla: string; nome: string } | null;
    perfil: {
      id: string;
      codigo: string;
      nome: string;
      ativo: boolean;
      administrativo: boolean;
      excecao: boolean;
      global: boolean;
      perfilDestinoExcecaoId: string | null;
      orgao: { id: string; sigla: string; nome: string } | null;
      permissoes: Array<{
        permissao: {
          codigo: string;
        };
      }>;
    };
  }>,
) {
  for (const usuarioPerfil of usuariosPerfis) {
    if (
      !usuarioPerfil.perfil.ativo ||
      !perfilPodeSerHerdado(usuarioPerfil.perfil)
    ) {
      continue;
    }

    const perfilAtual = perfis.get(usuarioPerfil.perfil.id);
    const orgaoPerfil = usuarioPerfil.orgao ?? usuarioPerfil.perfil.orgao;
    const orgaos = [
      ...(perfilAtual?.orgaos ?? []),
      ...(orgaoPerfil ? [orgaoPerfil] : []),
    ];

    perfis.set(usuarioPerfil.perfil.id, {
      id: usuarioPerfil.perfil.id,
      codigo: usuarioPerfil.perfil.codigo,
      nome: usuarioPerfil.perfil.nome,
      permissoes: usuarioPerfil.perfil.permissoes.map(
        (perfilPermissao) => perfilPermissao.permissao.codigo,
      ),
      administrativo: usuarioPerfil.perfil.administrativo,
      excecao: usuarioPerfil.perfil.excecao,
      perfilDestinoExcecaoId: usuarioPerfil.perfil.perfilDestinoExcecaoId,
      escopoGlobal: false,
      orgaos: Array.from(
        new Map(orgaos.map((orgao) => [orgao.id, orgao])).values(),
      ),
    });
  }
}

export function aplicarPerfisHerdadosPorSubstituicaoAutomatica(
  perfisAtuais: PerfilSessao[],
  perfisHerdados: PerfilSessao[],
) {
  if (perfisHerdados.length === 0) {
    return perfisAtuais;
  }

  const permissoesHerdadas = new Set(
    perfisHerdados.flatMap((perfil) => perfil.permissoes),
  );
  const orgaosHerdados = new Map(
    perfisHerdados
      .flatMap((perfil) => perfil.orgaos ?? [])
      .map((orgao) => [orgao.id, orgao]),
  );
  const perfisPorId = new Map<string, PerfilSessao>(
    perfisAtuais.map((perfil) => [
      perfil.id,
      {
        ...perfil,
        permissoes: Array.from(
          new Set([...perfil.permissoes, ...permissoesHerdadas]),
        ),
        orgaos: Array.from(
          new Map([
            ...(perfil.orgaos ?? []).map((orgao) => [orgao.id, orgao] as const),
            ...orgaosHerdados,
          ]).values(),
        ),
      },
    ]),
  );

  for (const perfilHerdado of perfisHerdados) {
    if (perfisPorId.has(perfilHerdado.id)) {
      continue;
    }

    perfisPorId.set(perfilHerdado.id, perfilHerdado);
  }

  return Array.from(perfisPorId.values());
}
