import { describe, expect, it } from "vitest";

import { calcularSaldoBancoHoras } from "./calcular-banco-horas.service";

describe("calcularSaldoBancoHoras", () => {
  it("separa horas sem autorização e acima do limite sem alterar o saldo", () => {
    const resultado = calcularSaldoBancoHoras([
      {
        tipo: "CREDITO",
        status: "VALIDADO",
        minutos: 120,
      },
      {
        tipo: "HORAS_NAO_AUTORIZADAS",
        status: "DESCONSIDERADO",
        minutos: 45,
      },
      {
        tipo: "HORAS_ACIMA_LIMITE",
        status: "DESCONSIDERADO",
        minutos: 30,
      },
    ]);

    expect(resultado.saldoMinutos).toBe(120);
    expect(resultado.creditosValidadosMinutos).toBe(120);
    expect(resultado.horasNaoAutorizadasMinutos).toBe(45);
    expect(resultado.horasAcimaLimiteMinutos).toBe(30);
  });

  it("aplica compensações validadas ao saldo", () => {
    const resultado = calcularSaldoBancoHoras([
      {
        tipo: "COMPENSACAO_DEBITO",
        status: "VALIDADO",
        minutos: 60,
      },
      {
        tipo: "COMPENSACAO_CREDITO",
        status: "VALIDADO",
        minutos: 30,
      },
    ]);

    expect(resultado.saldoMinutos).toBe(30);
  });

  it("desconsidera debitos expirados do saldo apos encaminhamento para desconto", () => {
    const resultado = calcularSaldoBancoHoras([
      {
        tipo: "DEBITO",
        status: "VALIDADO",
        minutos: 90,
      },
      {
        tipo: "DEBITO",
        status: "EXPIRADO",
        minutos: 45,
      },
    ]);

    expect(resultado.saldoMinutos).toBe(-90);
    expect(resultado.debitosValidadosMinutos).toBe(90);
  });
});
