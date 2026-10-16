import { prisma } from "@/shared/infrastructure/database/prisma";
import { verificarEspelhoEnviadoParaHomologacao } from "@/modules/homologacao/application/services/bloquear-espelho-enviado.service";
import { regerarBancoHorasMesService } from "@/modules/recalculo/application/services/regerar-banco-horas-mes.service";
import type {
  EventoTemporal,
  TipoEventoTemporal,
} from "../../domain/mct.types";
import { mctComparacaoPrismaRepository } from "../../infrastructure/repositories/mct-comparacao-prisma.repository";
import { mctExecucaoPrismaRepository } from "../../infrastructure/repositories/mct-execucao-prisma.repository";
import { carregarClassificacaoMct } from "./carregar-classificacao-mct.service";
import { executarComparacaoShadow } from "./executar-comparacao-shadow.service";
import { adaptarJornadaServidorParaMct } from "./mct-schedule-adapter.service";

function tipoTemporal(tipo: string, indice: number): TipoEventoTemporal {
  if (tipo === "ENTRADA") return "ENTRADA";
  if (tipo === "SAIDA") return "SAIDA";
  return indice % 2 === 0 ? "ENTRADA" : "SAIDA";
}

export async function gerarAnaliseJornadaShadow(params: {
  servidorId: string;
  dataReferencia: Date;
}) {
  const fimDia = new Date(params.dataReferencia);
  fimDia.setUTCDate(fimDia.getUTCDate() + 1);
  const servidor = await prisma.servidor.findUnique({
    where: { id: params.servidorId },
    select: { id: true, orgaoId: true },
  });
  if (!servidor?.orgaoId) throw new Error("Servidor ou órgão não encontrado.");

  const [apuracao, marcacoes, agenda, configuracaoGlobal] = await Promise.all([
    prisma.apuracaoDiaria.findFirst({
      where: {
        servidorId: servidor.id,
        dataReferencia: { gte: params.dataReferencia, lt: fimDia },
      },
    }),
    prisma.marcacao.findMany({
      where: {
        servidorId: servidor.id,
        dataReferencia: { gte: params.dataReferencia, lt: fimDia },
        status: { in: ["VALIDA", "AJUSTADA", "PENDENTE"] },
      },
      orderBy: { dataHora: "asc" },
    }),
    adaptarJornadaServidorParaMct({
      servidorId: servidor.id,
      dataReferencia: params.dataReferencia,
    }),
    prisma.configuracaoGlobal.findUnique({ where: { id: "global" } }),
  ]);
  if (!apuracao) throw new Error("Não há apuração do espelho para este dia.");

  const associacao = await prisma.mctConfiguracaoApuracao.findFirst({
    where: {
      orgaoId: servidor.orgaoId,
      jornadaId: agenda.jornadaId,
      status: "ATIVA",
      vigenciaInicio: { lte: params.dataReferencia },
      OR: [
        { vigenciaFim: null },
        { vigenciaFim: { gte: params.dataReferencia } },
      ],
      AND: [{ OR: [{ escalaId: agenda.escalaId }, { escalaId: null }] }],
    },
    include: { politica: true },
    orderBy: [{ escalaId: "desc" }, { vigenciaInicio: "desc" }],
  });
  const politica =
    associacao?.politica ??
    (await prisma.mctPoliticaVersao.findFirst({
      where: {
        orgaoId: servidor.orgaoId,
        estado: "PUBLICADA",
        vigenciaInicio: { lte: params.dataReferencia },
        OR: [
          { vigenciaFim: null },
          { vigenciaFim: { gte: params.dataReferencia } },
        ],
      },
      orderBy: { versao: "desc" },
    }));
  if (!politica)
    throw new Error("Não há política MCT publicada e vigente para este dia.");

  const configuracao = politica.configuracao as Record<string, unknown>;
  const eventos: EventoTemporal[] = marcacoes.map((item, indice) => ({
    id: item.id,
    idOrigem: item.id,
    ocorridoEm: item.dataHora,
    tipo: tipoTemporal(item.tipo, indice),
    fonte: item.fonte ?? "SECP",
  }));
  const classificacao = await carregarClassificacaoMct({
    orgaoId: servidor.orgaoId,
    politicaVersaoId: politica.id,
    dataReferencia: params.dataReferencia,
  });

  const modo = configuracaoGlobal?.mctModoOficialAtivo ? "MCT" : "SHADOW";
  if (modo === "MCT") {
    await verificarEspelhoEnviadoParaHomologacao({
      servidorId: servidor.id,
      dataReferencia: apuracao.dataReferencia,
    });
  }

  const execucao = await executarComparacaoShadow({
    orgaoId: servidor.orgaoId,
    servidorId: servidor.id,
    dataReferencia: apuracao.dataReferencia,
    politica: {
      id: politica.id,
      versao: politica.versao,
      orgaoId: politica.orgaoId,
      vigenciaInicio: politica.vigenciaInicio,
      vigenciaFim: politica.vigenciaFim,
      cargaExigivelMinutos: agenda.plano.jornadaExigivelMinutos,
      referencia: agenda.referencia,
      intervaloMinimoMinutos: agenda.intervaloMinimoMinutos,
      intervaloMaximoMinutos: agenda.intervaloMaximoMinutos,
      flexibilidadeEntradaMinutos: Number(
        configuracao.flexibilidadeEntradaMinutos ?? 0,
      ),
      flexibilidadeSaidaMinutos: Number(
        configuracao.flexibilidadeSaidaMinutos ?? 0,
      ),
      permiteFlexibilidade: agenda.permiteFlexibilidade,
      permiteCompensacaoNoDia: agenda.permiteCompensacaoNoDia,
      fusoHorario: agenda.fusoHorario,
    },
    plano: agenda.plano,
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
    modo,
  });

  if (modo === "MCT") {
    const jornada = execucao.resultado.resultadoJornada;
    const minutosCredito = Math.max(0, jornada.creditoReconhecidoMinutos);
    const minutosDebito = Math.max(0, jornada.tempoFaltanteMinutos);
    await prisma.apuracaoDiaria.update({
      where: { id: apuracao.id },
      data: {
        minutosTrabalhados: jornada.tempoEfetivamenteTrabalhadoMinutos,
        minutosCredito,
        minutosDebito,
        resultado:
          minutosDebito > 0 ? "DEBITO" : minutosCredito > 0 ? "CREDITO" : "REGULAR",
        status: execucao.resultado.possuiPendencias ? "INCONSISTENTE" : "CALCULADA",
        calculadaEm: new Date(),
        metadados: {
          ...((apuracao.metadados as Record<string, unknown> | null) ?? {}),
          mctOficial: {
            execucaoId: execucao.persistencia?.id ?? null,
            versaoMotor: execucao.resultado.versaoMotor,
            aplicadoEm: new Date().toISOString(),
          },
        },
      },
    });
    await regerarBancoHorasMesService({
      servidorId: servidor.id,
      anoReferencia: apuracao.dataReferencia.getUTCFullYear(),
      mesReferencia: apuracao.dataReferencia.getUTCMonth() + 1,
      origem: "MCT_OFICIAL",
    });
  }

  return execucao;
}
