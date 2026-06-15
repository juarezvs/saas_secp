export type StatusBoletimFrequencia =
  | "GERADO"
  | "ENCAMINHADO_SECAP"
  | "RECEBIDO_SECAP"
  | "CONFERIDO"
  | "CANCELADO";

export type TransicaoBoletim = Extract<
  StatusBoletimFrequencia,
  "ENCAMINHADO_SECAP" | "RECEBIDO_SECAP" | "CONFERIDO"
>;

export const STATUS_ORIGEM: Record<
  TransicaoBoletim,
  StatusBoletimFrequencia
> = {
  ENCAMINHADO_SECAP: "GERADO",
  RECEBIDO_SECAP: "ENCAMINHADO_SECAP",
  CONFERIDO: "RECEBIDO_SECAP",
};

const ROTULOS_STATUS: Record<StatusBoletimFrequencia, string> = {
  GERADO: "gerado",
  ENCAMINHADO_SECAP: "encaminhado à SECAP/NUCGP",
  RECEBIDO_SECAP: "recebido pela SECAP/NUCGP",
  CONFERIDO: "conferido",
  CANCELADO: "cancelado",
};

export class TransicaoBoletimInvalidaError extends Error {
  constructor(
    statusAtual: StatusBoletimFrequencia,
    statusDestino: TransicaoBoletim,
  ) {
    const origemEsperada = STATUS_ORIGEM[statusDestino];

    super(
      `O boletim deve estar ${ROTULOS_STATUS[origemEsperada]} antes de ser ${ROTULOS_STATUS[statusDestino]}. Status atual: ${ROTULOS_STATUS[statusAtual]}.`,
    );
    this.name = "TransicaoBoletimInvalidaError";
  }
}

export function validarTransicaoBoletimFrequencia(
  statusAtual: StatusBoletimFrequencia,
  statusDestino: TransicaoBoletim,
) {
  if (statusAtual !== STATUS_ORIGEM[statusDestino]) {
    throw new TransicaoBoletimInvalidaError(statusAtual, statusDestino);
  }
}
