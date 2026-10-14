import { describe, expect, it } from "vitest";
import { diagnosticarConfiguracaoApuracao } from "./configuracao-apuracao";

describe("configuração da apuração MCT", () => {
  it("mantém incompleta uma configuração sem política publicada", () => {
    const resultado = diagnosticarConfiguracaoApuracao({ modeloCodigo: "JORNADA_CONTINUA", politicaPublicada: false, vigenciaInicio: new Date("2026-09-01T00:00:00.000Z") });
    expect(resultado.status).toBe("INCOMPLETA");
    expect(resultado.pendencias).toContain("Vincule uma política publicada.");
  });
  it("exige os complementos declarados pelo modelo", () => {
    const incompleta = diagnosticarConfiguracaoApuracao({ modeloCodigo: "JORNADA_FLEXIVEL", politicaPublicada: true, vigenciaInicio: new Date("2026-09-01T00:00:00.000Z"), configuracaoComplementar: { janelaInicio: "07:00" } });
    expect(incompleta.pendencias).toContain("Informe o campo complementar janelaFim.");
    const completa = diagnosticarConfiguracaoApuracao({ modeloCodigo: "JORNADA_FLEXIVEL", politicaPublicada: true, vigenciaInicio: new Date("2026-09-01T00:00:00.000Z"), configuracaoComplementar: { janelaInicio: "07:00", janelaFim: "19:00" } });
    expect(completa.status).toBe("PRONTA_SIMULACAO");
  });
  it("rejeita vigência final anterior à inicial", () => {
    const resultado = diagnosticarConfiguracaoApuracao({ modeloCodigo: "JORNADA_CONTINUA", politicaPublicada: true, vigenciaInicio: new Date("2026-09-10T00:00:00.000Z"), vigenciaFim: new Date("2026-09-01T00:00:00.000Z") });
    expect(resultado.completa).toBe(false);
  });
});
