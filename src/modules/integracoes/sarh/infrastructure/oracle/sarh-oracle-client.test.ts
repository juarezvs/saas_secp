import { beforeEach, describe, expect, it, vi } from "vitest";
import { SarhOracleClient } from "./sarh-oracle-client";

const oracle = vi.hoisted(() => ({
  execute: vi.fn(),
  close: vi.fn(),
}));

vi.mock("oracledb", () => ({
  default: {
    OUT_FORMAT_OBJECT: 4002,
    getConnection: vi.fn(async () => oracle),
  },
}));

beforeEach(() => vi.clearAllMocks());

describe("consulta de afastamentos especiais SARH", () => {
  it("inclui a fonte de afastamentos especiais no mesmo escopo dos demais eventos", async () => {
    oracle.execute.mockResolvedValue({ rows: [] });
    const client = new SarhOracleClient({
      username: "teste", password: "teste", connectString: "teste",
      oracleHome: "", siglaLocalidade: "AM",
    });
    await client.buscarAfastamentos({ matricula: "am200401" });

    const [sql, binds] = oracle.execute.mock.calls[0];
    expect(sql).toContain("from sarh.rh_frequencia_especial e");
    expect(sql).toContain("sb.sigla = e.freq_func_sigla_secao_subsecao");
    expect(sql).toContain("sb.cod_funcionario = e.freq_func_cod_funcionario");
    expect(sql).toContain("where e.freq_tipo = '1'");
    expect(sql).toContain("'VIAGEM A SERVICO' as tipo_descricao");
    expect(sql).not.toContain("rh_afastamento_juiz");
    expect(binds).toEqual({ matricula: "AM200401", siglaLocalidade: "AM" });
    expect(oracle.close).toHaveBeenCalledOnce();
  });
});
