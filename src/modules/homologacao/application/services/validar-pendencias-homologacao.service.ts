import {
  listarApuracoesServidorMes,
  listarHorasExtrasNaoAutorizadasMes,
  listarJornadasServidorMes,
  listarMovimentosPendentesBancoHorasMes,
  listarSolicitacoesPendentesServidorMes,
} from "../../infrastructure/repositories/homologacao.repository";
import { calcularCargaMensalEsperada } from "./calcular-carga-mensal-esperada.service";

export type PendenciaHomologacao = {
  tipo:
    | "APURACAO_INCONSISTENTE"
    | "MARCACAO_INCOMPLETA"
    | "SOLICITACAO_PENDENTE"
    | "BANCO_HORAS_PENDENTE"
    | "HORA_EXTRA_NAO_AUTORIZADA"
    | "FALTA"
    | "DEBITO"
    | "JORNADA_NAO_CONFIGURADA"
    | "APURACAO_MENSAL_INCOMPLETA"
    | "CARGA_PREVISTA_DIVERGENTE"
    | "SEM_APURACAO";
  descricao: string;
  quantidade?: number;
  minutos?: number;
};

export async function validarPendenciasHomologacaoServidor(params: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
}) {
  const [
    apuracoes,
    solicitacoesPendentes,
    movimentosPendentes,
    horasExtrasNaoAutorizadas,
    jornadas,
  ] = await Promise.all([
      listarApuracoesServidorMes(params),
      listarSolicitacoesPendentesServidorMes(params),
      listarMovimentosPendentesBancoHorasMes(params),
      listarHorasExtrasNaoAutorizadasMes(params),
      listarJornadasServidorMes(params),
    ]);
  const cargaEsperada = await calcularCargaMensalEsperada({
    anoReferencia: params.anoReferencia,
    mesReferencia: params.mesReferencia,
    jornadas,
    servidorId: params.servidorId,
  });

  const pendencias: PendenciaHomologacao[] = [];
  const apuracoesPorData = new Map(
    apuracoes.map((apuracao) => [
      apuracao.dataReferencia.toISOString().slice(0, 10),
      apuracao,
    ]),
  );
  const diasUteisEsperadosSemApuracao = cargaEsperada.dias.filter(
    (dia) => !apuracoesPorData.has(dia.dataReferencia.toISOString().slice(0, 10)),
  );
  const cargasDivergentes = cargaEsperada.dias.filter((dia) => {
    const apuracao = apuracoesPorData.get(
      dia.dataReferencia.toISOString().slice(0, 10),
    );

    return (
      apuracao &&
      apuracao.cargaPrevistaMinutos !== dia.cargaPrevistaMinutos
    );
  });

  if (apuracoes.length === 0) {
    pendencias.push({
      tipo: "SEM_APURACAO",
      descricao: "Não há apuração calculada para o servidor no mês.",
      quantidade: 1,
    });
  }

  if (cargaEsperada.diasUteisSemJornada.length > 0) {
    pendencias.push({
      tipo: "JORNADA_NAO_CONFIGURADA",
      descricao:
        "Existem dias uteis no mes sem jornada vigente para apuracao da carga mensal.",
      quantidade: cargaEsperada.diasUteisSemJornada.length,
    });
  }

  if (diasUteisEsperadosSemApuracao.length > 0) {
    pendencias.push({
      tipo: "APURACAO_MENSAL_INCOMPLETA",
      descricao:
        "Existem dias uteis com jornada vigente sem apuracao diaria calculada.",
      quantidade: diasUteisEsperadosSemApuracao.length,
      minutos: diasUteisEsperadosSemApuracao.reduce(
        (total, dia) => total + dia.cargaPrevistaMinutos,
        0,
      ),
    });
  }

  if (cargasDivergentes.length > 0) {
    pendencias.push({
      tipo: "CARGA_PREVISTA_DIVERGENTE",
      descricao:
        "Existem apuracoes diarias com carga prevista diferente da jornada vigente no mes.",
      quantidade: cargasDivergentes.length,
      minutos: cargasDivergentes.reduce(
        (total, dia) => total + dia.cargaPrevistaMinutos,
        0,
      ),
    });
  }

  const inconsistentes = apuracoes.filter(
    (apuracao) => apuracao.status === "INCONSISTENTE",
  );

  if (inconsistentes.length > 0) {
    pendencias.push({
      tipo: "APURACAO_INCONSISTENTE",
      descricao: "Existem apurações diárias inconsistentes no mês.",
      quantidade: inconsistentes.length,
    });
  }

  const incompletas = apuracoes.filter(
    (apuracao) => apuracao.resultado === "INCOMPLETA",
  );

  if (incompletas.length > 0) {
    pendencias.push({
      tipo: "MARCACAO_INCOMPLETA",
      descricao: "Existem dias com marcações incompletas.",
      quantidade: incompletas.length,
    });
  }

  const faltas = apuracoes.filter((apuracao) => apuracao.resultado === "FALTA");

  if (faltas.length > 0) {
    pendencias.push({
      tipo: "FALTA",
      descricao: "Existem faltas apuradas no mês.",
      quantidade: faltas.length,
      minutos: faltas.reduce((total, item) => total + item.minutosDebito, 0),
    });
  }

  const debitoMinutos = apuracoes.reduce(
    (total, item) => total + item.minutosDebito,
    0,
  );

  if (debitoMinutos > 0) {
    pendencias.push({
      tipo: "DEBITO",
      descricao: "Existem horas-débito no mês.",
      minutos: debitoMinutos,
    });
  }

  if (solicitacoesPendentes.length > 0) {
    pendencias.push({
      tipo: "SOLICITACAO_PENDENTE",
      descricao: "Existem solicitações pendentes de análise no mês.",
      quantidade: solicitacoesPendentes.length,
    });
  }

  if (movimentosPendentes.length > 0) {
    pendencias.push({
      tipo: "BANCO_HORAS_PENDENTE",
      descricao: "Existem movimentos de banco de horas pendentes de validação.",
      quantidade: movimentosPendentes.length,
      minutos: movimentosPendentes.reduce(
        (total, item) => total + item.minutos,
        0,
      ),
    });
  }

  if (horasExtrasNaoAutorizadas.length > 0) {
    pendencias.push({
      tipo: "HORA_EXTRA_NAO_AUTORIZADA",
      descricao:
        "Existem horas extras sem autorização prévia aguardando deliberação da chefia.",
      quantidade: horasExtrasNaoAutorizadas.length,
      minutos: horasExtrasNaoAutorizadas.reduce(
        (total, item) => total + item.minutos,
        0,
      ),
    });
  }

  const totais = {
    cargaPrevistaMinutos: cargaEsperada.cargaPrevistaMinutos,
    minutosTrabalhados: apuracoes.reduce(
      (total, item) => total + item.minutosTrabalhados,
      0,
    ),
    minutosCredito: apuracoes.reduce(
      (total, item) => total + item.minutosCredito,
      0,
    ),
    minutosDebito: apuracoes.reduce(
      (total, item) => total + item.minutosDebito,
      0,
    ),
    faltas: faltas.length,
  };

  return {
    pendencias,
    totais,
  };
}
