import { prisma } from "@/shared/infrastructure/database/prisma";
import { gerarHashMarcacaoBruta } from "./gerar-hash-marcacao-bruta.service";

function somenteDigitos(valor: string | null | undefined) {
  return valor?.replace(/\D/g, "") || null;
}

function payloadComoObjeto(valor: unknown) {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

function erroChaveUnicaHashRegistro(error: unknown) {
  const mensagem =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "";

  return (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002" &&
    "meta" in error &&
    typeof error.meta === "object" &&
    error.meta !== null &&
    (("target" in error.meta &&
      Array.isArray(error.meta.target) &&
      error.meta.target.includes("hash_registro")) ||
      mensagem.includes("hash_registro"))
  );
}

function deveBuscarMesmoEventoFisico(params: {
  origem: string;
  nsr?: string | null;
  equipamentoId?: string | null;
  equipamentoCodigo?: string | null;
  arquivoAfdId?: string | null;
}) {
  return (
    Boolean(params.nsr) &&
    ["EQUIPAMENTO_BIOMETRICO", "IMPORTACAO_AFD"].includes(params.origem) &&
    Boolean(
      params.equipamentoId || params.equipamentoCodigo || params.arquivoAfdId,
    )
  );
}

export async function criarMarcacaoBrutaService(params: {
  cpf?: string | null;
  pis?: string | null;
  matricula?: string | null;
  servidorId?: string | null;
  dataHora: Date;
  equipamentoCodigo?: string | null;
  equipamentoId?: string | null;
  arquivoAfdId?: string | null;
  origem:
    | "EQUIPAMENTO_BIOMETRICO"
    | "IMPORTACAO_AFD"
    | "WEB_AUTORIZADO"
    | "FACIAL_AUTORIZADO"
    | "TOTEM_FACIAL_SECP";
  nsr?: string | null;
  codigoExterno?: string | null;
  payloadOriginal?: unknown;
  ignorarMatriculaNoHash?: boolean;
}) {
  const hashRegistro = gerarHashMarcacaoBruta({
    cpf: params.cpf,
    pis: params.pis,
    matricula: params.ignorarMatriculaNoHash ? null : params.matricula,
    dataHora: params.dataHora,
    equipamentoCodigo: params.equipamentoCodigo,
    origem: params.origem,
    nsr: params.nsr,
    codigoExterno: params.codigoExterno,
  });

  const existente = await prisma.marcacaoBruta.findUnique({
    where: {
      hashRegistro,
    },
  });

  if (existente) {
    const deveAtualizarIdentificacao =
      (!existente.cpf && params.cpf) ||
      (!existente.pis && params.pis) ||
      (!existente.matricula && params.matricula) ||
      (!existente.servidorId && params.servidorId);
    const marcacaoBruta = deveAtualizarIdentificacao
      ? await prisma.marcacaoBruta.update({
          where: { id: existente.id },
          data: {
            cpf: existente.cpf ?? params.cpf ?? null,
            pis: existente.pis ?? params.pis ?? null,
            matricula: existente.matricula ?? params.matricula ?? null,
            servidorId: existente.servidorId ?? params.servidorId ?? null,
          },
        })
      : existente;

    return {
      criada: false,
      marcacaoBruta,
    };
  }

  if (deveBuscarMesmoEventoFisico(params)) {
    const mesmaMarcacaoFisica = await prisma.marcacaoBruta.findFirst({
      where: {
        origem: params.origem,
        nsr: params.nsr ?? null,
        dataHora: params.dataHora,
        marcacaoId: null,
        OR: [
          ...(params.equipamentoId
            ? [{ equipamentoId: params.equipamentoId }]
            : []),
          ...(params.arquivoAfdId
            ? [{ arquivoAfdId: params.arquivoAfdId }]
            : []),
          ...(params.equipamentoCodigo
            ? [{ equipamentoCodigo: params.equipamentoCodigo }]
            : []),
        ],
      },
      orderBy: {
        criadoEm: "asc",
      },
    });

    if (mesmaMarcacaoFisica) {
      const cpfAtual = somenteDigitos(mesmaMarcacaoFisica.cpf);
      const pisAtual = somenteDigitos(mesmaMarcacaoFisica.pis);
      const cpfNovo = somenteDigitos(params.cpf);
      const pisNovo = somenteDigitos(params.pis);
      const matriculaNova = params.matricula ?? null;
      const deveCorrigirIdentificacao =
        cpfAtual !== cpfNovo ||
        pisAtual !== pisNovo ||
        (mesmaMarcacaoFisica.matricula ?? null) !== matriculaNova ||
        (!mesmaMarcacaoFisica.servidorId && Boolean(params.servidorId));

      if (deveCorrigirIdentificacao) {
        const marcacaoBruta = await prisma.$transaction(async (tx) => {
          const atualizada = await tx.marcacaoBruta.update({
            where: {
              id: mesmaMarcacaoFisica.id,
            },
            data: {
              cpf: cpfNovo,
              pis: pisNovo,
              matricula: matriculaNova,
              servidorId: params.servidorId ?? null,
              processada: false,
              processadaEm: null,
              hashRegistro,
              payloadOriginal: {
                ...payloadComoObjeto(mesmaMarcacaoFisica.payloadOriginal),
                ...payloadComoObjeto(params.payloadOriginal),
                autocorrecaoIdentificacao: {
                  corrigidaEm: new Date().toISOString(),
                  motivo:
                    "Mesmo evento fisico identificado por equipamento/NSR/data recebeu CPF/PIS corrigido na nova leitura.",
                  cpfAnterior: mesmaMarcacaoFisica.cpf,
                  pisAnterior: mesmaMarcacaoFisica.pis,
                  matriculaAnterior: mesmaMarcacaoFisica.matricula,
                  hashAnterior: mesmaMarcacaoFisica.hashRegistro,
                  cpfAtual: cpfNovo,
                  pisAtual: pisNovo,
                  matriculaAtual: matriculaNova,
                  hashAtual: hashRegistro,
                },
              } as never,
            },
          });

          await tx.auditoriaEvento.create({
            data: {
              usuarioId: null,
              entidade: "MarcacaoBruta",
              entidadeId: mesmaMarcacaoFisica.id,
              acao: "MARCACAO_BRUTA_IDENTIFICACAO_AUTOCORRIGIDA",
              dadosAntes: {
                cpf: mesmaMarcacaoFisica.cpf,
                pis: mesmaMarcacaoFisica.pis,
                matricula: mesmaMarcacaoFisica.matricula,
                servidorId: mesmaMarcacaoFisica.servidorId,
                hashRegistro: mesmaMarcacaoFisica.hashRegistro,
              } as never,
              dadosDepois: {
                cpf: cpfNovo,
                pis: pisNovo,
                matricula: matriculaNova,
                servidorId: params.servidorId ?? null,
                hashRegistro,
              } as never,
            },
          });

          return atualizada;
        });

        return {
          criada: false,
          corrigida: true,
          marcacaoBruta,
        };
      }

      return {
        criada: false,
        corrigida: false,
        marcacaoBruta: mesmaMarcacaoFisica,
      };
    }
  }

  let marcacaoBruta;

  try {
    marcacaoBruta = await prisma.marcacaoBruta.create({
      data: {
        cpf: params.cpf ?? null,
        pis: params.pis ?? null,
        matricula: params.matricula ?? null,
        servidorId: params.servidorId ?? null,
        dataHora: params.dataHora,
        equipamentoCodigo: params.equipamentoCodigo ?? null,
        equipamentoId: params.equipamentoId ?? null,
        arquivoAfdId: params.arquivoAfdId ?? null,
        origem: params.origem,
        nsr: params.nsr ?? null,
        codigoExterno: params.codigoExterno ?? null,
        hashRegistro,
        payloadOriginal: params.payloadOriginal ?? undefined,
      },
    });
  } catch (error) {
    if (!erroChaveUnicaHashRegistro(error)) {
      throw error;
    }

    const existenteAposConcorrencia = await prisma.marcacaoBruta.findUnique({
      where: {
        hashRegistro,
      },
    });

    if (!existenteAposConcorrencia) {
      throw error;
    }

    return {
      criada: false,
      marcacaoBruta: existenteAposConcorrencia,
    };
  }

  return {
    criada: true,
    marcacaoBruta,
  };
}
