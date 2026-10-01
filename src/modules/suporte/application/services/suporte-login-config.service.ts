import { prisma } from "@/shared/infrastructure/database/prisma";

const NOME_INTEGRACAO_SUPORTE = "Ferramenta de suporte";
const URL_SUPORTE_PADRAO = "https://esosti.trf1.jus.br/";

function configuracaoComoObjeto(valor: unknown) {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

function normalizarUrlSuporte(valor: string | null | undefined) {
  const url = valor?.trim();

  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function extrairUrlSuporte(
  integracao: { baseUrl: string | null; configuracao: unknown; ativo: boolean } | null,
) {
  if (!integracao?.ativo) {
    return "";
  }

  const configuracao = configuracaoComoObjeto(integracao.configuracao);
  return normalizarUrlSuporte(
    (typeof configuracao.url === "string" ? configuracao.url : null) ??
      integracao.baseUrl,
  );
}

export async function obterUrlSuporteLogin(params?: {
  matricula?: string | null;
  orgaoId?: string | null;
}) {
  const matricula = params?.matricula?.trim().toUpperCase();
  const orgaoUsuario = matricula
    ? await prisma.usuario.findFirst({
        where: {
          matricula: {
            equals: matricula,
            mode: "insensitive",
          },
          ativo: true,
        },
        select: {
          servidor: {
            select: {
              orgaoId: true,
            },
          },
        },
      })
    : null;
  const orgaoId = params?.orgaoId ?? orgaoUsuario?.servidor?.orgaoId ?? null;
  const [configuracaoOrgao, configuracaoGlobal] = await Promise.all([
    orgaoId
      ? prisma.integracaoSistema.findFirst({
          where: {
            tipo: "OUTRO",
            nome: NOME_INTEGRACAO_SUPORTE,
            orgaoId,
          },
          orderBy: {
            atualizadoEm: "desc",
          },
        })
      : Promise.resolve(null),
    prisma.integracaoSistema.findFirst({
      where: {
        tipo: "OUTRO",
        nome: NOME_INTEGRACAO_SUPORTE,
        orgaoId: null,
      },
      orderBy: {
        atualizadoEm: "desc",
      },
    }),
  ]);

  return (
    extrairUrlSuporte(configuracaoOrgao) ||
    extrairUrlSuporte(configuracaoGlobal) ||
    URL_SUPORTE_PADRAO
  );
}

export async function listarConfiguracoesSuporteLogin() {
  const [orgaos, configuracoes] = await Promise.all([
    prisma.orgao.findMany({
      where: {
        ativo: true,
      },
      orderBy: {
        sigla: "asc",
      },
      select: {
        id: true,
        sigla: true,
        nome: true,
      },
    }),
    prisma.integracaoSistema.findMany({
      where: {
        tipo: "OUTRO",
        nome: NOME_INTEGRACAO_SUPORTE,
      },
      orderBy: [{ orgao: { sigla: "asc" } }, { atualizadoEm: "desc" }],
      include: {
        orgao: {
          select: {
            id: true,
            sigla: true,
            nome: true,
          },
        },
      },
    }),
  ]);

  return {
    orgaos,
    configuracoes: configuracoes.map((configuracao) => ({
      id: configuracao.id,
      orgaoId: configuracao.orgaoId,
      orgaoSigla: configuracao.orgao?.sigla ?? "Global",
      orgaoNome: configuracao.orgao?.nome ?? "Configuração padrão",
      url: extrairUrlSuporte(configuracao) || configuracao.baseUrl || "",
      ativo: configuracao.ativo,
      atualizadoEm: configuracao.atualizadoEm,
    })),
  };
}

export async function salvarConfiguracaoSuporteLogin(params: {
  orgaoId?: string | null;
  url: string;
  ativo: boolean;
}) {
  const orgaoId = params.orgaoId?.trim() || null;
  const url = normalizarUrlSuporte(params.url);

  if (!url) {
    throw new Error("Informe uma URL válida iniciada por http:// ou https://.");
  }

  const existente = await prisma.integracaoSistema.findFirst({
    where: {
      tipo: "OUTRO",
      nome: NOME_INTEGRACAO_SUPORTE,
      orgaoId,
    },
    select: {
      id: true,
    },
  });
  const dados = {
    nome: NOME_INTEGRACAO_SUPORTE,
    tipo: "OUTRO" as const,
    direcao: "SAIDA" as const,
    status: params.ativo ? ("ATIVA" as const) : ("INATIVA" as const),
    baseUrl: url,
    descricao:
      "URL usada pelo botão Solicitar Suporte na tela de login do SECP.",
    ativo: params.ativo,
    configuracao: {
      url,
    },
    orgaoId,
  };

  if (existente) {
    return prisma.integracaoSistema.update({
      where: {
        id: existente.id,
      },
      data: dados,
    });
  }

  return prisma.integracaoSistema.create({
    data: dados,
  });
}
