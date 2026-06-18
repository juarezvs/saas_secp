import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "../../../calendario-institucional/application/services/classificar-dia-institucional.service",
  () => ({
    classificarDiaInstitucional: vi.fn(),
  }),
);

import {
  calcularPrazoEncaminhamentoBoletimCompetencia,
  calcularPrazoEncaminhamentoBoletimCompetenciaComCalendario,
  calcularPrazoHomologacaoCompetencia,
  calcularPrazoHomologacaoCompetenciaComCalendario,
  descreverPrazoRegulatorio,
} from "./prazo-regulatorio-frequencia.service";
import { classificarDiaInstitucional } from "../../../calendario-institucional/application/services/classificar-dia-institucional.service";

function dataLocalIso(data: Date) {
  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0"),
  ].join("-");
}

describe("prazo-regulatorio-frequencia.service", () => {
  beforeEach(() => {
    vi.mocked(classificarDiaInstitucional).mockReset();
  });

  it("calcula o segundo dia util do mes subsequente para homologacao", () => {
    const prazo = calcularPrazoHomologacaoCompetencia({
      anoReferencia: 2026,
      mesReferencia: 5,
      hoje: new Date(2026, 5, 1),
    });

    expect(dataLocalIso(prazo.dataLimite)).toBe("2026-06-02");
    expect(prazo.situacao).toBe("NO_PRAZO");
    expect(prazo.diasRestantes).toBe(1);
  });

  it("empurra o prazo do boletim para o proximo dia util quando o dia 10 cai no fim de semana", () => {
    const prazo = calcularPrazoEncaminhamentoBoletimCompetencia({
      anoReferencia: 2026,
      mesReferencia: 9,
      hoje: new Date(2026, 9, 1),
    });

    expect(dataLocalIso(prazo.dataLimite)).toBe("2026-10-12");
    expect(prazo.situacao).toBe("NO_PRAZO");
  });

  it("marca conclusao em atraso quando o fechamento ocorre apos o prazo", () => {
    const prazo = calcularPrazoHomologacaoCompetencia({
      anoReferencia: 2026,
      mesReferencia: 10,
      concluidoEm: new Date(2026, 10, 4),
      hoje: new Date(2026, 10, 5),
    });

    expect(dataLocalIso(prazo.dataLimite)).toBe("2026-11-03");
    expect(prazo.situacao).toBe("CONCLUIDO_EM_ATRASO");
    expect(prazo.diasAtraso).toBe(1);
    expect(descreverPrazoRegulatorio(prazo)).toContain("1 dia(s) de atraso");
  });

  it("marca boletim como vencido enquanto ainda nao foi encaminhado", () => {
    const prazo = calcularPrazoEncaminhamentoBoletimCompetencia({
      anoReferencia: 2026,
      mesReferencia: 10,
      hoje: new Date(2026, 10, 12),
    });

    expect(dataLocalIso(prazo.dataLimite)).toBe("2026-11-10");
    expect(prazo.situacao).toBe("VENCIDO");
    expect(prazo.diasAtraso).toBe(2);
  });

  it("considera feriado institucional ao calcular o segundo dia util da homologacao", async () => {
    vi.mocked(classificarDiaInstitucional).mockImplementation(async (data) => {
      const iso = dataLocalIso(data);

      if (iso === "2026-06-02") {
        return {
          dataReferencia: data,
          tipo: "FERIADO",
          descricao: "Feriado local",
          fonte: "CALENDARIO_INSTITUCIONAL",
          contaComoDiaUtil: false,
          geraApuracaoRegular: false,
        };
      }

      return {
        dataReferencia: data,
        tipo: "UTIL",
        descricao: "Dia útil regular",
        fonte: "PADRAO",
        contaComoDiaUtil: true,
        geraApuracaoRegular: true,
      };
    });

    const prazo = await calcularPrazoHomologacaoCompetenciaComCalendario({
      anoReferencia: 2026,
      mesReferencia: 5,
      hoje: new Date(2026, 5, 1),
    });

    expect(dataLocalIso(prazo.dataLimite)).toBe("2026-06-03");
  });

  it("considera ponto facultativo sem dia util para empurrar o prazo do boletim", async () => {
    vi.mocked(classificarDiaInstitucional).mockImplementation(async (data) => {
      const iso = dataLocalIso(data);

      if (iso === "2026-10-12") {
        return {
          dataReferencia: data,
          tipo: "PONTO_FACULTATIVO",
          descricao: "Ponto facultativo",
          fonte: "CALENDARIO_INSTITUCIONAL",
          contaComoDiaUtil: false,
          geraApuracaoRegular: false,
        };
      }

      const diaSemana = data.getDay();

      return {
        dataReferencia: data,
        tipo: diaSemana === 0 ? "DOMINGO" : diaSemana === 6 ? "SABADO" : "UTIL",
        descricao: null,
        fonte: "PADRAO",
        contaComoDiaUtil: diaSemana !== 0 && diaSemana !== 6,
        geraApuracaoRegular: diaSemana !== 0 && diaSemana !== 6,
      };
    });

    const prazo = await calcularPrazoEncaminhamentoBoletimCompetenciaComCalendario({
      anoReferencia: 2026,
      mesReferencia: 9,
      hoje: new Date(2026, 9, 1),
    });

    expect(dataLocalIso(prazo.dataLimite)).toBe("2026-10-13");
  });
});
