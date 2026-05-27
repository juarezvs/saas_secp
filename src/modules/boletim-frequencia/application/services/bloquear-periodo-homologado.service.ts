import { prisma } from "@/shared/infrastructure/database/prisma";

export class PeriodoHomologadoError extends Error {
  constructor(
    public readonly servidorId: string,
    public readonly anoReferencia: number,
    public readonly mesReferencia: number,
  ) {
    super(
      `Período ${String(mesReferencia).padStart(
        2,
        "0",
      )}/${anoReferencia} já homologado para o servidor.`,
    );
    this.name = "PeriodoHomologadoError";
  }
}

export async function verificarPeriodoHomologado(params: {
  servidorId: string;
  dataReferencia: Date;
}) {
  const anoReferencia = params.dataReferencia.getFullYear();
  const mesReferencia = params.dataReferencia.getMonth() + 1;

  const inicio = new Date(anoReferencia, mesReferencia - 1, 1);
  const fim = new Date(anoReferencia, mesReferencia, 1);

  const homologacao = await prisma.homologacaoServidorMes.findFirst({
    where: {
      servidorId: params.servidorId,
      status: {
        in: ["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"],
      },
      fechamento: {
        anoReferencia,
        mesReferencia,
      },
    },
  });

  if (homologacao) {
    throw new PeriodoHomologadoError(
      params.servidorId,
      anoReferencia,
      mesReferencia,
    );
  }

  return {
    bloqueado: false,
    anoReferencia,
    mesReferencia,
    inicio,
    fim,
  };
}
