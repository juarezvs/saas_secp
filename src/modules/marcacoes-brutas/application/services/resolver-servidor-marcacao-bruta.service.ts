import { prisma } from "@/shared/infrastructure/database/prisma";

function somenteDigitos(valor: string | null | undefined) {
  return valor?.replace(/\D/g, "") || null;
}

function prefixoMatriculaPorSiglaOrgao(sigla: string | null | undefined) {
  const normalizada = sigla?.trim().toUpperCase();

  if (!normalizada) return null;

  if (/^SJ[A-Z]{2}$/.test(normalizada)) {
    return normalizada.slice(2);
  }

  return normalizada;
}

function normalizarMatriculaPorOrgao(
  matricula: string | null,
  siglaOrgao: string | null | undefined,
) {
  if (!matricula) return null;

  const prefixo = prefixoMatriculaPorSiglaOrgao(siglaOrgao);
  const digitos = somenteDigitos(matricula);

  if (!prefixo || !digitos) {
    return matricula;
  }

  const numero = digitos.replace(/^0+/, "") || "0";

  return `${prefixo}${numero}`;
}

export async function resolverServidorMarcacaoBrutaService(params: {
  cpf?: string | null;
  matricula?: string | null;
  equipamentoId?: string | null;
}) {
  const cpf = somenteDigitos(params.cpf);
  const matricula = params.matricula?.trim() || null;
  const filtros = [];
  const equipamento = params.equipamentoId
    ? await prisma.equipamentoBiometrico.findUnique({
        where: { id: params.equipamentoId },
        select: {
          orgaoId: true,
          orgao: { select: { sigla: true } },
          unidade: {
            select: {
              orgaoId: true,
              orgao: { select: { sigla: true } },
            },
          },
        },
      })
    : null;
  const orgaoIdEquipamento =
    equipamento?.orgaoId ?? equipamento?.unidade?.orgaoId ?? null;
  const siglaOrgaoEquipamento =
    equipamento?.orgao?.sigla ?? equipamento?.unidade?.orgao.sigla ?? null;
  const matriculaNoOrgao = normalizarMatriculaPorOrgao(
    matricula,
    siglaOrgaoEquipamento,
  );

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

  if (matriculaNoOrgao && matriculaNoOrgao !== matricula) {
    filtros.unshift({
      matricula: { equals: matriculaNoOrgao, mode: "insensitive" as const },
    });
    filtros.unshift({
      usuario: {
        matricula: { equals: matriculaNoOrgao, mode: "insensitive" as const },
      },
    });
  }

  if (filtros.length === 0) {
    return null;
  }

  if (orgaoIdEquipamento) {
    const servidorDoOrgao = await prisma.servidor.findFirst({
      where: {
        ativo: true,
        orgaoId: orgaoIdEquipamento,
        OR: filtros,
      },
      select: {
        id: true,
        matricula: true,
        cpf: true,
      },
    });

    if (servidorDoOrgao) {
      return servidorDoOrgao;
    }
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
