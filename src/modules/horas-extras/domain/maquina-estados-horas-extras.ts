import type {
  StatusAutorizacaoHoraExtra,
  StatusServidorAutorizacaoHoraExtra,
} from "./horas-extras.types";

const TRANSICOES_AUTORIZACAO: Record<
  StatusAutorizacaoHoraExtra,
  StatusAutorizacaoHoraExtra[]
> = {
  RASCUNHO: ["REGISTRADA_NO_SECP", "CANCELADA"],
  REGISTRADA_NO_SECP: ["VIGENTE", "CANCELADA"],
  VIGENTE: ["EM_EXECUCAO", "AGUARDANDO_CONFERENCIA", "CANCELADA"],
  EM_EXECUCAO: ["AGUARDANDO_CONFERENCIA", "PENDENTE_AJUSTE", "CANCELADA"],
  AGUARDANDO_CONFERENCIA: ["EM_CONFERENCIA", "PENDENTE_AJUSTE", "CANCELADA"],
  EM_CONFERENCIA: ["PENDENTE_AJUSTE", "ATESTADA", "CANCELADA"],
  PENDENTE_AJUSTE: ["EM_CONFERENCIA", "CANCELADA"],
  ATESTADA: ["CALCULADA", "PENDENTE_AJUSTE"],
  CALCULADA: ["PRONTA_PARA_FOLHA", "PENDENTE_AJUSTE"],
  PRONTA_PARA_FOLHA: ["ENVIADA_PARA_FOLHA", "PENDENTE_AJUSTE"],
  ENVIADA_PARA_FOLHA: ["PAGA"],
  PAGA: [],
  CANCELADA: [],
};

const ORDEM_STATUS_SERVIDOR: StatusServidorAutorizacaoHoraExtra[] = [
  "CANCELADO",
  "COM_DIVERGENCIA",
  "PENDENTE_DECISAO_GESTOR",
  "PENDENTE_CONFERENCIA",
  "EXECUCAO_EM_ANDAMENTO",
  "SEM_EXECUCAO",
  "AUTORIZADO",
  "REGULAR",
  "ATESTADO",
  "CALCULADO",
  "PRONTO_PARA_FOLHA",
  "PROCESSADO_EM_FOLHA",
];

export function listarProximosStatusAutorizacaoHoraExtra(
  status: StatusAutorizacaoHoraExtra,
) {
  return [...TRANSICOES_AUTORIZACAO[status]];
}

export function podeTransicionarAutorizacaoHoraExtra(
  de: StatusAutorizacaoHoraExtra,
  para: StatusAutorizacaoHoraExtra,
) {
  return TRANSICOES_AUTORIZACAO[de].includes(para);
}

export function exigirTransicaoAutorizacaoHoraExtra(
  de: StatusAutorizacaoHoraExtra,
  para: StatusAutorizacaoHoraExtra,
) {
  if (!podeTransicionarAutorizacaoHoraExtra(de, para)) {
    throw new Error(`Transicao invalida de ${de} para ${para}.`);
  }
}

export function derivarStatusAutorizacaoPorServidores(
  statusServidores: StatusServidorAutorizacaoHoraExtra[],
): StatusAutorizacaoHoraExtra {
  if (statusServidores.length === 0) {
    return "REGISTRADA_NO_SECP";
  }

  if (statusServidores.every((status) => status === "CANCELADO")) {
    return "CANCELADA";
  }

  if (statusServidores.every((status) => status === "PROCESSADO_EM_FOLHA")) {
    return "ENVIADA_PARA_FOLHA";
  }

  if (
    statusServidores.every((status) =>
      ["PRONTO_PARA_FOLHA", "PROCESSADO_EM_FOLHA"].includes(status),
    )
  ) {
    return "PRONTA_PARA_FOLHA";
  }

  if (
    statusServidores.every((status) =>
      ["CALCULADO", "PRONTO_PARA_FOLHA", "PROCESSADO_EM_FOLHA"].includes(status),
    )
  ) {
    return "CALCULADA";
  }

  if (
    statusServidores.every((status) =>
      ["ATESTADO", "CALCULADO", "PRONTO_PARA_FOLHA", "PROCESSADO_EM_FOLHA"].includes(
        status,
      ),
    )
  ) {
    return "ATESTADA";
  }

  const statusMaisRestritivo = [...statusServidores].sort(
    (a, b) => ORDEM_STATUS_SERVIDOR.indexOf(a) - ORDEM_STATUS_SERVIDOR.indexOf(b),
  )[0];

  switch (statusMaisRestritivo) {
    case "COM_DIVERGENCIA":
    case "PENDENTE_DECISAO_GESTOR":
      return "PENDENTE_AJUSTE";
    case "PENDENTE_CONFERENCIA":
      return "AGUARDANDO_CONFERENCIA";
    case "EXECUCAO_EM_ANDAMENTO":
      return "EM_EXECUCAO";
    case "SEM_EXECUCAO":
    case "AUTORIZADO":
    case "REGULAR":
      return "VIGENTE";
    default:
      return "REGISTRADA_NO_SECP";
  }
}
