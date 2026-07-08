import { randomUUID } from "node:crypto";

import { prisma } from "@/shared/infrastructure/database/prisma";

export type TipoLiberacaoRotina = "ROTINA" | "PERMISSAO";

export type LiberacaoRotinaRegistro = {
  tipo: TipoLiberacaoRotina;
  chave: string;
  liberada: boolean;
};

export type PermissaoRotina = {
  id: string;
  codigo: string;
  recurso: string;
  acao: string;
  escopo: string;
  descricao: string | null;
};

export type RotinaComPermissoes = {
  recurso: string;
  liberada: boolean;
  permissoes: Array<PermissaoRotina & { liberada: boolean }>;
};

type LiberacaoRotinaRow = {
  tipo: TipoLiberacaoRotina;
  chave: string;
  liberada: boolean;
};

type PermissaoRecursoRow = {
  codigo: string;
  recurso: string;
};

export function recursoDaPermissao(permissao: string) {
  return permissao.split(":")[0] ?? permissao;
}

export async function listarLiberacoesRotinas() {
  return prisma.$queryRaw<LiberacaoRotinaRow[]>`
    SELECT tipo::text AS tipo, chave, liberada
    FROM rotinas_liberacoes
  `;
}

function montarMapaLiberacoes(liberacoes: LiberacaoRotinaRegistro[]) {
  return new Map(
    liberacoes.map((liberacao) => [
      `${liberacao.tipo}:${liberacao.chave}`,
      liberacao.liberada,
    ]),
  );
}

export function permissaoEstaLiberada(
  permissao: string,
  liberacoes: LiberacaoRotinaRegistro[],
  recursoInformado?: string,
) {
  const mapa = montarMapaLiberacoes(liberacoes);
  const recurso = recursoInformado ?? recursoDaPermissao(permissao);
  const liberacaoPermissao = mapa.get(`PERMISSAO:${permissao}`);

  if (liberacaoPermissao !== undefined) {
    return liberacaoPermissao;
  }

  return mapa.get(`ROTINA:${recurso}`) ?? true;
}

export async function filtrarPermissoesLiberadas(permissoes: string[]) {
  if (permissoes.length === 0) {
    return [];
  }

  const [liberacoes, permissoesRecursos] = await Promise.all([
    listarLiberacoesRotinas(),
    prisma.$queryRaw<PermissaoRecursoRow[]>`
      SELECT codigo, recurso
      FROM permissoes
      WHERE codigo = ANY(${permissoes})
    `,
  ]);
  const recursosPorPermissao = new Map(
    permissoesRecursos.map((permissao) => [permissao.codigo, permissao.recurso]),
  );

  return permissoes.filter((permissao) =>
    permissaoEstaLiberada(
      permissao,
      liberacoes,
      recursosPorPermissao.get(permissao),
    ),
  );
}

export async function listarRotinasComPermissoes(): Promise<
  RotinaComPermissoes[]
> {
  const [permissoes, liberacoes] = await Promise.all([
    prisma.permissao.findMany({
      orderBy: [{ recurso: "asc" }, { acao: "asc" }, { escopo: "asc" }],
    }),
    listarLiberacoesRotinas(),
  ]);
  const mapa = montarMapaLiberacoes(liberacoes);
  const grupos = new Map<string, RotinaComPermissoes>();

  for (const permissao of permissoes) {
    const rotinaLiberada = mapa.get(`ROTINA:${permissao.recurso}`) ?? true;
    const permissaoLiberada =
      mapa.get(`PERMISSAO:${permissao.codigo}`) ?? rotinaLiberada;
    const grupo =
      grupos.get(permissao.recurso) ??
      ({
        recurso: permissao.recurso,
        liberada: rotinaLiberada,
        permissoes: [],
      } satisfies RotinaComPermissoes);

    grupo.permissoes.push({
      id: permissao.id,
      codigo: permissao.codigo,
      recurso: permissao.recurso,
      acao: permissao.acao,
      escopo: permissao.escopo,
      descricao: permissao.descricao,
      liberada: permissaoLiberada,
    });
    grupos.set(permissao.recurso, grupo);
  }

  return Array.from(grupos.values());
}

export async function salvarLiberacoesRotinas(params: {
  liberacoes: LiberacaoRotinaRegistro[];
  usuarioId?: string;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM rotinas_liberacoes`;

    for (const liberacao of params.liberacoes) {
      await tx.$executeRaw`
        INSERT INTO rotinas_liberacoes (
          id,
          tipo,
          chave,
          liberada,
          atualizado_por_usuario_id,
          atualizado_em
        )
        VALUES (
          ${randomUUID()}::uuid,
          ${liberacao.tipo}::"TipoLiberacaoRotina",
          ${liberacao.chave},
          ${liberacao.liberada},
          ${params.usuarioId ?? null}::uuid,
          NOW()
        )
      `;
    }
  });
}
