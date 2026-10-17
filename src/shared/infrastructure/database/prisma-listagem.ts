import { cache } from "react";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { restringirConsultaOrganizacional } from "./visibilidade-organizacional";

// Cache apenas durante a renderização: reativar um cadastro vale na próxima consulta.
const obterContexto = cache(async () => {
  const unidades = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH RECURSIVE ocultas AS (
      SELECT u.id FROM unidades_organizacionais u JOIN orgaos o ON o.id = u.orgao_id
      WHERE NOT u.ativo OR NOT o.ativo
      UNION
      SELECT filha.id FROM unidades_organizacionais filha JOIN ocultas pai ON filha.unidade_pai_id = pai.id
    ) SELECT id FROM ocultas
  `;
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: process.env.TZ || "America/Manaus", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const hoje = new Date(`${dia}T00:00:00.000Z`);
  return { unidadesOcultas: unidades.map(u => u.id), hoje };
});

/** Consultas da interface. Importações, autenticação e manutenção usam o cliente original. */
function criarClienteConsulta(cadastro = false) {
  return prisma.$extends({
  name: "visibilidade-organizacional",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!["findMany", "findFirst", "findFirstOrThrow", "findUnique", "findUniqueOrThrow", "count", "aggregate", "groupBy"].includes(operation)) return query(args);
        const contexto = await obterContexto();
        return query(restringirConsultaOrganizacional(model, args as Record<string, unknown>, contexto, cadastro) as typeof args);
      },
    },
  },
  }) as unknown as PrismaClient;
}

export const prismaListagem = criarClienteConsulta();
// Exceção usada somente pelo cadastro de órgãos/unidades; relações continuam filtradas.
export const prismaCadastroOrganizacional = criarClienteConsulta(true);
