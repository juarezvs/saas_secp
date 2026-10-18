import { beforeEach, describe, expect, it, vi } from "vitest";
const find = vi.hoisted(() => vi.fn());
vi.mock("@/shared/infrastructure/database/prisma-listagem", () => ({ prismaListagem: { servidor: { findFirst: find } } }));
import { obterIdentidadeContracheque } from "./identidade-contracheque.service";
describe("own payslip functional scope", () => {
  beforeEach(() => find.mockReset());
  it("does not consult a different employee when the active identity is missing", async () => {
    find.mockResolvedValue(null);
    expect(await obterIdentidadeContracheque("session-user")).toBeNull();
    expect(find.mock.calls[0][0].where.usuarioId).toBe("session-user");
  });
  it("denies missing posting and inconsistent institution ownership", async () => {
    for (const lotacoes of [[], [{ unidade: { nome: "Other", orgaoId: "other-org" } }]]) {
      find.mockResolvedValue({ matricula: "TEST", orgaoId: "org", usuario: { nome: "Test user" }, lotacoes });
      expect(await obterIdentidadeContracheque("session-user")).toBeNull();
    }
  });
  it("derives employee and institution from the server-side identity", async () => {
    find.mockResolvedValue({ matricula: "TEST", orgaoId: "org", usuario: { nome: "Test user" }, lotacoes: [{ unidade: { nome: "Unit", orgaoId: "org" } }] });
    expect(await obterIdentidadeContracheque("session-user")).toEqual({ matricula: "TEST", orgaoId: "org", nome: "Test user", lotacao: "Unit" });
  });
});
