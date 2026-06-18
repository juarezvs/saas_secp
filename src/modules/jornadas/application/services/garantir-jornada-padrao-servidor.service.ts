import type { Prisma } from "@/generated/prisma/client";
import { servidorExigeDedicacaoIntegral } from "./dedicacao-integral.service";

const CODIGO_JORNADA_PADRAO = "JORNADA_7H";
const CODIGO_JORNADA_DEDICACAO_INTEGRAL = "JORNADA_8H";

type JornadaPadraoClient = Pick<
  Prisma.TransactionClient,
  "jornada" | "jornadaServidor" | "servidor"
>;

async function servidorTemDedicacaoIntegral(
  client: JornadaPadraoClient,
  servidorId: string,
) {
  const servidor = await client.servidor.findUnique({
    where: { id: servidorId },
    select: {
      cargo: {
        select: {
          descricao: true,
        },
      },
      lotacoes: {
        where: {
          status: "ATIVO",
        },
        select: {
          cargo: {
            select: {
              descricao: true,
            },
          },
        },
        orderBy: {
          dataInicio: "desc",
        },
      },
    },
  });

  return servidorExigeDedicacaoIntegral({
    descricaoCargoServidor: servidor?.cargo?.descricao,
    descricoesCargosLotacoes:
      servidor?.lotacoes.map((lotacao) => lotacao.cargo?.descricao) ?? [],
  });
}

async function buscarJornadaPadrao(client: JornadaPadraoClient, codigo: string) {
  const jornadaPadrao = await client.jornada.findUnique({
    where: { codigo },
    select: { id: true },
  });

  if (!jornadaPadrao) {
    throw new Error(`A jornada padrão ${codigo} não está cadastrada.`);
  }

  return jornadaPadrao;
}

export async function garantirJornadaPadraoServidorService(
  client: JornadaPadraoClient,
  servidorId: string,
  dataInicioReferencia?: Date,
) {
  const exigeDedicacaoIntegral = await servidorTemDedicacaoIntegral(
    client,
    servidorId,
  );

  const jornadaAssociada = await client.jornadaServidor.findFirst({
    where: { servidorId },
    include: {
      jornada: {
        select: {
          codigo: true,
        },
      },
    },
    orderBy: {
      dataInicio: "desc",
    },
  });

  if (jornadaAssociada) {
    const podePromoverJornadaAutomatica =
      exigeDedicacaoIntegral &&
      jornadaAssociada.ativo &&
      jornadaAssociada.dataFim === null &&
      jornadaAssociada.jornada.codigo === CODIGO_JORNADA_PADRAO &&
      jornadaAssociada.justificativa
        ?.toLocaleLowerCase("pt-BR")
        .includes("automaticamente");

    if (podePromoverJornadaAutomatica) {
      const jornadaDedicacaoIntegral = await buscarJornadaPadrao(
        client,
        CODIGO_JORNADA_DEDICACAO_INTEGRAL,
      );

      return client.jornadaServidor.update({
        where: { id: jornadaAssociada.id },
        data: {
          jornadaId: jornadaDedicacaoIntegral.id,
          justificativa:
            "Jornada de 8h atribuida automaticamente por dedicacao integral FC/CJ.",
        },
        select: { id: true },
      });
    }

    return { id: jornadaAssociada.id };
  }

  const codigoJornadaPadrao = exigeDedicacaoIntegral
    ? CODIGO_JORNADA_DEDICACAO_INTEGRAL
    : CODIGO_JORNADA_PADRAO;
  const jornadaPadrao = await buscarJornadaPadrao(client, codigoJornadaPadrao);

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
      justificativa: exigeDedicacaoIntegral
        ? "Jornada de 8h atribuida automaticamente por dedicacao integral FC/CJ."
        : "Jornada padrão atribuída automaticamente.",
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
