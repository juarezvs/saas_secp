import { afterEach, describe, expect, it, vi } from "vitest";
import { minutaCampanhaSjam2026 } from "./campanha-sjam-2026";
import { dinheiroOrcamentario, planejarOperacaoOrcamentoHoraExtra, saldoDisponivelOrcamentoHoraExtra } from "./orcamento-campanha-horas-extras";
import { campanhasHorasExtrasHabilitadas } from "../application/services/campanhas-horas-extras-feature.service";

const conta = {
  id: "a", referenceAmount: "18000.00", allocatedAmount: "100.00", decentralizedAmount: "100.00", reservedAmount: "0.00", executedAmount: "0.00",
};

describe("orcamento de campanha de horas extras", () => {
  it("referencia de R$18mil e alocacao isolada nao sao saldo descentralizado", () => {
    const semCredito = { ...conta, decentralizedAmount: "0.00" };
    expect(saldoDisponivelOrcamentoHoraExtra(semCredito)).toBe("0.00");
    expect(() => planejarOperacaoOrcamentoHoraExtra({ type: "RESERVE", source: semCredito, amount: "0.01" })).toThrow(/Saldo insuficiente/);
  });
  it("disponivel e o menor entre alocado e descentralizado, menos compromissos", () => {
    expect(saldoDisponivelOrcamentoHoraExtra({ ...conta, allocatedAmount: "200.00", reservedAmount: "20.00", executedAmount: "30.00" })).toBe("50.00");
    expect(saldoDisponivelOrcamentoHoraExtra({ ...conta, decentralizedAmount: "200.00", reservedAmount: "20.00", executedAmount: "30.00" })).toBe("50.00");
  });
  it("reserva, executa parcialmente e libera sem recriar o valor executado", () => {
    const reservado = planejarOperacaoOrcamentoHoraExtra({ type: "RESERVE", source: conta, amount: "60" })[0].after;
    const executado = planejarOperacaoOrcamentoHoraExtra({ type: "EXECUTE", source: reservado, amount: "20.00", reservationRemaining: "60.00" })[0].after;
    const liberado = planejarOperacaoOrcamentoHoraExtra({ type: "RELEASE", source: executado, amount: "40.00", reservationRemaining: "40.00" })[0].after;
    expect(liberado.reservedAmount).toBe("0.00");
    expect(liberado.executedAmount).toBe("20.00");
    expect(saldoDisponivelOrcamentoHoraExtra(liberado)).toBe("80.00");
    expect(conta.reservedAmount).toBe("0.00");
  });
  it("nao pode consumir reserva alheia ou devolver valor ja executado", () => {
    expect(() => planejarOperacaoOrcamentoHoraExtra({ type: "RELEASE", source: { ...conta, reservedAmount: "80.00" }, amount: "21", reservationRemaining: "20.00" })).toThrow(/remanescente/);
    expect(() => planejarOperacaoOrcamentoHoraExtra({ type: "EXECUTE", source: conta, amount: "1" })).toThrow(/remanescente/);
  });
  it.each(["TRANSFER_ALLOCATION", "TRANSFER_CREDIT"] as const)("remanejamento %s conserva valores e nao transfere a outra natureza", (type) => {
    const destino = { ...conta, id: "b", allocatedAmount: "0.00", decentralizedAmount: "0.00" };
    const movimentos = planejarOperacaoOrcamentoHoraExtra({ type, source: conta, destination: destino, amount: "25.00" });
    expect(movimentos[0].allocatedDelta).toBe(type === "TRANSFER_ALLOCATION" ? "-25.00" : "0.00");
    expect(movimentos[1].allocatedDelta).toBe(type === "TRANSFER_ALLOCATION" ? "25.00" : "0.00");
    expect(movimentos[0].decentralizedDelta).toBe(type === "TRANSFER_CREDIT" ? "-25.00" : "0.00");
    expect(movimentos[1].decentralizedDelta).toBe(type === "TRANSFER_CREDIT" ? "25.00" : "0.00");
    expect(saldoDisponivelOrcamentoHoraExtra(movimentos[1].after)).toBe("0.00");
  });
  it("remanejamento nao pode atingir valores reservados ou executados", () => {
    expect(() => planejarOperacaoOrcamentoHoraExtra({ type: "TRANSFER_CREDIT", source: { ...conta, reservedAmount: "80.00" }, destination: { ...conta, id: "b" }, amount: "21" })).toThrow(/Saldo insuficiente/);
  });
  it("alocacao nao cria credito, e devolucao de credito preserva compromissos", () => {
    expect(planejarOperacaoOrcamentoHoraExtra({ type: "ALLOCATE", source: conta, amount: "100" })[0].after.decentralizedAmount).toBe("100.00");
    expect(planejarOperacaoOrcamentoHoraExtra({ type: "DECENTRALIZE", source: conta, amount: "100" })[0].after.allocatedAmount).toBe("100.00");
    expect(planejarOperacaoOrcamentoHoraExtra({ type: "CANCEL_ALLOCATION", source: conta, amount: "20" })[0].after.allocatedAmount).toBe("80.00");
    expect(planejarOperacaoOrcamentoHoraExtra({ type: "RETURN_CREDIT", source: conta, amount: "20" })[0].after.decentralizedAmount).toBe("80.00");
  });
  it.each(["-1", "NaN", "Infinity", "1.001", "1,00", "1e3", "1000000000000"])("rejeita moeda invalida: %s", (amount) => {
    expect(() => dinheiroOrcamentario(amount, true)).toThrow();
  });
  it("bloqueia moeda zero, estouro e conta de destino indevida", () => {
    expect(() => dinheiroOrcamentario("0", true)).toThrow(/positivo/);
    expect(() => planejarOperacaoOrcamentoHoraExtra({ type: "ALLOCATE", source: { ...conta, allocatedAmount: "999999999999.99" }, amount: "0.01" })).toThrow(/limite monetario/);
    expect(() => planejarOperacaoOrcamentoHoraExtra({ type: "RESERVE", source: conta, destination: { ...conta, id: "b" }, amount: "1" })).toThrow(/destino/);
    expect(() => planejarOperacaoOrcamentoHoraExtra({ type: "TRANSFER_CREDIT", source: conta, destination: conta, amount: "1" })).toThrow(/distintas/);
  });
});

describe("parametros documentais SJAM e ativacao", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("minuta guarda os tres saldos como observacoes e mantem ambiguidades", () => {
    const minuta = minutaCampanhaSjam2026();
    expect(minuta.rules.observations).toMatchObject({ prospectiveSupplement: "250991.00", reportedAvailableAtDocumentDate: "6233.27", commitmentPendingSepagReview: "20620.77", generatesOperationalBalance: false });
    expect(minuta.rules.annualLimitMinutes).toBe(12000);
    expect(minuta.rules.conversionAboveUnitAllocation).toContain("PENDING");
    expect(minuta.projectDeadline).toBe("2026-10-21");
    expect(minuta.proofDeadline).toBe("2026-11-19");
    minuta.rules.observations.prospectiveSupplement = "0";
    expect(minutaCampanhaSjam2026().rules.observations.prospectiveSupplement).toBe("250991.00");
  });
  it("ativacao exige flag e orgao explicito, sem curinga", () => {
    vi.stubEnv("HORAS_EXTRAS_CAMPANHAS_ENABLED", "false");
    vi.stubEnv("HORAS_EXTRAS_CAMPANHAS_ORGAOS", "a");
    expect(campanhasHorasExtrasHabilitadas("a")).toBe(false);
    vi.stubEnv("HORAS_EXTRAS_CAMPANHAS_ENABLED", "true");
    expect(campanhasHorasExtrasHabilitadas("a")).toBe(true);
    expect(campanhasHorasExtrasHabilitadas("b")).toBe(false);
    vi.stubEnv("HORAS_EXTRAS_CAMPANHAS_ORGAOS", "*");
    expect(campanhasHorasExtrasHabilitadas("a")).toBe(false);
  });
});
