import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sessao: vi.fn(), calcular: vi.fn(), revalidar: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidar }));
vi.mock("@/modules/auth/application/services/permissao.service", () => ({
  obterPermissoesDaSessao: mocks.sessao,
  possuiPermissaoNaLista: (lista: string[], permissao: string) => lista.includes(permissao),
}));
vi.mock("../services/calcular-autorizacao-horas-extras.service", () => ({ calcularAutorizacaoHorasExtras: mocks.calcular }));
vi.mock("@/modules/horas-extras/infrastructure/integrations/contracheque-remuneracao.provider", () => ({
  ContrachequeSarhRemuneracaoProvider: class {},
}));

import { calcularAutorizacaoHorasExtrasSecapAction } from "./calcular-autorizacao-horas-extras-secap.action";

describe("permissao de mutacao financeira", () => {
  const form = () => { const dados = new FormData(); dados.set("autorizacaoId", "autorizacao-a"); return dados; };
  const sessao = {
    permitido: true, usuarioId: "usuario-a", perfilAtivoCodigo: "FINANCEIRO",
    perfilAtivoEscopoGlobal: false, orgaoIds: ["orgao-a"], permissoes: [] as string[],
  };
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calcular.mockResolvedValue({ totalMinutos: 60, totalValorCentavos: 10000 });
  });
  it.each(["global", "seccional"])("visualizar folha (%s) nao permite calcular", async (escopo) => {
    mocks.sessao.mockResolvedValue({ ...sessao, permissoes: [`horas-extras:visualizar-folha:${escopo}`] });
    expect((await calcularAutorizacaoHorasExtrasSecapAction({ sucesso: false, mensagem: "" }, form())).sucesso).toBe(false);
    expect(mocks.calcular).not.toHaveBeenCalled();
  });
  it("transmite o escopo real do perfil ativo para o servico", async () => {
    mocks.sessao.mockResolvedValue({ ...sessao, permissoes: ["horas-extras:gerar-lote:seccional"] });
    expect((await calcularAutorizacaoHorasExtrasSecapAction({ sucesso: false, mensagem: "" }, form())).sucesso).toBe(true);
    expect(mocks.calcular).toHaveBeenCalledWith(expect.objectContaining({ escopo: { global: false, orgaoIds: ["orgao-a"] } }));
  });
  it("sessao expirada nao calcula nem revalida paginas", async () => {
    mocks.sessao.mockResolvedValue({ permitido: false });
    expect((await calcularAutorizacaoHorasExtrasSecapAction({ sucesso: false, mensagem: "" }, form())).sucesso).toBe(false);
    expect(mocks.calcular).not.toHaveBeenCalled();
    expect(mocks.revalidar).not.toHaveBeenCalled();
  });
});
