import { normalizarIdentificadorPonto } from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { processarMarcacaoBrutaService } from "./processar-marcacao-bruta.service";

function normalizarValores(valores: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      valores
        .map((valor) => normalizarIdentificadorPonto(valor))
        .filter((valor): valor is string => Boolean(valor)),
    ),
  );
}

function valoresOriginaisNormalizados(
  valores: Array<string | null | undefined>,
) {
  return Array.from(
    new Set(
      valores
        .map((valor) => valor?.trim())
        .filter((valor): valor is string => Boolean(valor)),
    ),
  );
}

async function listarPendentesPorIdentificadores(params: {
  servidorId: string;
  cpf?: string | null;
  pis?: string | null;
  matricula?: string | null;
  identificadores?: string[];
}) {
  const identificadoresNormalizados = normalizarValores([
    params.cpf,
    params.pis,
    params.matricula,
    ...(params.identificadores ?? []),
  ]);

  if (identificadoresNormalizados.length === 0) {
    return [];
  }

  const resultado: Array<{ id: string }> = [];
  const cpfs = valoresOriginaisNormalizados([
    params.cpf,
    ...identificadoresNormalizados.filter((valor) => /^\d{11}$/.test(valor)),
  ]);
  const pises = valoresOriginaisNormalizados([
    params.pis,
    ...identificadoresNormalizados.filter((valor) => /^\d{11,12}$/.test(valor)),
  ]);
  const matriculas = valoresOriginaisNormalizados([
    params.matricula,
    ...(params.identificadores ?? []),
    ...identificadoresNormalizados,
  ]);
  let cursorId: string | undefined;

  while (true) {
    const lote = await prisma.marcacaoBruta.findMany({
      where: {
        processada: false,
        OR: [
          { servidorId: params.servidorId },
          ...(cpfs.length ? [{ servidorId: null, cpf: { in: cpfs } }] : []),
          ...(pises.length ? [{ servidorId: null, pis: { in: pises } }] : []),
          ...(matriculas.length
            ? [{ servidorId: null, matricula: { in: matriculas } }]
            : []),
        ],
      },
      select: {
        id: true,
      },
      orderBy: [{ dataHora: "asc" }, { id: "asc" }],
      take: 500,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });

    if (lote.length === 0) {
      break;
    }

    for (const bruta of lote) {
      resultado.push({ id: bruta.id });
    }

    cursorId = lote.at(-1)?.id;
  }

  return resultado;
}

export async function vincularMarcacoesBrutasServidorService(params: {
  servidorId: string;
  cpf?: string | null;
  pis?: string | null;
  matricula?: string | null;
  identificadores?: string[];
  usuarioIdAuditoria?: string | null;
}) {
  const pendentes = await listarPendentesPorIdentificadores({
    servidorId: params.servidorId,
    cpf: params.cpf,
    pis: params.pis,
    matricula: params.matricula,
    identificadores: params.identificadores,
  });

  let processadas = 0;
  let aindaPendentes = 0;
  let erros = 0;

  for (const bruta of pendentes) {
    try {
      const resultado = await processarMarcacaoBrutaService({
        marcacaoBrutaId: bruta.id,
        usuarioIdAuditoria: params.usuarioIdAuditoria ?? undefined,
      });

      if (resultado.sucesso) {
        processadas++;
      } else {
        aindaPendentes++;
      }
    } catch {
      erros++;
    }
  }

  return {
    servidorId: params.servidorId,
    total: pendentes.length,
    processadas,
    aindaPendentes,
    erros,
  };
}
