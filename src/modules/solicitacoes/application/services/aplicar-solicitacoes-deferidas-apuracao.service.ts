import type { ResultadoCalculoApuracaoDiaria } from "@/modules/apuracao/application/services/calcular-apuracao-diaria.service";

import { calcularMinutosCoberturaSolicitacaoNoDia } from "./periodo-solicitacao.service";
import {
  diaSemanaDaDataReferencia,
  ehDispensaTeletrabalho,
  extrairRegimeTrabalhoRemoto,
  regimeTrabalhoRemotoCobreData,
} from "./regime-trabalho-remoto.service";
import { todasMarcacoesSaoBiometricas } from "./servico-extraordinario-remoto.service";

type JornadaApuracao = {
  cargaDiariaMinutos: number;
};

type MarcacaoApuracao = {
  fonte?: string | null;
  metadados?: unknown;
};

type SolicitacaoDeferidaApuracao = {
  id: string;
  tipo:
    | "ABONO_JUSTIFICATIVA"
    | "ATIVIDADE_EXTERNA"
    | "VIAGEM_SERVICO"
    | "CAPACITACAO"
    | "DISPENSA_PONTO"
    | "HORA_CREDITO_PREVIA"
    | "FOLGA_BANCO_HORAS";
  titulo: string;
  descricao: string;
  dataReferencia: Date | null;
  dataInicio: Date | null;
  dataFim: Date | null;
  dadosSolicitados?: unknown;
};

type SolicitacaoAplicada = {
  id: string;
  tipo: string;
  titulo: string;
  minutosCobertos: number;
  coberturaIntegral: boolean;
  trabalhoRemoto?: boolean;
};

const TIPOS_INCONSISTENTES = [
  "MARCACAO_INCOMPLETA",
  "INTERVALO_INVALIDO",
  "HORA_NAO_AUTORIZADA",
  "SEM_JORNADA",
  "FALTA",
  "DEBITO",
] as const;

const TIPOS_OCORRENCIA_SALDO = ["CREDITO", "DEBITO", "FALTA"] as const;

function recomputarStatus(ocorrencias: ResultadoCalculoApuracaoDiaria["ocorrencias"]) {
  return ocorrencias.some((ocorrencia) =>
    TIPOS_INCONSISTENTES.includes(
      ocorrencia.tipo as (typeof TIPOS_INCONSISTENTES)[number],
    ),
  )
    ? "INCONSISTENTE"
    : "CALCULADA";
}

function ocorrenciaFrequenciaManual(
  ocorrencia: ResultadoCalculoApuracaoDiaria["ocorrencias"][number],
) {
  return ocorrencia.descricao
    .toUpperCase()
    .includes("FREQUENCIA MANUAL OBRIGATORIA");
}

function buildSolicitacaoAplicada(
  solicitacao: SolicitacaoDeferidaApuracao,
  minutosCobertos: number,
  coberturaIntegral: boolean,
  trabalhoRemoto = false,
): SolicitacaoAplicada {
  return {
    id: solicitacao.id,
    tipo: solicitacao.tipo,
    titulo: solicitacao.titulo,
    minutosCobertos,
    coberturaIntegral,
    trabalhoRemoto,
  };
}

function dadosSolicitadosComoObjeto(dadosSolicitados: unknown) {
  if (
    !dadosSolicitados ||
    typeof dadosSolicitados !== "object" ||
    Array.isArray(dadosSolicitados)
  ) {
    return null;
  }

  return dadosSolicitados as Record<string, unknown>;
}

function ehCapacitacaoInterna(dadosSolicitados: unknown) {
  const dados = dadosSolicitadosComoObjeto(dadosSolicitados);

  return dados?.modalidadeCapacitacao === "INTERNA";
}

export function aplicarSolicitacoesDeferidasApuracao(params: {
  calculo: ResultadoCalculoApuracaoDiaria;
  dataReferencia: Date;
  jornada: JornadaApuracao | null;
  solicitacoes: SolicitacaoDeferidaApuracao[];
  marcacoes?: MarcacaoApuracao[];
  fusoHorario?: string | null;
}): {
  calculo: ResultadoCalculoApuracaoDiaria;
  solicitacoesAplicadas: SolicitacaoAplicada[];
} {
  const {
    calculo,
    dataReferencia,
    jornada,
    solicitacoes,
    marcacoes = [],
    fusoHorario,
  } = params;

  if (calculo.resultado === "SEM_EXPEDIENTE") {
    return {
      calculo,
      solicitacoesAplicadas: [] as SolicitacaoAplicada[],
    };
  }

  if (!jornada || solicitacoes.length === 0) {
    return {
      calculo,
      solicitacoesAplicadas: [] as SolicitacaoAplicada[],
    };
  }

  let coberturaMinima = calculo.minutosTrabalhados;
  let coberturaIntegral = false;
  let bloquearCredito = false;
  let servicoExtraordinarioRemotoAutorizado = false;
  let capacitacaoParcialExigeComplementacao = false;
  let capacitacaoInternaSemRegistroBiometrico = false;
  let frequenciaManualRegistrada:
    | ResultadoCalculoApuracaoDiaria["frequenciaManual"]
    | null = null;
  let trabalhoRemoto:
    | ResultadoCalculoApuracaoDiaria["trabalhoRemoto"]
    | null = null;
  const solicitacoesAplicadas: SolicitacaoAplicada[] = [];

  for (const solicitacao of solicitacoes) {
    const minutosCobertos = calcularMinutosCoberturaSolicitacaoNoDia(
      solicitacao,
      dataReferencia,
      fusoHorario,
    );

    if (minutosCobertos <= 0) {
      continue;
    }

    if (solicitacao.tipo === "HORA_CREDITO_PREVIA") {
      servicoExtraordinarioRemotoAutorizado = true;
      solicitacoesAplicadas.push(
        buildSolicitacaoAplicada(solicitacao, minutosCobertos, false),
      );
      continue;
    }

    if (solicitacao.tipo === "FOLGA_BANCO_HORAS") {
      if (calculo.minutosTrabalhados > 0) {
        continue;
      }

      solicitacoesAplicadas.push(
        buildSolicitacaoAplicada(
          solicitacao,
          jornada.cargaDiariaMinutos,
          true,
        ),
      );
      continue;
    }

    const regimeRemoto = extrairRegimeTrabalhoRemoto(
      solicitacao.dadosSolicitados,
    );
    const solicitacaoTeletrabalho = ehDispensaTeletrabalho({
      tipoSolicitacao: solicitacao.tipo,
      titulo: solicitacao.titulo,
      descricao: solicitacao.descricao,
      dadosSolicitados: solicitacao.dadosSolicitados,
    });
    const diaRemoto = regimeRemoto
      ? regimeTrabalhoRemotoCobreData({
          regime: regimeRemoto,
          dataReferencia,
        })
      : solicitacaoTeletrabalho;

    if (solicitacaoTeletrabalho && !diaRemoto) {
      continue;
    }

    if (
      ["ABONO_JUSTIFICATIVA", "DISPENSA_PONTO", "VIAGEM_SERVICO"].includes(
        solicitacao.tipo,
      )
    ) {
      coberturaIntegral = true;
      bloquearCredito = true;

      if (solicitacaoTeletrabalho) {
        const regime = regimeRemoto?.tipo ?? "TOTAL";
        trabalhoRemoto = {
          ativo: true,
          regime,
          diaSemana: diaSemanaDaDataReferencia(dataReferencia),
          exigeRegistroPonto: false,
          descricao:
            regime === "HIBRIDO"
              ? "Trabalho remoto em regime hibrido."
              : "Teletrabalho integral.",
        };
      } else if (solicitacao.tipo === "DISPENSA_PONTO") {
        frequenciaManualRegistrada = {
          obrigatoria: Boolean(calculo.dispensaPontoEletronico?.ativa),
          registrada: true,
          descricao:
            "Frequencia manual registrada por dispensa de ponto deferida.",
        };
      }

      solicitacoesAplicadas.push(
        buildSolicitacaoAplicada(
          solicitacao,
          jornada.cargaDiariaMinutos,
          true,
          solicitacaoTeletrabalho,
        ),
      );
      continue;
    }

    if (solicitacao.tipo === "CAPACITACAO") {
      const capacitacaoInterna = ehCapacitacaoInterna(
        solicitacao.dadosSolicitados,
      );

      if (capacitacaoInterna && !todasMarcacoesSaoBiometricas(marcacoes)) {
        bloquearCredito = true;
        capacitacaoInternaSemRegistroBiometrico = true;
        solicitacoesAplicadas.push(
          buildSolicitacaoAplicada(solicitacao, 0, false),
        );
        continue;
      }

      const cobreJornadaIntegral = minutosCobertos >= 4 * 60;
      coberturaIntegral = coberturaIntegral || cobreJornadaIntegral;
      bloquearCredito = true;
      capacitacaoParcialExigeComplementacao =
        capacitacaoParcialExigeComplementacao || !cobreJornadaIntegral;
      coberturaMinima = Math.max(
        coberturaMinima,
        cobreJornadaIntegral
          ? jornada.cargaDiariaMinutos
          : Math.min(minutosCobertos, jornada.cargaDiariaMinutos),
      );
      solicitacoesAplicadas.push(
        buildSolicitacaoAplicada(
          solicitacao,
          cobreJornadaIntegral
            ? jornada.cargaDiariaMinutos
            : Math.min(minutosCobertos, jornada.cargaDiariaMinutos),
          cobreJornadaIntegral,
        ),
      );
      continue;
    }

    coberturaMinima = Math.max(coberturaMinima, minutosCobertos);
    solicitacoesAplicadas.push(
      buildSolicitacaoAplicada(solicitacao, minutosCobertos, false),
    );
  }

  if (solicitacoesAplicadas.length === 0) {
    return {
      calculo,
      solicitacoesAplicadas,
    };
  }

  if (coberturaIntegral) {
    const creditoExtraordinarioRemoto = trabalhoRemoto
      ? Math.max(0, calculo.minutosCredito)
      : 0;
    const creditoRemotoBiometrico =
      creditoExtraordinarioRemoto > 0 &&
      servicoExtraordinarioRemotoAutorizado &&
      todasMarcacoesSaoBiometricas(marcacoes);
    const manterPendenciaFrequenciaManual =
      Boolean(calculo.frequenciaManual?.obrigatoria) &&
      !frequenciaManualRegistrada &&
      !trabalhoRemoto;
    const ocorrencias = calculo.ocorrencias.filter(
      (ocorrencia) =>
        ocorrencia.tipo === "SEM_JORNADA" ||
        (manterPendenciaFrequenciaManual &&
          ocorrenciaFrequenciaManual(ocorrencia)),
    );

    if (creditoExtraordinarioRemoto > 0 && !creditoRemotoBiometrico) {
      ocorrencias.push({
        tipo: "HORA_NAO_AUTORIZADA",
        descricao:
          "Servico extraordinario em teletrabalho/remoto somente gera credito quando autorizado previamente e registrado biometricamente.",
        minutos: creditoExtraordinarioRemoto,
      });
    }

    return {
      calculo: {
        ...calculo,
        minutosTrabalhados: creditoRemotoBiometrico
          ? jornada.cargaDiariaMinutos + creditoExtraordinarioRemoto
          : jornada.cargaDiariaMinutos,
        minutosCredito: creditoRemotoBiometrico
          ? creditoExtraordinarioRemoto
          : 0,
        minutosDebito: 0,
        resultado: creditoRemotoBiometrico ? "CREDITO" : "REGULAR",
        status: recomputarStatus(ocorrencias),
        trabalhoRemoto: trabalhoRemoto ?? calculo.trabalhoRemoto,
        frequenciaManual:
          frequenciaManualRegistrada ?? calculo.frequenciaManual,
        ocorrencias,
      },
      solicitacoesAplicadas,
    };
  }

  if (["INCOMPLETA", "SEM_JORNADA", "SEM_EXPEDIENTE"].includes(calculo.resultado)) {
    return {
      calculo,
      solicitacoesAplicadas,
    };
  }

  let minutosTrabalhados = Math.max(calculo.minutosTrabalhados, coberturaMinima);

  if (bloquearCredito) {
    minutosTrabalhados = Math.min(minutosTrabalhados, jornada.cargaDiariaMinutos);
  }

  const saldo = minutosTrabalhados - jornada.cargaDiariaMinutos;
  const minutosCredito = bloquearCredito ? 0 : Math.max(0, saldo);
  const minutosDebito = Math.max(0, -saldo);
  const ocorrenciasBase = calculo.ocorrencias.filter(
    (ocorrencia) =>
      !TIPOS_OCORRENCIA_SALDO.includes(
        ocorrencia.tipo as (typeof TIPOS_OCORRENCIA_SALDO)[number],
      ),
  );
  const ocorrencias = [...ocorrenciasBase];

  let resultado: ResultadoCalculoApuracaoDiaria["resultado"] = "REGULAR";

  if (minutosCredito > 0) {
    resultado = "CREDITO";
    ocorrencias.push({
      tipo: "CREDITO",
      descricao: "Tempo trabalhado superior a carga diaria prevista.",
      minutos: minutosCredito,
    });
  } else if (minutosDebito > 0) {
    resultado = minutosTrabalhados === 0 ? "FALTA" : "DEBITO";
    ocorrencias.push({
      tipo: resultado === "FALTA" ? "FALTA" : "DEBITO",
      descricao: capacitacaoParcialExigeComplementacao
        ? "Capacitacao inferior a 4 horas nao cobre a jornada integral; e obrigatoria a complementacao do restante da carga diaria."
        : capacitacaoInternaSemRegistroBiometrico
          ? "Capacitacao interna exige registro biometrico; o periodo nao foi abonado porque as marcacoes biometricas nao foram comprovadas."
          : resultado === "FALTA"
            ? "Ausencia integral durante o expediente, sem autorizacao da chefia apos a aplicacao das solicitacoes deferidas."
            : "Ausencia parcial durante o expediente, sem autorizacao da chefia apos a aplicacao das solicitacoes deferidas.",
      minutos: minutosDebito,
    });
  }

  return {
    calculo: {
      ...calculo,
      minutosTrabalhados,
      minutosCredito,
      minutosDebito,
      resultado,
      status: recomputarStatus(ocorrencias),
      trabalhoRemoto: trabalhoRemoto ?? calculo.trabalhoRemoto,
      frequenciaManual: frequenciaManualRegistrada ?? calculo.frequenciaManual,
      ocorrencias,
    },
    solicitacoesAplicadas,
  };
}
