import { describe, expect, it, vi } from "vitest";
import { executarComparacaoShadow } from "./executar-comparacao-shadow.service";

describe("executarComparacaoShadow", () => {
  it("persiste comparacao vinculada a execucao shadow", async () => {
    const salvarComparacao = vi.fn().mockResolvedValue(undefined);
    const retorno = await executarComparacaoShadow({
      orgaoId: "orgao",
      servidorId: "servidor",
      dataReferencia: new Date("2026-10-13T00:00:00Z"),
      politica: {
        id: "politica",
        versao: 1,
        orgaoId: "orgao",
        vigenciaInicio: new Date("2026-01-01T00:00:00Z"),
        cargaExigivelMinutos: 420,
      },
      eventos: [
        { id: "e", ocorridoEm: new Date("2026-10-13T12:00:00Z"), tipo: "ENTRADA", fonte: "REP" },
        { id: "s", ocorridoEm: new Date("2026-10-13T19:00:00Z"), tipo: "SAIDA", fonte: "REP" },
      ],
      legado: {
        cargaPrevistaMinutos: 420,
        minutosTrabalhados: 420,
        minutosCredito: 0,
        minutosDebito: 0,
        resultado: "REGULAR",
        status: "CALCULADA",
      },
      repositorioExecucao: {
        salvarShadow: vi.fn().mockResolvedValue({ id: "execucao", criada: true }),
      },
      repositorioComparacao: { salvarComparacao },
    });

    expect(retorno.comparacao.totalDivergencias).toBe(0);
    expect(salvarComparacao).toHaveBeenCalledWith(
      expect.objectContaining({ execucaoId: "execucao" }),
    );
  });
});

