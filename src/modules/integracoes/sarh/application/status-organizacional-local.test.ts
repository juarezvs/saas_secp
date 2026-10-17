import { describe, expect, it } from "vitest";
import { preservarInativacaoOrganizacional } from "./status-organizacional-local";

describe("status organizacional local na sincronização SARH", () => {
  it("preserva a inativação local e atualiza os demais dados", () => {
    expect(preservarInativacaoOrganizacional({ ativo: true, nome: "Nome atualizado" }, { ativo: false })).toEqual({ ativo: false, nome: "Nome atualizado" });
  });
  it("permite a inativação vinda do SARH e mantém novos cadastros conforme a origem", () => {
    expect(preservarInativacaoOrganizacional({ ativo: false }, { ativo: true }).ativo).toBe(false);
    expect(preservarInativacaoOrganizacional({ ativo: true }, null).ativo).toBe(true);
    expect(preservarInativacaoOrganizacional({ ativo: false }, null).ativo).toBe(false);
    expect(preservarInativacaoOrganizacional({ ativo: true }, { ativo: true }).ativo).toBe(true);
  });
});
