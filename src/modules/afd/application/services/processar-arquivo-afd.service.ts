import fs from "node:fs/promises";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { criarMarcacaoBrutaService } from "@/modules/marcacoes-brutas/application/services/criar-marcacao-bruta.service";
import { processarMarcacaoBrutaService } from "@/modules/marcacoes-brutas/application/services/processar-marcacao-bruta.service";
import {
  obterTipoRegistroAfd,
  parseLinhaAfd,
  parseTrailerAfd,
} from "./parse-afd.service";

export async function processarArquivoAfdService(params: {
  arquivoAfdId: string;
  usuarioId?: string | null;
}) {
  const arquivo = await prisma.arquivoAfd.findUnique({
    where: {
      id: params.arquivoAfdId,
    },
    include: {
      importacao: true,
    },
  });

  if (!arquivo) {
    throw new Error("Arquivo AFD não encontrado.");
  }

  await prisma.arquivoAfd.update({
    where: {
      id: arquivo.id,
    },
    data: {
      status: "PROCESSANDO",
      iniciadoEm: new Date(),
    },
  });

  await prisma.importacaoAfd.update({
    where: {
      id: arquivo.importacaoId,
    },
    data: {
      status: "EM_PROCESSAMENTO",
      iniciadoEm: arquivo.importacao.iniciadoEm ?? new Date(),
    },
  });

  let totalLinhas = 0;
  let totalMarcacoesBrutas = 0;
  let totalDuplicadas = 0;
  let totalProcessadas = 0;
  let totalPendentes = 0;
  let totalErros = 0;

  try {
    const buffer = await fs.readFile(arquivo.caminhoArquivo);
    const conteudo = buffer.toString("latin1");
    const linhas = conteudo.split(/\r\n|\n|\r/);
    const contadoresPorTipo = {
      tipo2: 0,
      tipo3: 0,
      tipo4: 0,
      tipo5: 0,
      tipo6: 0,
      tipo7: 0,
    };

    let trailerEncontrado = false;
    let trailerInvalido = false;
    let totalCrcInvalidos = 0;
    for (const linha of linhas) {
      if (!linha.trim()) {
        continue;
      }

      totalLinhas++;

      const tipoRegistro = obterTipoRegistroAfd(linha);

      if (tipoRegistro === "2") contadoresPorTipo.tipo2++;
      if (tipoRegistro === "3") contadoresPorTipo.tipo3++;
      if (tipoRegistro === "4") contadoresPorTipo.tipo4++;
      if (tipoRegistro === "5") contadoresPorTipo.tipo5++;
      if (tipoRegistro === "6") contadoresPorTipo.tipo6++;
      if (tipoRegistro === "7") contadoresPorTipo.tipo7++;

      const trailer = parseTrailerAfd(linha);

      if (trailer) {
        trailerEncontrado = true;

        trailerInvalido =
          trailer.quantidadeTipo2 !== contadoresPorTipo.tipo2 ||
          trailer.quantidadeTipo3 !== contadoresPorTipo.tipo3 ||
          trailer.quantidadeTipo4 !== contadoresPorTipo.tipo4 ||
          trailer.quantidadeTipo5 !== contadoresPorTipo.tipo5 ||
          trailer.quantidadeTipo6 !== contadoresPorTipo.tipo6 ||
          trailer.quantidadeTipo7 !== contadoresPorTipo.tipo7;

        continue;
      }

      const parseada = parseLinhaAfd(linha);

      if (parseada && !parseada.crcValido) {
        totalCrcInvalidos++;
      }

      if (!parseada) {
        continue;
      }

      try {
        const resultadoBruta = await criarMarcacaoBrutaService({
          cpf: parseada.cpf,
          matricula: null,
          dataHora: parseada.dataHora,
          equipamentoCodigo:
            arquivo.equipamentoCodigo ?? parseada.equipamentoCodigo ?? null,
          arquivoAfdId: arquivo.id,
          origem: "IMPORTACAO_AFD",
          nsr: parseada.nsr,
          codigoExterno: parseada.nsr,
          payloadOriginal: {
            arquivoAfdId: arquivo.id,
            nomeOriginal: arquivo.nomeOriginal,
            tipoRegistro: parseada.tipoRegistro,
            crc: parseada.crc,
            crcValido: parseada.crcValido,
            crcCalculado: parseada.crcCalculado,
            crcInformado: parseada.crcInformado,
            linhaOriginal: parseada.linhaOriginal,
          },
        });

        if (resultadoBruta.criada) {
          totalMarcacoesBrutas++;
        } else {
          totalDuplicadas++;
        }

        const processamento = await processarMarcacaoBrutaService({
          marcacaoBrutaId: resultadoBruta.marcacaoBruta.id,
          usuarioIdAuditoria: params.usuarioId ?? undefined,
        });

        if (processamento.sucesso) {
          totalProcessadas++;
        } else {
          totalPendentes++;
        }
      } catch {
        totalErros++;
      }
    }

    if (trailerInvalido || !trailerEncontrado) {
      totalErros++;
    }

    const statusArquivo =
      totalErros > 0 || totalPendentes > 0
        ? "PROCESSADO_COM_ERROS"
        : "PROCESSADO";

    const mensagemErroValidacao =
      trailerInvalido || !trailerEncontrado
        ? [
            totalCrcInvalidos > 0
              ? `Foram encontradas ${totalCrcInvalidos} marcações tipo 3 com CRC inválido.`
              : null,
            trailerInvalido
              ? "Trailer do AFD divergente dos totais apurados."
              : null,
            !trailerEncontrado
              ? "Trailer tipo 9 não encontrado no arquivo."
              : null,
          ]
            .filter((mensagem): mensagem is string => Boolean(mensagem))
            .join(" ")
        : null;

    const mensagemAlertaCrc =
      totalCrcInvalidos > 0
        ? `Alerta: foram encontradas ${totalCrcInvalidos} marcações tipo 3 com CRC diferente do calculado pelo SECP. As marcações foram importadas normalmente, pois o arquivo é considerado original e o CRC foi mantido apenas como diagnóstico.`
        : null;

    await prisma.arquivoAfd.update({
      where: {
        id: arquivo.id,
      },
      data: {
        status: statusArquivo,
        totalLinhas,
        totalMarcacoesBrutas,
        totalDuplicadas,
        totalProcessadas,
        totalPendentes,
        totalErros,
        erro:
          [mensagemErroValidacao, mensagemAlertaCrc]
            .filter((mensagem): mensagem is string => Boolean(mensagem))
            .join(" ") || null,
        finalizadoEm: new Date(),
      },
    });

    await atualizarTotaisImportacaoAfd(arquivo.importacaoId);

    return {
      sucesso: true,
      totalLinhas,
      totalMarcacoesBrutas,
      totalDuplicadas,
      totalProcessadas,
      totalPendentes,
      totalErros,
    };
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : "Erro ao processar AFD.";

    await prisma.arquivoAfd.update({
      where: {
        id: arquivo.id,
      },
      data: {
        status: "ERRO",
        erro: mensagem,
        finalizadoEm: new Date(),
      },
    });

    await atualizarTotaisImportacaoAfd(arquivo.importacaoId);

    throw error;
  }
}

async function atualizarTotaisImportacaoAfd(importacaoId: string) {
  const arquivos = await prisma.arquivoAfd.findMany({
    where: {
      importacaoId,
    },
  });

  const totalizadores = arquivos.reduce(
    (acc, item) => {
      acc.totalLinhas += item.totalLinhas;
      acc.totalMarcacoesBrutas += item.totalMarcacoesBrutas;
      acc.totalDuplicadas += item.totalDuplicadas;
      acc.totalProcessadas += item.totalProcessadas;
      acc.totalPendentes += item.totalPendentes;
      acc.totalErros += item.totalErros;

      if (item.status === "ERRO") {
        acc.temErro = true;
      }

      if (item.status === "PROCESSANDO") {
        acc.temProcessando = true;
      }

      if (item.status === "PROCESSADO_COM_ERROS") {
        acc.temProcessadoComErros = true;
      }

      return acc;
    },
    {
      totalLinhas: 0,
      totalMarcacoesBrutas: 0,
      totalDuplicadas: 0,
      totalProcessadas: 0,
      totalPendentes: 0,
      totalErros: 0,
      temErro: false,
      temProcessando: false,
      temProcessadoComErros: false,
    },
  );

  const status = totalizadores.temProcessando
    ? "EM_PROCESSAMENTO"
    : totalizadores.temErro
      ? "ERRO"
      : totalizadores.temProcessadoComErros || totalizadores.totalPendentes > 0
        ? "PROCESSADA_COM_ERROS"
        : "PROCESSADA";

  await prisma.importacaoAfd.update({
    where: {
      id: importacaoId,
    },
    data: {
      status,
      totalLinhas: totalizadores.totalLinhas,
      totalMarcacoesBrutas: totalizadores.totalMarcacoesBrutas,
      totalDuplicadas: totalizadores.totalDuplicadas,
      totalProcessadas: totalizadores.totalProcessadas,
      totalPendentes: totalizadores.totalPendentes,
      totalErros: totalizadores.totalErros,
      finalizadoEm: status === "EM_PROCESSAMENTO" ? null : new Date(),
    },
  });
}
