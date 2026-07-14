import { prisma } from "@/shared/infrastructure/database/prisma";

const LIMITE_PREVIA_JSON_AUDITORIA = 30000;

export type ListarAuditoriaParams = {
  pagina?: number;
  limite?: number;
  itensPorPagina?: number;
  busca?: string;
  entidade?: string;
  acao?: string;
  usuarioId?: string;
  dataInicio?: string;
  dataFim?: string;
  orgaoIdsPermitidos?: string[];
};

function criarFiltroData(dataInicio?: string, dataFim?: string) {
  if (!dataInicio && !dataFim) {
    return undefined;
  }

  const filtro: {
    gte?: Date;
    lt?: Date;
  } = {};

  if (dataInicio) {
    filtro.gte = new Date(`${dataInicio}T00:00:00`);
  }

  if (dataFim) {
    const fim = new Date(`${dataFim}T00:00:00`);
    fim.setDate(fim.getDate() + 1);
    filtro.lt = fim;
  }

  return filtro;
}

export function montarWhereAuditoria(params: ListarAuditoriaParams) {
  const busca = params.busca?.trim();
  const filtroData = criarFiltroData(params.dataInicio, params.dataFim);
  const filtrosAnd: object[] = [];
  const escopo =
    params.orgaoIdsPermitidos === undefined
      ? null
      : {
          OR: [
            {
              usuario: {
                servidor: {
                  orgaoId: {
                    in: params.orgaoIdsPermitidos,
                  },
                },
              },
            },
            {
              usuario: {
                perfis: {
                  some: {
                    orgaoId: {
                      in: params.orgaoIdsPermitidos,
                    },
                  },
                },
              },
            },
          ],
        };
  const filtros = {
    ...(params.entidade ? { entidade: params.entidade } : {}),
    ...(params.acao
      ? { acao: { contains: params.acao, mode: "insensitive" as const } }
      : {}),
    ...(params.usuarioId ? { usuarioId: params.usuarioId } : {}),
    ...(filtroData ? { criadoEm: filtroData } : {}),
  };
  const filtroBusca = busca
    ? {
        OR: [
          { entidade: { contains: busca, mode: "insensitive" as const } },
          { entidadeId: { contains: busca, mode: "insensitive" as const } },
          { acao: { contains: busca, mode: "insensitive" as const } },
          {
            usuario: {
              nome: { contains: busca, mode: "insensitive" as const },
            },
          },
          {
            usuario: {
              matricula: { contains: busca, mode: "insensitive" as const },
            },
          },
        ],
      }
    : null;

  if (escopo) filtrosAnd.push(escopo);
  if (filtroBusca) filtrosAnd.push(filtroBusca);

  return {
    ...filtros,
    ...(filtrosAnd.length ? { AND: filtrosAnd } : {}),
  };
}

export async function listarEventosAuditoria(params: ListarAuditoriaParams) {
  const pagina = Math.max(1, params.pagina ?? 1);
  const limite = Math.min(
    100,
    Math.max(10, params.itensPorPagina ?? params.limite ?? 20),
  );
  const skip = (pagina - 1) * limite;
  const where = montarWhereAuditoria(params);

  const [total, eventos] = await Promise.all([
    prisma.auditoriaEvento.count({ where }),
    prisma.auditoriaEvento.findMany({
      where,
      select: {
        id: true,
        entidade: true,
        entidadeId: true,
        acao: true,
        criadoEm: true,
        ip: true,
        usuario: {
          select: {
            id: true,
            nome: true,
            matricula: true,
          },
        },
      },
      orderBy: {
        criadoEm: "desc",
      },
      skip,
      take: limite,
    }),
  ]);

  return {
    eventos,
    paginacao: {
      total,
      pagina,
      limite,
      itensPorPagina: limite,
      totalPaginas: Math.max(1, Math.ceil(total / limite)),
    },
  };
}

export async function listarEventosAuditoriaParaExportacao(
  params: ListarAuditoriaParams,
) {
  return prisma.auditoriaEvento.findMany({
    where: montarWhereAuditoria(params),
    select: {
      id: true,
      entidade: true,
      entidadeId: true,
      acao: true,
      criadoEm: true,
      ip: true,
      usuario: {
        select: {
          id: true,
          nome: true,
          matricula: true,
        },
      },
    },
    orderBy: {
      criadoEm: "desc",
    },
  });
}

export async function buscarEventoAuditoriaPorId(
  id: string,
  params?: { orgaoIdsPermitidos?: string[] },
) {
  if (params?.orgaoIdsPermitidos?.length === 0) {
    return null;
  }

  const limite = LIMITE_PREVIA_JSON_AUDITORIA;
  const eventos =
    params?.orgaoIdsPermitidos === undefined
      ? await prisma.$queryRaw<EventoAuditoriaDetalheRow[]>`
          SELECT
            ae.id,
            ae.usuario_id AS "usuarioId",
            ae.entidade,
            ae.entidade_id AS "entidadeId",
            ae.acao,
            CASE
              WHEN ae.dados_antes IS NULL THEN NULL
              ELSE LEFT(ae.dados_antes::text, ${limite})
            END AS "dadosAntesTexto",
            CASE
              WHEN ae.dados_antes IS NULL THEN NULL
              ELSE CHAR_LENGTH(ae.dados_antes::text)
            END AS "dadosAntesCaracteres",
            CASE
              WHEN ae.dados_antes IS NULL THEN NULL
              ELSE PG_COLUMN_SIZE(ae.dados_antes)
            END AS "dadosAntesBytes",
            CASE
              WHEN ae.dados_depois IS NULL THEN NULL
              ELSE LEFT(ae.dados_depois::text, ${limite})
            END AS "dadosDepoisTexto",
            CASE
              WHEN ae.dados_depois IS NULL THEN NULL
              ELSE CHAR_LENGTH(ae.dados_depois::text)
            END AS "dadosDepoisCaracteres",
            CASE
              WHEN ae.dados_depois IS NULL THEN NULL
              ELSE PG_COLUMN_SIZE(ae.dados_depois)
            END AS "dadosDepoisBytes",
            CASE
              WHEN ae.metadados IS NULL THEN NULL
              ELSE LEFT(ae.metadados::text, ${limite})
            END AS "metadadosTexto",
            CASE
              WHEN ae.metadados IS NULL THEN NULL
              ELSE CHAR_LENGTH(ae.metadados::text)
            END AS "metadadosCaracteres",
            CASE
              WHEN ae.metadados IS NULL THEN NULL
              ELSE PG_COLUMN_SIZE(ae.metadados)
            END AS "metadadosBytes",
            ae.ip,
            ae.user_agent AS "userAgent",
            ae.criado_em AS "criadoEm",
            u.nome AS "usuarioNome",
            u.matricula AS "usuarioMatricula",
            u.email AS "usuarioEmail"
          FROM auditoria_eventos ae
          LEFT JOIN usuarios u ON u.id = ae.usuario_id
          WHERE ae.id = ${id}::uuid
          LIMIT 1
        `
      : await prisma.$queryRaw<EventoAuditoriaDetalheRow[]>`
          SELECT
            ae.id,
            ae.usuario_id AS "usuarioId",
            ae.entidade,
            ae.entidade_id AS "entidadeId",
            ae.acao,
            CASE
              WHEN ae.dados_antes IS NULL THEN NULL
              ELSE LEFT(ae.dados_antes::text, ${limite})
            END AS "dadosAntesTexto",
            CASE
              WHEN ae.dados_antes IS NULL THEN NULL
              ELSE CHAR_LENGTH(ae.dados_antes::text)
            END AS "dadosAntesCaracteres",
            CASE
              WHEN ae.dados_antes IS NULL THEN NULL
              ELSE PG_COLUMN_SIZE(ae.dados_antes)
            END AS "dadosAntesBytes",
            CASE
              WHEN ae.dados_depois IS NULL THEN NULL
              ELSE LEFT(ae.dados_depois::text, ${limite})
            END AS "dadosDepoisTexto",
            CASE
              WHEN ae.dados_depois IS NULL THEN NULL
              ELSE CHAR_LENGTH(ae.dados_depois::text)
            END AS "dadosDepoisCaracteres",
            CASE
              WHEN ae.dados_depois IS NULL THEN NULL
              ELSE PG_COLUMN_SIZE(ae.dados_depois)
            END AS "dadosDepoisBytes",
            CASE
              WHEN ae.metadados IS NULL THEN NULL
              ELSE LEFT(ae.metadados::text, ${limite})
            END AS "metadadosTexto",
            CASE
              WHEN ae.metadados IS NULL THEN NULL
              ELSE CHAR_LENGTH(ae.metadados::text)
            END AS "metadadosCaracteres",
            CASE
              WHEN ae.metadados IS NULL THEN NULL
              ELSE PG_COLUMN_SIZE(ae.metadados)
            END AS "metadadosBytes",
            ae.ip,
            ae.user_agent AS "userAgent",
            ae.criado_em AS "criadoEm",
            u.nome AS "usuarioNome",
            u.matricula AS "usuarioMatricula",
            u.email AS "usuarioEmail"
          FROM auditoria_eventos ae
          LEFT JOIN usuarios u ON u.id = ae.usuario_id
          WHERE ae.id = ${id}::uuid
            AND (
              EXISTS (
                SELECT 1
                FROM servidores s
                WHERE s.usuario_id = ae.usuario_id
                  AND s.orgao_id = ANY(${params.orgaoIdsPermitidos}::uuid[])
              )
              OR EXISTS (
                SELECT 1
                FROM usuarios_perfis up
                WHERE up.usuario_id = ae.usuario_id
                  AND up.orgao_id = ANY(${params.orgaoIdsPermitidos}::uuid[])
              )
            )
          LIMIT 1
        `;

  return normalizarEventoAuditoriaDetalhe(eventos[0]);
}

type EventoAuditoriaDetalheRow = {
  id: string;
  usuarioId: string | null;
  entidade: string;
  entidadeId: string | null;
  acao: string;
  dadosAntesTexto: string | null;
  dadosAntesCaracteres: number | bigint | null;
  dadosAntesBytes: number | bigint | null;
  dadosDepoisTexto: string | null;
  dadosDepoisCaracteres: number | bigint | null;
  dadosDepoisBytes: number | bigint | null;
  metadadosTexto: string | null;
  metadadosCaracteres: number | bigint | null;
  metadadosBytes: number | bigint | null;
  ip: string | null;
  userAgent: string | null;
  criadoEm: Date;
  usuarioNome: string | null;
  usuarioMatricula: string | null;
  usuarioEmail: string | null;
};

function numeroAuditoria(valor: number | bigint | null) {
  return typeof valor === "bigint" ? Number(valor) : valor;
}

function normalizarEventoAuditoriaDetalhe(
  row: EventoAuditoriaDetalheRow | undefined,
) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    usuarioId: row.usuarioId,
    entidade: row.entidade,
    entidadeId: row.entidadeId,
    acao: row.acao,
    dadosAntesTexto: row.dadosAntesTexto,
    dadosAntesCaracteres: numeroAuditoria(row.dadosAntesCaracteres),
    dadosAntesBytes: numeroAuditoria(row.dadosAntesBytes),
    dadosDepoisTexto: row.dadosDepoisTexto,
    dadosDepoisCaracteres: numeroAuditoria(row.dadosDepoisCaracteres),
    dadosDepoisBytes: numeroAuditoria(row.dadosDepoisBytes),
    metadadosTexto: row.metadadosTexto,
    metadadosCaracteres: numeroAuditoria(row.metadadosCaracteres),
    metadadosBytes: numeroAuditoria(row.metadadosBytes),
    ip: row.ip,
    userAgent: row.userAgent,
    criadoEm: row.criadoEm,
    usuario:
      row.usuarioNome && row.usuarioMatricula
        ? {
            nome: row.usuarioNome,
            matricula: row.usuarioMatricula,
            email: row.usuarioEmail,
          }
        : null,
  };
}

export async function listarUsuariosParaFiltroAuditoria(params?: {
  orgaoIdsPermitidos?: string[];
}) {
  return prisma.usuario.findMany({
    where: {
      ...(params?.orgaoIdsPermitidos
        ? {
            OR: [
              { servidor: { orgaoId: { in: params.orgaoIdsPermitidos } } },
              {
                perfis: {
                  some: { orgaoId: { in: params.orgaoIdsPermitidos } },
                },
              },
            ],
          }
        : {}),
      auditorias: {
        some: {},
      },
    },
    orderBy: {
      nome: "asc",
    },
    select: {
      id: true,
      nome: true,
      matricula: true,
    },
  });
}

export async function listarEntidadesAuditoria(params?: {
  orgaoIdsPermitidos?: string[];
}) {
  const entidades = await prisma.auditoriaEvento.findMany({
    where:
      params?.orgaoIdsPermitidos === undefined
        ? undefined
        : {
            OR: [
              {
                usuario: {
                  servidor: {
                    orgaoId: { in: params.orgaoIdsPermitidos },
                  },
                },
              },
              {
                usuario: {
                  perfis: {
                    some: { orgaoId: { in: params.orgaoIdsPermitidos } },
                  },
                },
              },
            ],
          },
    distinct: ["entidade"],
    select: {
      entidade: true,
    },
    orderBy: {
      entidade: "asc",
    },
  });

  return entidades.map((item) => item.entidade);
}
