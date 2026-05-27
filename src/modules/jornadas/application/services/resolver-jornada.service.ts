import { prisma } from "@/shared/infrastructure/database/prisma";

export type JornadaVigente = {
  jornadaServidorId: string;
  servidorId: string;
  jornadaId: string;
  escalaId: string | null;
  codigo: string;
  nome: string;
  tipo: string;
  cargaDiariaMinutos: number;
  exigeIntervalo: boolean;
  intervaloMinimoMinutos: number | null;
  intervaloMaximoMinutos: number | null;
  dataInicio: Date;
  dataFim: Date | null;
};

export async function resolverJornadaVigenteDoServidor(
  servidorId: string,
  dataReferencia = new Date()
): Promise<JornadaVigente | null> {
  const inicioDia = new Date(dataReferencia);
  inicioDia.setHours(0, 0, 0, 0);

  const jornadaServidor = await prisma.jornadaServidor.findFirst({
    where: {
      servidorId,
      ativo: true,
      dataInicio: {
        lte: inicioDia,
      },
      OR: [
        {
          dataFim: null,
        },
        {
          dataFim: {
            gte: inicioDia,
          },
        },
      ],
    },
    include: {
      jornada: true,
    },
    orderBy: {
      dataInicio: "desc",
    },
  });

  if (!jornadaServidor) {
    return null;
  }

  return {
    jornadaServidorId: jornadaServidor.id,
    servidorId: jornadaServidor.servidorId,
    jornadaId: jornadaServidor.jornadaId,
    escalaId: jornadaServidor.escalaId,
    codigo: jornadaServidor.jornada.codigo,
    nome: jornadaServidor.jornada.nome,
    tipo: jornadaServidor.jornada.tipo,
    cargaDiariaMinutos: jornadaServidor.jornada.cargaDiariaMinutos,
    exigeIntervalo: jornadaServidor.jornada.exigeIntervalo,
    intervaloMinimoMinutos: jornadaServidor.jornada.intervaloMinimoMinutos,
    intervaloMaximoMinutos: jornadaServidor.jornada.intervaloMaximoMinutos,
    dataInicio: jornadaServidor.dataInicio,
    dataFim: jornadaServidor.dataFim,
  };
}