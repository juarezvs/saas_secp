import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ execute: vi.fn(), close: vi.fn(), connect: vi.fn() }));
vi.mock("@/modules/integracoes/sarh/application/services/sarh-oracle-config.service", () => ({ obterConfiguracaoSarhOracle: vi.fn(async () => ({ username: "test", password: "test", connectString: "test-only" })) }));
vi.mock("oracledb", () => ({ default: { getConnection: mocks.connect, OUT_FORMAT_OBJECT: 4002 } }));
import { buscarContrachequeSarh, listarHistoricoContrachequeSarh } from "./contracheque-oracle.repository";

describe("real-source payslip history keeps person, payroll and sequence boundaries", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.connect.mockResolvedValue({ execute: mocks.execute, close: mocks.close }); });
  const data = new Date("2026-10-05T00:00:00Z");
  const context = { matricula: "TEST-OWN", competencia: "2026-10", orgaoId: "test-org" };
  it("keeps separate payrolls in the same month and does not invent totals when rubrics are missing", async () => {
    mocks.execute.mockResolvedValueOnce({ rows: [
      { chaveFolha: data, sequdepe: 1, sequpa: 1, descricao: "Mensal" },
      { chaveFolha: data, sequdepe: 1, sequpa: 2, descricao: "Suplementar" },
      { chaveFolha: data, sequdepe: 2, sequpa: 1, descricao: "Sem rubricas" },
    ] }).mockResolvedValueOnce({ rows: [
      { chaveFolha: data, sequdepe: 1, sequpa: 1, tipo: "R", valor: 100, codigo: 1, descricao: "Vencimento" },
      { chaveFolha: data, sequdepe: 1, sequpa: 1, tipo: "D", valor: 10, codigo: 2, descricao: "Desconto previdenciário" },
      { chaveFolha: data, sequdepe: 1, sequpa: 2, tipo: "R", valor: 200, codigo: 1, descricao: "Vencimento" },
    ] });
    const result = await listarHistoricoContrachequeSarh(context);
    expect(result.map(r => r.totais?.liquido ?? null)).toEqual([90, 200, null]);
    expect(new Set(result.map(r => r.id)).size).toBe(3);
    for (const [, binds] of mocks.execute.mock.calls) expect(binds).toEqual({ matricula: "TEST-OWN", competencia: "2026-10" });
    expect(mocks.close).toHaveBeenCalledOnce();
  });
  it("returns a verified empty history without querying all rubrics", async () => {
    mocks.execute.mockResolvedValueOnce({ rows: [] });
    expect(await listarHistoricoContrachequeSarh(context)).toEqual([]);
    expect(mocks.execute).toHaveBeenCalledOnce(); expect(mocks.close).toHaveBeenCalledOnce();
  });
  it("preserves the existing sequence-zero aggregation without mixing another payroll", async () => {
    mocks.execute.mockResolvedValueOnce({ rows: [{ chaveFolha: data, sequdepe: 1, sequpa: 0, descricao: "Consolidado" }] })
      .mockResolvedValueOnce({ rows: [
        { chaveFolha: data, sequdepe: 1, sequpa: 1, tipo: "R", valor: 100, descricao: "Vencimento" },
        { chaveFolha: data, sequdepe: 1, sequpa: 2, tipo: "D", valor: 10, descricao: "Previdência" },
        { chaveFolha: data, sequdepe: 2, sequpa: 1, tipo: "R", valor: 900, descricao: "Outra folha" },
      ] });
    expect((await listarHistoricoContrachequeSarh(context))[0].totais).toEqual({ bruto: 100, descontos: 10, liquido: 90 });
  });
  it("closes the Oracle connection after a source failure", async () => {
    mocks.execute.mockRejectedValueOnce(new Error("source unavailable"));
    await expect(listarHistoricoContrachequeSarh(context)).rejects.toThrow("source unavailable");
    expect(mocks.close).toHaveBeenCalledOnce();
  });
  it("rejects a mismatched or malformed document without opening Oracle", async () => {
    for (const documentoId of ["2026-09-05_1_1", "not-a-document"]) {
      expect(await buscarContrachequeSarh({ ...context, documentoId })).toBeNull();
    }
    expect(mocks.connect).not.toHaveBeenCalled();
  });
});
