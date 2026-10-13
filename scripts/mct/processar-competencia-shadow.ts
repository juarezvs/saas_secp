import { prisma } from "@/shared/infrastructure/database/prisma";
import { executarComparacaoShadow } from "@/modules/mct/application/services/executar-comparacao-shadow.service";
import { carregarClassificacaoMct } from "@/modules/mct/application/services/carregar-classificacao-mct.service";
import { mctExecucaoPrismaRepository } from "@/modules/mct/infrastructure/repositories/mct-execucao-prisma.repository";
import { mctComparacaoPrismaRepository } from "@/modules/mct/infrastructure/repositories/mct-comparacao-prisma.repository";
import type {
  EventoTemporal,
  TipoEventoTemporal,
} from "@/modules/mct/domain/mct.types";

function argumento(nome: string) {
  const prefixo = `--${nome}=`;
  return process.argv
    .find((item) => item.startsWith(prefixo))
    ?.slice(prefixo.length);
}

function tipoTemporal(tipo: string, indice: number): TipoEventoTemporal {
  if (tipo === "ENTRADA") return "ENTRADA";
  if (tipo === "SAIDA") return "SAIDA";
  return indice % 2 === 0 ? "ENTRADA" : "SAIDA";
}

async function main() {
  const matricula = argumento("matricula")?.trim().toUpperCase();
  const competencia = argumento("competencia")?.trim();
  const confirmar = process.argv.includes("--confirmar");

  if (!matricula || !competencia?.match(/^\d{4}-\d{2}$/)) {
    throw new Error(
      "Uso: npm run mct:shadow:competencia -- --matricula=AM200401 --competencia=2026-09 --confirmar",
    );
  }
  if (!confirmar) {
    throw new Error(
      "Inclua --confirmar para executar. Sem essa opção nada é gravado.",
    );
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Este comando é bloqueado quando NODE_ENV=production.");
  }

  const [ano, mes] = competencia.split("-").map(Number);
  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 1));
  const servidor = await prisma.servidor.findFirst({
    where: { matricula: { equals: matricula, mode: "insensitive" } },
    select: { id: true, orgaoId: true, matricula: true },
  });
  if (!servidor) throw new Error(`Servidor ${matricula} não encontrado.`);

  const politica = await prisma.mctPoliticaVersao.findFirst({
    where: {
      orgaoId: servidor.orgaoId,
      estado: "PUBLICADA",
      vigenciaInicio: { lte: fim },
      OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: inicio } }],
    },
    orderBy: { versao: "desc" },
  });
  if (!politica)
    throw new Error(
      "Nenhuma política MCT vigente foi encontrada para o órgão.",
    );

  const [apuracoes, marcacoes] = await Promise.all([
    prisma.apuracaoDiaria.findMany({
      where: {
        servidorId: servidor.id,
        dataReferencia: { gte: inicio, lt: fim },
      },
      orderBy: { dataReferencia: "asc" },
    }),
    prisma.marcacao.findMany({
      where: {
        servidorId: servidor.id,
        dataReferencia: { gte: inicio, lt: fim },
        status: { in: ["VALIDA", "AJUSTADA", "PENDENTE"] },
      },
      orderBy: { dataHora: "asc" },
    }),
  ]);
  if (!apuracoes.length)
    throw new Error("A competência não possui apurações legadas.");

  const configuracao = politica.configuracao as Record<string, unknown>;
  const classificacoesPorDia = new Map<
    string,
    Awaited<ReturnType<typeof carregarClassificacaoMct>>
  >();
  let criadas = 0;
  let reutilizadas = 0;
  let divergencias = 0;

  for (const apuracao of apuracoes) {
    const chave = apuracao.dataReferencia.toISOString().slice(0, 10);
    let classificacao = classificacoesPorDia.get(chave);
    if (!classificacao) {
      classificacao = await carregarClassificacaoMct({
        orgaoId: servidor.orgaoId,
        politicaVersaoId: politica.id,
        dataReferencia: apuracao.dataReferencia,
      });
      classificacoesPorDia.set(chave, classificacao);
    }
    const eventos: EventoTemporal[] = marcacoes
      .filter(
        (item) => item.dataReferencia.toISOString().slice(0, 10) === chave,
      )
      .map((item, indice) => ({
        id: item.id,
        idOrigem: item.id,
        ocorridoEm: item.dataHora,
        tipo: tipoTemporal(item.tipo, indice),
        fonte: item.fonte ?? "SECP",
      }));

    const retorno = await executarComparacaoShadow({
      orgaoId: servidor.orgaoId,
      servidorId: servidor.id,
      dataReferencia: apuracao.dataReferencia,
      politica: {
        id: politica.id,
        versao: politica.versao,
        orgaoId: politica.orgaoId,
        vigenciaInicio: politica.vigenciaInicio,
        vigenciaFim: politica.vigenciaFim,
        cargaExigivelMinutos: Number(configuracao.cargaExigivelMinutos ?? 0),
        intervaloMinimoMinutos:
          Number(configuracao.intervaloMinimoMinutos ?? 0) || null,
        intervaloMaximoMinutos:
          Number(configuracao.intervaloMaximoMinutos ?? 0) || null,
        flexibilidadeEntradaMinutos: Number(
          configuracao.flexibilidadeEntradaMinutos ?? 0,
        ),
        flexibilidadeSaidaMinutos: Number(
          configuracao.flexibilidadeSaidaMinutos ?? 0,
        ),
        permiteCompensacaoNoDia: Boolean(configuracao.permiteCompensacaoNoDia),
      },
      plano: {
        dataReferencia: apuracao.dataReferencia,
        trabalha: apuracao.cargaPrevistaMinutos > 0,
        jornadaPrevistaMinutos: apuracao.cargaPrevistaMinutos,
        jornadaExigivelMinutos: apuracao.cargaPrevistaMinutos,
        minutosReconhecidosComoExercicio: 0,
        posicaoCiclo: null,
        codigoDiaCiclo: null,
        ocorrenciasAplicadas: [],
      },
      eventos,
      classificacao,
      legado: {
        cargaPrevistaMinutos: apuracao.cargaPrevistaMinutos,
        minutosTrabalhados: apuracao.minutosTrabalhados,
        minutosCredito: apuracao.minutosCredito,
        minutosDebito: apuracao.minutosDebito,
        resultado: apuracao.resultado,
        status: apuracao.status,
      },
      repositorioExecucao: mctExecucaoPrismaRepository,
      repositorioComparacao: mctComparacaoPrismaRepository,
    });

    if (retorno.persistencia?.criada) criadas += 1;
    else reutilizadas += 1;
    divergencias += retorno.comparacao.totalDivergencias;
  }

  process.stdout.write(
    JSON.stringify(
      {
        matricula: servidor.matricula,
        competencia,
        diasProcessados: apuracoes.length,
        execucoesCriadas: criadas,
        execucoesReutilizadas: reutilizadas,
        divergencias,
        modo: "SHADOW",
        efeitoOficial: false,
      },
      null,
      2,
    ) + "\n",
  );
}

main()
  .catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
