import { describe, expect, it } from "vitest";

import { calcularResumoFechamento } from "./atualizar-resumo-fechamento.service";

describe("calcularResumoFechamento", () => {
  it("consolida contadores e totais mensais da homologacao", () => {
    const resumo = calcularResumoFechamento([
      {
        status: "PENDENTE",
        cargaPrevistaMinutos: 420,
        minutosTrabalhados: 360,
        minutosCredito: 0,
        minutosDebito: 60,
        faltas: 1,
      },
      {
        status: "HOMOLOGADO",
        cargaPrevistaMinutos: 420,
        minutosTrabalhados: 480,
        minutosCredito: 60,
        minutosDebito: 0,
        faltas: 0,
      },
      {
        status: "HOMOLOGADO_COM_RESSALVA",
        cargaPrevistaMinutos: 300,
        minutosTrabalhados: 300,
        minutosCredito: 0,
        minutosDebito: 0,
        faltas: 0,
      },
      {
        status: "COM_PENDENCIAS",
        cargaPrevistaMinutos: 300,
        minutosTrabalhados: 240,
        minutosCredito: 0,
        minutosDebito: 60,
        faltas: 1,
      },
      {
        status: "DEVOLVIDO",
        cargaPrevistaMinutos: 420,
        minutosTrabalhados: 0,
        minutosCredito: 0,
        minutosDebito: 420,
        faltas: 5,
      },
    ]);

    expect(resumo).toEqual({
      totalServidores: 5,
      totalPendentes: 1,
      totalComPendencias: 1,
      totalHomologados: 1,
      totalHomologadosComRessalva: 1,
      totalDevolvidos: 1,
      totalCargaPrevistaMinutos: 1860,
      totalMinutosTrabalhados: 1380,
      totalMinutosCredito: 60,
      totalMinutosDebito: 540,
      totalFaltas: 7,
    });
  });
});
