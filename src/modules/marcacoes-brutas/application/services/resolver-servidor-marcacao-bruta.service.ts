import { prisma } from "@/shared/infrastructure/database/prisma";

function somenteDigitos(valor: string | null | undefined) {
  return valor?.replace(/\D/g, "") || null;
}

export async function resolverServidorMarcacaoBrutaService(params: {
  cpf?: string | null;
  matricula?: string | null;
}) {
  const cpf = somenteDigitos(params.cpf);
  const matricula = params.matricula?.trim() || null;
  const filtros = [];

  if (cpf) {
    filtros.push({ cpf });
    filtros.push({ usuario: { cpf } });
  }

  if (matricula) {
    filtros.push({
      matricula: { equals: matricula, mode: "insensitive" as const },
    });
    filtros.push({
      usuario: {
        matricula: { equals: matricula, mode: "insensitive" as const },
      },
    });
  }

  if (filtros.length === 0) {
    return null;
  }

  return prisma.servidor.findFirst({
    where: {
      ativo: true,
      OR: filtros,
    },
    select: {
      id: true,
      matricula: true,
      cpf: true,
    },
  });
}
