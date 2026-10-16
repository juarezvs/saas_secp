import { afterEach, describe, expect, it, vi } from "vitest";
import type { SarhAfastamentoDto } from "../../domain/sarh.types";
import { SarhPrismaRepository } from "./sarh-prisma.repository";

vi.mock("@/modules/jornadas/application/services/garantir-jornada-padrao-servidor.service", () => ({}));
vi.mock("@/modules/marcacoes-brutas/application/services/vincular-marcacoes-brutas-servidor.service", () => ({}));

const concessao: SarhAfastamentoDto = {
  id: "LICENCA:AM:200401:30:1", categoria: "AUSENCIA_FOLGA", tipoCodigo: "28",
  tipoDescricao: "CONCESSAO COMPENSATORIA", matricula: "AM200401", cpf: null,
  nome: null, dataInicio: "2026-10-09", dataFim: "2026-10-09", dias: 1,
  exercicio: null, processo: null, observacao: null,
  origemTabela: "RH_LICENCA/RH_PERIODO_LICENCA",
};

afterEach(() => vi.useRealTimers());

describe("importação de afastamentos SARH", () => {
  it.each(["2026-10-08", "2026-10-09", "2026-10-16"])(
    "preserva a concessão de 09/10 como registro válido ao sincronizar em %s",
    async (hoje) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(`${hoje}T16:00:00Z`));
      const repository = new SarhPrismaRepository({} as ConstructorParameters<typeof SarhPrismaRepository>[0]);
      const registrar = vi.spyOn(repository, "registrarItem")
        .mockResolvedValue({} as Awaited<ReturnType<typeof repository.registrarItem>>);
      await repository.processarAfastamento({
        execucaoId: "execucao", payload: concessao, modoSimulacao: true,
        cache: { servidorId: "servidor", tipoAfastamentoId: "tipo", existente: null },
      });
      expect(registrar).toHaveBeenCalledWith("execucao", "AFASTAMENTOS", expect.objectContaining({
        dadosDepois: expect.objectContaining({
          ativo: true, dataInicio: new Date("2026-10-09"), dataFim: new Date("2026-10-09"),
        }),
      }), undefined);
    },
  );
});
