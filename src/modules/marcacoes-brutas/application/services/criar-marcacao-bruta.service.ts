import { prisma } from "@/shared/infrastructure/database/prisma";
import { gerarHashMarcacaoBruta } from "./gerar-hash-marcacao-bruta.service";

export async function criarMarcacaoBrutaService(params: {
  cpf?: string | null;
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
    | "FACIAL_AUTORIZADO";
  nsr?: string | null;
  codigoExterno?: string | null;
  payloadOriginal?: unknown;
  ignorarMatriculaNoHash?: boolean;
}) {
  const hashRegistro = gerarHashMarcacaoBruta({
    cpf: params.cpf,
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
      (!existente.matricula && params.matricula) ||
      (!existente.servidorId && params.servidorId);
    const marcacaoBruta = deveAtualizarIdentificacao
      ? await prisma.marcacaoBruta.update({
          where: { id: existente.id },
          data: {
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

  const marcacaoBruta = await prisma.marcacaoBruta.create({
    data: {
      cpf: params.cpf ?? null,
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

  return {
    criada: true,
    marcacaoBruta,
  };
}
