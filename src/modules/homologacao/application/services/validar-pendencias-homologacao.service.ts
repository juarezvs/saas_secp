import {
  listarApuracoesServidorMes,
  listarMovimentosPendentesBancoHorasMes,
  listarSolicitacoesPendentesServidorMes,
} from "../../infrastructure/repositories/homologacao.repository";

export type PendenciaHomologacao = {
  tipo:
    | "APURACAO_INCONSISTENTE"
    | "MARCACAO_INCOMPLETA"
    | "SOLICITACAO_PENDENTE"
    | "BANCO_HORAS_PENDENTE"
    | "FALTA"
    | "DEBITO"
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
  const [apuracoes, solicitacoesPendentes, movimentosPendentes] =
    await Promise.all([
      listarApuracoesServidorMes(params),
      listarSolicitacoesPendentesServidorMes(params),
      listarMovimentosPendentesBancoHorasMes(params),
    ]);

  const pendencias: PendenciaHomologacao[] = [];

  if (apuracoes.length === 0) {
    pendencias.push({
      tipo: "SEM_APURACAO",
      descricao: "Não há apuração calculada para o servidor no mês.",
      quantidade: 1,
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

  const totais = {
    cargaPrevistaMinutos: apuracoes.reduce(
      (total, item) => total + item.cargaPrevistaMinutos,
      0,
    ),
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
