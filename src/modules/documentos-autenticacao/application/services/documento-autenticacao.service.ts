import crypto from "node:crypto";
import QRCode from "qrcode";

import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type AssinaturaDocumentoAutenticacao = {
  nome: string;
  funcao: string | null;
  data: string;
  tipo: string;
};

export type DadosAutenticacaoDocumento = {
  codigo: string;
  crc: string;
  url: string;
  qrCodeDataUrl: string;
  hashDocumento: string;
  assinaturas: AssinaturaDocumentoAutenticacao[];
};

type UnidadeDocumento = {
  sigla: string;
  nome?: string | null;
  orgao?: {
    sigla: string | null;
  } | null;
};

type UsuarioDocumento = {
  nome: string;
  servidor?: {
    cargo?: { descricao: string } | null;
    lotacoes?: {
      cargo?: { descricao: string } | null;
      unidade?: UnidadeDocumento | null;
    }[];
  } | null;
};

type DadosEspelhoPontoAutenticacao = {
  servidor: {
    id: string;
    matricula: string;
    usuarioId?: string;
    nomeFuncional?: string | null;
    orgao?: {
      sigla: string | null;
    } | null;
    usuario: {
      nome: string;
    };
    cargo?: {
      descricao: string;
    } | null;
    lotacoes: {
      unidade: UnidadeDocumento;
      cargo?: {
        descricao: string;
      } | null;
    }[];
  } | null;
  apuracoes: unknown[];
  marcacoes: unknown[];
  ano: number;
  mes: number;
};

type DadosNadaConstaFrequenciaAutenticacao = {
  execucaoId: string;
  servidor: {
    id: string;
    matricula: string;
    nomeFuncional?: string | null;
    usuario: {
      nome: string;
    };
    orgao?: {
      sigla: string | null;
    } | null;
    lotacoes: {
      unidade: UnidadeDocumento;
      cargo?: {
        descricao: string;
      } | null;
    }[];
  } | null;
  orgao?: {
    sigla: string | null;
    nome?: string | null;
  } | null;
  processoSei?: string | null;
  dataInicio?: Date | string | null;
  dataFim?: Date | string | null;
  criadoEm: Date | string;
  resultado: string | null;
  dadosResultado: unknown;
  usuarioResponsavel?: UsuarioDocumento | null;
};

function serializarEstavel(valor: unknown): string {
  if (valor instanceof Date) {
    return valor.toISOString();
  }

  if (Array.isArray(valor)) {
    return `[${valor.map((item) => serializarEstavel(item)).join(",")}]`;
  }

  if (valor && typeof valor === "object") {
    return `{${Object.entries(valor)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([chave, item]) =>
          `${JSON.stringify(chave)}:${serializarEstavel(item)}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(valor);
}

function gerarHashDocumento(payload: unknown) {
  return crypto
    .createHash("sha256")
    .update(serializarEstavel(payload))
    .digest("hex");
}

function gerarCodigoDocumento() {
  return crypto.randomInt(10_000_000, 99_999_999).toString();
}

function gerarCrc(codigo: string, hashDocumento: string) {
  return crypto
    .createHash("sha256")
    .update(`${codigo}:${hashDocumento}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
}

function funcaoUsuario(usuario?: UsuarioDocumento | null) {
  const servidor = usuario?.servidor;
  const cargo =
    servidor?.cargo?.descricao ?? servidor?.lotacoes?.[0]?.cargo?.descricao;
  const unidade = servidor?.lotacoes?.[0]?.unidade?.sigla;

  return [cargo, unidade].filter(Boolean).join(" - ") || null;
}

function deduplicarAssinaturas(assinaturas: AssinaturaDocumentoAutenticacao[]) {
  const mapa = new Map<string, AssinaturaDocumentoAutenticacao>();

  for (const assinatura of assinaturas) {
    const chave = `${assinatura.tipo}:${assinatura.nome}:${assinatura.data}`;
    mapa.set(chave, assinatura);
  }

  return Array.from(mapa.values());
}

function normalizarUrlBase(valor?: string | null) {
  const url = valor?.trim();

  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);

    if (parsed.hostname === "0.0.0.0" || parsed.hostname === "::") {
      return null;
    }

    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function urlBaseAplicacao(requestUrl: string) {
  const urlPublica =
    normalizarUrlBase(process.env.SECP_PUBLIC_URL) ??
    normalizarUrlBase(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizarUrlBase(process.env.AUTH_URL) ??
    normalizarUrlBase(process.env.NEXTAUTH_URL);

  if (urlPublica) {
    return urlPublica;
  }

  const url = new URL(requestUrl);
  return `${url.protocol}//${url.host}`;
}

export async function prepararAutenticacaoEspelhoPonto(params: {
  dados: DadosEspelhoPontoAutenticacao;
  requestUrl: string;
  criadoPorUsuarioId: string;
}): Promise<DadosAutenticacaoDocumento | null> {
  const servidor = params.dados.servidor;

  if (!servidor) {
    return null;
  }

  const competencia = `${params.dados.ano}-${String(params.dados.mes).padStart(
    2,
    "0",
  )}`;
  const homologacao = await prisma.homologacaoServidorMes.findFirst({
    where: {
      servidorId: servidor.id,
      fechamento: {
        anoReferencia: params.dados.ano,
        mesReferencia: params.dados.mes,
      },
    },
    include: {
      homologadoPor: {
        include: {
          servidor: {
            include: {
              cargo: true,
              lotacoes: {
                where: { status: "ATIVO" },
                include: {
                  cargo: true,
                  unidade: true,
                },
                orderBy: { dataInicio: "desc" },
              },
            },
          },
        },
      },
      fechamento: {
        include: {
          unidade: true,
        },
      },
    },
  });
  const eventoEnvio = homologacao
    ? await prisma.auditoriaEvento.findFirst({
        where: {
          entidade: "HomologacaoServidorMes",
          entidadeId: homologacao.id,
          acao: "ESPELHO_PONTO_ENVIADO_CHEFIA",
        },
        include: {
          usuario: {
            include: {
              servidor: {
                include: {
                  cargo: true,
                  lotacoes: {
                    where: { status: "ATIVO" },
                    include: {
                      cargo: true,
                      unidade: true,
                    },
                    orderBy: { dataInicio: "desc" },
                  },
                },
              },
            },
          },
        },
        orderBy: { criadoEm: "asc" },
      })
    : null;

  const assinaturas = deduplicarAssinaturas([
    ...(eventoEnvio?.usuario
      ? [
          {
            nome: eventoEnvio.usuario.nome,
            funcao: funcaoUsuario(eventoEnvio.usuario) ?? "Servidor",
            data: eventoEnvio.criadoEm.toISOString(),
            tipo: "Envio para homologação",
          },
        ]
      : []),
    ...(homologacao?.homologadoPor && homologacao.homologadoEm
      ? [
          {
            nome: homologacao.homologadoPor.nome,
            funcao:
              funcaoUsuario(homologacao.homologadoPor) ??
              "Responsável pela homologação",
            data: homologacao.homologadoEm.toISOString(),
            tipo: "Homologação",
          },
        ]
      : []),
  ]);
  const payloadHash = {
    tipo: "ESPELHO_PONTO",
    competencia,
    servidorId: servidor.id,
    matricula: servidor.matricula,
    apuracoes: params.dados.apuracoes,
    marcacoes: params.dados.marcacoes,
    assinaturas,
  };
  const hashDocumento = gerarHashDocumento(payloadHash);
  const existente = await prisma.documentoAutenticacao.findFirst({
    where: {
      tipoDocumento: "ESPELHO_PONTO",
      entidade: "Servidor",
      entidadeId: servidor.id,
      competencia,
      hashDocumento,
    },
  });
  const codigo = existente?.codigo ?? gerarCodigoDocumento();
  const crc = gerarCrc(codigo, hashDocumento);
  const unidade = servidor.lotacoes[0]?.unidade;
  const dadosDocumento = {
    codigo,
    crc,
    tipoDocumento: "ESPELHO_PONTO",
    entidade: "Servidor",
    entidadeId: servidor.id,
    titulo: "Espelho de ponto",
    competencia,
    orgao: servidor.orgao?.sigla ?? unidade?.orgao?.sigla ?? null,
    unidade: unidade?.sigla ?? null,
    servidorNome: nomeServidor(servidor) || servidor.usuario.nome,
    servidorMatricula: servidor.matricula,
    hashDocumento,
    dadosResumo: {
      ano: params.dados.ano,
      mes: params.dados.mes,
      statusHomologacao: homologacao?.status ?? null,
    },
    assinaturas,
    criadoPorUsuarioId: params.criadoPorUsuarioId,
  };
  const documento =
    existente ??
    (await prisma.documentoAutenticacao.create({
      data: dadosDocumento,
    }));
  const url = `${urlBaseAplicacao(params.requestUrl)}/autenticidade/${
    documento.codigo
  }?crc=${documento.crc}`;

  return {
    codigo: documento.codigo,
    crc: documento.crc,
    url,
    qrCodeDataUrl: await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 180,
    }),
    hashDocumento,
    assinaturas,
  };
}

export async function prepararAutenticacaoNadaConstaFrequencia(params: {
  dados: DadosNadaConstaFrequenciaAutenticacao;
  requestUrl: string;
  criadoPorUsuarioId: string;
}): Promise<DadosAutenticacaoDocumento | null> {
  const servidor = params.dados.servidor;

  if (!servidor) {
    return null;
  }

  const dataInicio = params.dados.dataInicio
    ? new Date(params.dados.dataInicio)
    : null;
  const dataFim = params.dados.dataFim ? new Date(params.dados.dataFim) : null;
  const periodo =
    dataInicio && dataFim
      ? `${dataInicio.toISOString().slice(0, 10)}:${dataFim
          .toISOString()
          .slice(0, 10)}`
      : null;
  const competenciaDocumento =
    dataInicio && dataFim
      ? `${dataInicio.toISOString().slice(0, 10).replaceAll("-", "")}-${dataFim
          .toISOString()
          .slice(0, 10)
          .replaceAll("-", "")}`
      : null;
  const usuarioResponsavel = params.dados.usuarioResponsavel;
  const assinaturas = deduplicarAssinaturas([
    ...(usuarioResponsavel
      ? [
          {
            nome: usuarioResponsavel.nome,
            funcao:
              funcaoUsuario(usuarioResponsavel) ?? "Responsavel pela emissao",
            data: new Date(params.dados.criadoEm).toISOString(),
            tipo: "Emissao",
          },
        ]
      : []),
  ]);
  const payloadHash = {
    tipo: "NADA_CONSTA_FREQUENCIA",
    execucaoId: params.dados.execucaoId,
    servidorId: servidor.id,
    matricula: servidor.matricula,
    processoSei: params.dados.processoSei ?? null,
    periodo,
    resultado: params.dados.resultado,
    dadosResultado: params.dados.dadosResultado,
    assinaturas,
  };
  const hashDocumento = gerarHashDocumento(payloadHash);
  const existente = await prisma.documentoAutenticacao.findFirst({
    where: {
      tipoDocumento: "NADA_CONSTA_FREQUENCIA",
      entidade: "ProcedimentoAdministrativoFrequenciaExecucao",
      entidadeId: params.dados.execucaoId,
      competencia: competenciaDocumento,
      hashDocumento,
    },
  });
  const codigo = existente?.codigo ?? gerarCodigoDocumento();
  const crc = gerarCrc(codigo, hashDocumento);
  const unidade = servidor.lotacoes[0]?.unidade;
  const dadosDocumento = {
    codigo,
    crc,
    tipoDocumento: "NADA_CONSTA_FREQUENCIA",
    entidade: "ProcedimentoAdministrativoFrequenciaExecucao",
    entidadeId: params.dados.execucaoId,
    titulo: "Nada Consta de frequencia",
    competencia: competenciaDocumento,
    orgao: params.dados.orgao?.sigla ?? servidor.orgao?.sigla ?? null,
    unidade: unidade?.sigla ?? null,
    servidorNome: nomeServidor(servidor) || servidor.usuario.nome,
    servidorMatricula: servidor.matricula,
    hashDocumento,
    dadosResumo: {
      processoSei: params.dados.processoSei ?? null,
      periodo,
      dataInicio: dataInicio?.toISOString().slice(0, 10) ?? null,
      dataFim: dataFim?.toISOString().slice(0, 10) ?? null,
    },
    assinaturas,
    criadoPorUsuarioId: params.criadoPorUsuarioId,
  };
  const documento =
    existente ??
    (await prisma.documentoAutenticacao.create({
      data: dadosDocumento,
    }));
  const url = `${urlBaseAplicacao(params.requestUrl)}/autenticidade/${
    documento.codigo
  }?crc=${documento.crc}`;

  return {
    codigo: documento.codigo,
    crc: documento.crc,
    url,
    qrCodeDataUrl: await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 180,
    }),
    hashDocumento,
    assinaturas,
  };
}

export async function buscarDocumentoAutenticacaoPublico(codigo: string) {
  return prisma.documentoAutenticacao.findUnique({
    where: { codigo },
  });
}
