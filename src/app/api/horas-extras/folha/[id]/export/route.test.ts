import { beforeEach, describe, expect, it, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";

const mocks = vi.hoisted(() => ({ permissao: vi.fn(), lote: vi.fn() }));
vi.mock("@/modules/auth/application/services/permissao.service", () => ({ exigirPermissao: mocks.permissao }));
vi.mock("@/modules/horas-extras/infrastructure/repositories/horas-extras-folha.repository", () => ({ buscarLoteFolhaHorasExtrasPorId: mocks.lote }));

import { GET } from "./route";

describe("exportacao interna e protecao da folha de horas extras", () => {
  const executar = (layout = "") => GET(new Request(`http://localhost/api/horas-extras/folha/lote-a/export${layout ? `?layout=${layout}` : ""}`), {
    params: Promise.resolve({ id: "lote-a" }),
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissao.mockResolvedValue({ perfilAtivoEscopoGlobal: false, orgaoIds: ["orgao-a"] });
    mocks.lote.mockResolvedValue({ orgaoId: "orgao-a", competence: "2026-10", employees: [{
      registration: "AM200401", employeeName: '=HYPERLINK("x")',
      lines: ["0.10", "0.20"].map((amount) => ({
        date: new Date("2026-10-14T00:00:00Z"), rubricaCode: "HE_50", ratePercent: new Decimal(50),
        minutes: 60, amount: new Decimal(amount), authorizationId: "auth-a", requestId: "request-a", metadata: {},
      })),
    }] });
  });
  it("recusa nome oficial enquanto o leiaute nao estiver homologado", async () => {
    const resposta = await executar("oficial");
    expect(resposta.status).toBe(409);
    expect(await resposta.json()).toMatchObject({ code: "LEIAUTE_FOLHA_NAO_HOMOLOGADO" });
  });
  it("exporta resumo interno em decimal sem formulas executaveis na planilha", async () => {
    const resposta = await executar("resumo");
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Content-Disposition")).toContain("resumo-interno");
    const csv = await resposta.text();
    expect(csv).toContain('"0.30"');
    expect(csv).toContain("'=");
    expect(csv).toContain('"120"');
  });
  it("mantem exportacao detalhada para conferencia", async () => {
    const resposta = await executar();
    expect(resposta.status).toBe(200);
    expect(await resposta.text()).toContain("calculo_item_id");
  });
  it.each([{ orgaoIds: [] }, { orgaoIds: ["orgao-b"] }])("nega exportacao para escopo sem acesso: %j", async ({ orgaoIds }) => {
    mocks.permissao.mockResolvedValue({ perfilAtivoEscopoGlobal: false, orgaoIds });
    expect((await executar("resumo")).status).toBe(403);
  });
  it("aceita perfil global e rejeita leiaute desconhecido", async () => {
    mocks.permissao.mockResolvedValue({ perfilAtivoEscopoGlobal: true, orgaoIds: [] });
    expect((await executar("outro")).status).toBe(400);
    expect((await executar("resumo")).status).toBe(200);
  });
  it("retorna 404 quando nao existe lote", async () => {
    mocks.lote.mockResolvedValue(null);
    expect((await executar()).status).toBe(404);
  });
});
