import { prisma } from "@/shared/infrastructure/database/prisma";

export class EspelhoEnviadoParaHomologacaoError extends Error {
  constructor() {
    super(
      "O espelho de ponto desta competencia ja foi enviado para homologacao. Nao e mais permitido criar solicitacoes que alterem o espelho.",
    );
    this.name = "EspelhoEnviadoParaHomologacaoError";
  }
}

export async function verificarEspelhoEnviadoParaHomologacao(params: {
  servidorId: string;
  dataReferencia: Date;
}) {
  const anoReferencia = params.dataReferencia.getUTCFullYear();
  const mesReferencia = params.dataReferencia.getUTCMonth() + 1;
  const homologacao = await prisma.homologacaoServidorMes.findFirst({
    where: {
      servidorId: params.servidorId,
      fechamento: {
        anoReferencia,
        mesReferencia,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!homologacao) {
    return;
  }

  if (["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"].includes(homologacao.status)) {
    throw new EspelhoEnviadoParaHomologacaoError();
  }

  const envioServidor = await prisma.auditoriaEvento.findFirst({
    where: {
      entidade: "HomologacaoServidorMes",
      entidadeId: homologacao.id,
      acao: "ESPELHO_PONTO_ENVIADO_CHEFIA",
    },
    select: {
      id: true,
    },
  });

  if (envioServidor) {
    throw new EspelhoEnviadoParaHomologacaoError();
  }
}
