import { Decimal } from "@prisma/client/runtime/client";

const Dinheiro = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type TipoOperacaoOrcamentariaHoraExtra =
  | "ALLOCATE" | "CANCEL_ALLOCATION" | "DECENTRALIZE" | "RETURN_CREDIT"
  | "RESERVE" | "RELEASE" | "EXECUTE" | "TRANSFER_ALLOCATION" | "TRANSFER_CREDIT";

export type ContaOrcamentariaHoraExtra = {
  id: string;
  referenceAmount: string;
  allocatedAmount: string;
  decentralizedAmount: string;
  reservedAmount: string;
  executedAmount: string;
};

export type LancamentoOrcamentarioHoraExtra = {
  accountId: string;
  allocatedDelta: string;
  decentralizedDelta: string;
  reservedDelta: string;
  executedDelta: string;
  after: ContaOrcamentariaHoraExtra;
};

export function dinheiroOrcamentario(valor: string, positivo = false) {
  if (!/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(valor)) {
    throw new Error("Informe valor monetario decimal com ate duas casas, sem separador de milhares.");
  }
  const decimal = new Dinheiro(valor);
  if (positivo && decimal.lte(0)) throw new Error("A movimentacao deve possuir valor positivo.");
  return decimal;
}

function validarConta(conta: ContaOrcamentariaHoraExtra) {
  dinheiroOrcamentario(conta.referenceAmount);
  const alocado = dinheiroOrcamentario(conta.allocatedAmount);
  const descentralizado = dinheiroOrcamentario(conta.decentralizedAmount);
  const comprometido = dinheiroOrcamentario(conta.reservedAmount)
    .plus(dinheiroOrcamentario(conta.executedAmount));
  if (comprometido.gt(alocado) || comprometido.gt(descentralizado)) {
    throw new Error("Saldo insuficiente: recursos alocados e descentralizados devem cobrir reservas e execucao.");
  }
}

export function saldoDisponivelOrcamentoHoraExtra(conta: ContaOrcamentariaHoraExtra) {
  validarConta(conta);
  return Dinheiro.min(conta.allocatedAmount, conta.decentralizedAmount)
    .minus(conta.reservedAmount).minus(conta.executedAmount).toFixed(2);
}

export function planejarOperacaoOrcamentoHoraExtra(input: {
  type: TipoOperacaoOrcamentariaHoraExtra;
  amount: string;
  source: ContaOrcamentariaHoraExtra;
  destination?: ContaOrcamentariaHoraExtra;
  reservationRemaining?: string;
}): LancamentoOrcamentarioHoraExtra[] {
  const valor = dinheiroOrcamentario(input.amount, true);
  validarConta(input.source);
  const transferencia = input.type === "TRANSFER_ALLOCATION" || input.type === "TRANSFER_CREDIT";
  if (transferencia && (!input.destination || input.destination.id === input.source.id)) {
    throw new Error("Remanejamento exige duas contas distintas da mesma campanha.");
  }
  if (!transferencia && input.destination) throw new Error("Operacao nao admite conta de destino.");
  if (input.type === "RELEASE" || input.type === "EXECUTE") {
    if (!input.reservationRemaining || valor.gt(dinheiroOrcamentario(input.reservationRemaining))) {
      throw new Error("Valor superior ao remanescente da reserva de origem.");
    }
  }

  const criar = (conta: ContaOrcamentariaHoraExtra, deltas: Partial<Record<
    "allocatedAmount" | "decentralizedAmount" | "reservedAmount" | "executedAmount", Decimal
  >>): LancamentoOrcamentarioHoraExtra => {
    validarConta(conta);
    const after = { ...conta };
    for (const campo of ["allocatedAmount", "decentralizedAmount", "reservedAmount", "executedAmount"] as const) {
      const resultado = new Dinheiro(conta[campo]).plus(deltas[campo] ?? 0);
      if (resultado.lt(0) || resultado.gt("999999999999.99")) throw new Error("Movimentacao ultrapassa o saldo livre ou o limite monetario da conta.");
      after[campo] = resultado.toFixed(2);
    }
    validarConta(after);
    return {
      accountId: conta.id,
      allocatedDelta: (deltas.allocatedAmount ?? new Dinheiro(0)).toFixed(2),
      decentralizedDelta: (deltas.decentralizedAmount ?? new Dinheiro(0)).toFixed(2),
      reservedDelta: (deltas.reservedAmount ?? new Dinheiro(0)).toFixed(2),
      executedDelta: (deltas.executedAmount ?? new Dinheiro(0)).toFixed(2),
      after,
    };
  };

  switch (input.type) {
    case "ALLOCATE": return [criar(input.source, { allocatedAmount: valor })];
    case "CANCEL_ALLOCATION": return [criar(input.source, { allocatedAmount: valor.negated() })];
    case "DECENTRALIZE": return [criar(input.source, { decentralizedAmount: valor })];
    case "RETURN_CREDIT": return [criar(input.source, { decentralizedAmount: valor.negated() })];
    case "RESERVE": return [criar(input.source, { reservedAmount: valor })];
    case "RELEASE": return [criar(input.source, { reservedAmount: valor.negated() })];
    case "EXECUTE": return [criar(input.source, { reservedAmount: valor.negated(), executedAmount: valor })];
    case "TRANSFER_ALLOCATION": return [
      criar(input.source, { allocatedAmount: valor.negated() }),
      criar(input.destination!, { allocatedAmount: valor }),
    ];
    case "TRANSFER_CREDIT": return [
      criar(input.source, { decentralizedAmount: valor.negated() }),
      criar(input.destination!, { decentralizedAmount: valor }),
    ];
    default: throw new Error("Tipo de operacao orcamentaria desconhecido.");
  }
}
