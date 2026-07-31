import { describe, expect, it } from "vitest";

import { exigeIntervaloDaApuracao } from "./exige-intervalo-marcacao.service";

describe("exigeIntervaloDaApuracao", () => {
  it("retorna false quando o snapshot da apuracao indica jornada sem intervalo", () => {
    expect(
      exigeIntervaloDaApuracao({
        jornadaSnapshotApuracao: {
          jornada: {
            exigeIntervalo: false,
          },
        },
      }),
    ).toBe(false);
  });

  it("retorna true por seguranca quando nao ha snapshot claro da jornada", () => {
    expect(exigeIntervaloDaApuracao({})).toBe(true);
  });

  it("aceita o formato legado jornadaVigente", () => {
    expect(
      exigeIntervaloDaApuracao({
        jornadaVigente: {
          jornada: {
            exigeIntervalo: false,
          },
        },
      }),
    ).toBe(false);
  });
});
