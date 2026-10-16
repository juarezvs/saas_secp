import { describe, expect, it } from "vitest";
import { afastamentoSarhDeveImpactarApuracao } from "./afastamento-sarh-efeito.service";

describe("efeito de afastamentos no espelho e no banco de horas", () => {
  it("considera a concessão compensatória válida", () => {
    expect(afastamentoSarhDeveImpactarApuracao({ ativo: true, categoria: "AUSENCIA_FOLGA", origemTabela: "RH_LICENCA/RH_PERIODO_LICENCA", tipoDescricao: "CONCESSAO COMPENSATORIA" })).toBe(true);
  });
  it.each(["MARCADA", "ADIADA", "INTERROMPIDA", "SUSPENSA"])("não abona férias %s", (tipoDescricao) => {
    expect(afastamentoSarhDeveImpactarApuracao({ ativo: true, categoria: "FERIAS", origemTabela: "RH_FERIAS/RH_PERIODO_FERIAS", tipoDescricao })).toBe(false);
  });
  it("considera somente férias gozadas e preserva a inativação explícita", () => {
    const ferias = { categoria: "FERIAS", origemTabela: "RH_FERIAS/RH_PERIODO_FERIAS", tipoDescricao: "GOZADA" };
    expect(afastamentoSarhDeveImpactarApuracao({ ...ferias, ativo: true })).toBe(true);
    expect(afastamentoSarhDeveImpactarApuracao({ ...ferias, ativo: false })).toBe(false);
  });
});
