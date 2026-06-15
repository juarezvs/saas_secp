import type { Prisma } from "@/generated/prisma/client";

const CODIGO_JORNADA_PADRAO = "JORNADA_7H";

type JornadaPadraoClient = Pick<
  Prisma.TransactionClient,
  "jornada" | "jornadaServidor"
>;

export async function garantirJornadaPadraoServidorService(
  client: JornadaPadraoClient,
  servidorId: string,
  dataInicioReferencia?: Date,
) {
  const jornadaAssociada = await client.jornadaServidor.findFirst({
    where: { servidorId },
    select: { id: true },
  });

  if (jornadaAssociada) {
    return jornadaAssociada;
  }

  const jornadaPadrao = await client.jornada.findUnique({
    where: { codigo: CODIGO_JORNADA_PADRAO },
    select: { id: true },
  });

  if (!jornadaPadrao) {
    throw new Error(
      `A jornada padrão ${CODIGO_JORNADA_PADRAO} não está cadastrada.`,
    );
  }

  const dataInicio = dataInicioReferencia
    ? new Date(dataInicioReferencia)
    : new Date();
  dataInicio.setUTCHours(0, 0, 0, 0);

  return client.jornadaServidor.create({
    data: {
      servidorId,
      jornadaId: jornadaPadrao.id,
      dataInicio,
      ativo: true,
      justificativa: "Jornada padrão atribuída automaticamente.",
    },
    select: { id: true },
  });
}

export async function ampliarVigenciaJornadaPadraoAutomaticaService(
  client: JornadaPadraoClient,
  servidorId: string,
  dataReferencia: Date,
) {
  const jornadaAutomatica = await client.jornadaServidor.findFirst({
    where: {
      servidorId,
      ativo: true,
      dataInicio: { gt: dataReferencia },
      jornada: { codigo: CODIGO_JORNADA_PADRAO },
      justificativa: {
        contains: "automaticamente",
        mode: "insensitive",
      },
    },
    select: { id: true },
    orderBy: { dataInicio: "asc" },
  });

  if (!jornadaAutomatica) {
    return false;
  }

  const dataInicio = new Date(dataReferencia);
  dataInicio.setUTCHours(0, 0, 0, 0);

  await client.jornadaServidor.update({
    where: { id: jornadaAutomatica.id },
    data: { dataInicio },
  });

  return true;
}
