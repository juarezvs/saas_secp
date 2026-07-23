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
  cargaSemanalMinutos: number | null;
  cargaMensalMinutos: number | null;
  controlaHorario: boolean;
  permiteFlexibilidade: boolean;
  permiteBancoHoras: boolean;
  permiteHoraExtra: boolean;
  exigeIntervalo: boolean;
  intervaloMinimoMinutos: number | null;
  intervaloMaximoMinutos: number | null;
  horarioDiferenciadoPermitido: boolean;
  horarioDiferenciadoAutorizado: boolean;
  entradaMinimaDiferenciada: string | null;
  saidaMaximaDiferenciada: string | null;
  cruzaMeiaNoite: boolean;
  fundamentoNormativo: string | null;
  versao: number;
  tipoVinculacao: string;
  status: string;
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
      status: "ATIVO",
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
    cargaSemanalMinutos: jornadaServidor.jornada.cargaSemanalMinutos,
    cargaMensalMinutos: jornadaServidor.jornada.cargaMensalMinutos,
    controlaHorario: jornadaServidor.jornada.controlaHorario,
    permiteFlexibilidade: jornadaServidor.jornada.permiteFlexibilidade,
    permiteBancoHoras: jornadaServidor.jornada.permiteBancoHoras,
    permiteHoraExtra: jornadaServidor.jornada.permiteHoraExtra,
    exigeIntervalo: jornadaServidor.jornada.exigeIntervalo,
    intervaloMinimoMinutos: jornadaServidor.jornada.intervaloMinimoMinutos,
    intervaloMaximoMinutos: jornadaServidor.jornada.intervaloMaximoMinutos,
    horarioDiferenciadoPermitido:
      jornadaServidor.jornada.horarioDiferenciadoPermitido,
    horarioDiferenciadoAutorizado:
      jornadaServidor.horarioDiferenciadoAutorizado,
    entradaMinimaDiferenciada:
      jornadaServidor.jornada.entradaMinimaDiferenciada,
    saidaMaximaDiferenciada:
      jornadaServidor.jornada.saidaMaximaDiferenciada,
    cruzaMeiaNoite: jornadaServidor.jornada.cruzaMeiaNoite,
    fundamentoNormativo: jornadaServidor.jornada.fundamentoNormativo,
    versao: jornadaServidor.jornada.versao,
    tipoVinculacao: jornadaServidor.tipoVinculacao,
    status: jornadaServidor.status,
    dataInicio: jornadaServidor.dataInicio,
    dataFim: jornadaServidor.dataFim,
  };
}
