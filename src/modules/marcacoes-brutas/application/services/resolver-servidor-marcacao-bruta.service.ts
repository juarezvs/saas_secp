import { prisma } from "@/shared/infrastructure/database/prisma";
import { normalizarIdentificadorPonto } from "@/modules/servidores/infrastructure/repositories/servidor.repository";

function somenteDigitos(valor: string | null | undefined) {
  return valor?.replace(/\D/g, "") || null;
}

function normalizarCpf(valor: string | null | undefined) {
  const digitos = somenteDigitos(valor);

  if (!digitos) return null;
  if (digitos.length === 11) return digitos;
  if (digitos.length === 12 && digitos.startsWith("0")) return digitos.slice(1);

  return null;
}

function normalizarPis(valor: string | null | undefined) {
  const digitos = somenteDigitos(valor);

  if (!digitos) return null;

  const normalizado =
    digitos.length === 12 && digitos.startsWith("0")
      ? digitos.slice(1)
      : digitos.length <= 11
        ? digitos.padStart(11, "0")
        : digitos;

  if (normalizado.length < 11 || normalizado.length > 12) return null;
  if (/^(\d)\1+$/.test(normalizado)) return null;

  return normalizado;
}

function matriculaTemPrefixo(matricula: string | null) {
  return Boolean(matricula && /[a-z]/i.test(matricula));
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

function configuracaoRecord(configuracao: unknown) {
  return configuracao && typeof configuracao === "object"
    ? (configuracao as Record<string, unknown>)
    : {};
}

function configuracaoDefineIdentificadores(configuracao: Record<string, unknown>) {
  return [
    "identificadorCpf",
    "identificadorPis",
    "identificadorMatriculaComSigla",
    "identificadorMatriculaNumerica",
  ].some((campo) => typeof configuracao[campo] === "boolean");
}

export async function resolverServidorMarcacaoBrutaService(params: {
  cpf?: string | null;
  pis?: string | null;
  matricula?: string | null;
  equipamentoId?: string | null;
}) {
  const cpf = normalizarCpf(params.cpf) ?? normalizarCpf(params.matricula);
  const pis =
    normalizarPis(params.pis) ??
    normalizarPis(params.cpf);
  const matricula = params.matricula?.trim() || null;
  const equipamento = params.equipamentoId
    ? await prisma.equipamentoBiometrico.findUnique({
        where: { id: params.equipamentoId },
        select: {
          orgaoId: true,
          configuracao: true,
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
  const configuracaoEquipamento = configuracaoRecord(equipamento?.configuracao);
  const configIdentificadoresExplicita = configuracaoDefineIdentificadores(
    configuracaoEquipamento,
  );
  const aceitaCpf =
    typeof configuracaoEquipamento.identificadorCpf === "boolean"
      ? configuracaoEquipamento.identificadorCpf
      : true;
  const aceitaPis =
    typeof configuracaoEquipamento.identificadorPis === "boolean"
      ? configuracaoEquipamento.identificadorPis
      : true;
  const aceitaMatriculaComSigla =
    typeof configuracaoEquipamento.identificadorMatriculaComSigla === "boolean"
      ? configuracaoEquipamento.identificadorMatriculaComSigla
      : true;
  const aceitaMatriculaNumerica =
    typeof configuracaoEquipamento.identificadorMatriculaNumerica === "boolean"
      ? configuracaoEquipamento.identificadorMatriculaNumerica
      : true;
  const orgaoIdEquipamento =
    equipamento?.orgaoId ?? equipamento?.unidade?.orgaoId ?? null;
  const siglaOrgaoEquipamento =
    equipamento?.orgao?.sigla ?? equipamento?.unidade?.orgao.sigla ?? null;
  const matriculaNoOrgao = normalizarMatriculaPorOrgao(
    matricula,
    siglaOrgaoEquipamento,
  );
  const identificadoresRecebidos = Array.from(
    new Set(
      [params.matricula, params.cpf, params.pis]
        .map((valor) => normalizarIdentificadorPonto(valor))
        .filter((valor): valor is string => Boolean(valor)),
    ),
  );

  if (identificadoresRecebidos.length > 0) {
    const vinculoIdentificador =
      await prisma.identificadorPontoServidor.findFirst({
        where: {
          ativo: true,
          valorNormalizado: { in: identificadoresRecebidos },
          servidor: {
            ativo: true,
            ...(orgaoIdEquipamento ? { orgaoId: orgaoIdEquipamento } : {}),
          },
        },
        select: {
          servidor: {
            select: {
              id: true,
              matricula: true,
              cpf: true,
              pis: true,
            },
          },
        },
      });

    if (vinculoIdentificador?.servidor) {
      return vinculoIdentificador.servidor;
    }
  }

  if (cpf && aceitaCpf) {
    const filtroCpf = [{ cpf }, { usuario: { cpf } }];

    if (orgaoIdEquipamento) {
      const servidorDoOrgao = await prisma.servidor.findFirst({
        where: {
          ativo: true,
          orgaoId: orgaoIdEquipamento,
          OR: filtroCpf,
        },
        select: {
          id: true,
          matricula: true,
          cpf: true,
          pis: true,
        },
      });

      if (servidorDoOrgao) {
        return servidorDoOrgao;
      }
    }

    const servidorPorCpf = await prisma.servidor.findFirst({
      where: {
        ativo: true,
        OR: filtroCpf,
      },
      select: {
        id: true,
        matricula: true,
        cpf: true,
        pis: true,
      },
    });

    if (servidorPorCpf) {
      return servidorPorCpf;
    }
  }

  if (pis && aceitaPis) {
    if (orgaoIdEquipamento) {
      const servidorDoOrgao = await prisma.servidor.findFirst({
        where: {
          ativo: true,
          orgaoId: orgaoIdEquipamento,
          pis,
        },
        select: {
          id: true,
          matricula: true,
          cpf: true,
          pis: true,
        },
      });

      if (servidorDoOrgao) {
        return servidorDoOrgao;
      }
    }

    return (
      (await prisma.servidor.findFirst({
        where: {
          ativo: true,
          pis,
        },
        select: {
          id: true,
          matricula: true,
          cpf: true,
          pis: true,
        },
      })) ?? null
    );
  }

  if (!matricula) {
    return null;
  }

  const filtrosMatricula = [];
  const ehMatriculaComPrefixo = matriculaTemPrefixo(matricula);

  if (ehMatriculaComPrefixo && aceitaMatriculaComSigla) {
    filtrosMatricula.push({
      matricula: { equals: matricula, mode: "insensitive" as const },
    });
    filtrosMatricula.push({
      usuario: {
        matricula: { equals: matricula, mode: "insensitive" as const },
      },
    });
  }

  if (
    aceitaMatriculaNumerica &&
    matriculaNoOrgao &&
    matriculaNoOrgao !== matricula
  ) {
    filtrosMatricula.unshift({
      matricula: { equals: matriculaNoOrgao, mode: "insensitive" as const },
    });
    filtrosMatricula.unshift({
      usuario: {
        matricula: { equals: matriculaNoOrgao, mode: "insensitive" as const },
      },
    });
  }

  if (filtrosMatricula.length === 0) {
    return null;
  }

  if (orgaoIdEquipamento) {
    const servidorDoOrgao = await prisma.servidor.findFirst({
      where: {
        ativo: true,
        orgaoId: orgaoIdEquipamento,
        OR: filtrosMatricula,
      },
      select: {
        id: true,
        matricula: true,
        cpf: true,
        pis: true,
      },
    });

    if (servidorDoOrgao) {
      return servidorDoOrgao;
    }
  }

  if (!ehMatriculaComPrefixo || configIdentificadoresExplicita) {
    return null;
  }

  return prisma.servidor.findFirst({
    where: {
      ativo: true,
      OR: filtrosMatricula,
    },
    select: {
      id: true,
      matricula: true,
      cpf: true,
      pis: true,
    },
  });
}
