import { describe, expect, it } from "vitest";

import {
  avaliarCompatibilidadeJornadaDedicacaoIntegral,
  ehDescricaoFuncaoComissionada,
} from "./dedicacao-integral.service";

describe("dedicacao integral FC/CJ", () => {
  it("detecta cargo em comissao e funcao comissionada por descricao", () => {
    expect(ehDescricaoFuncaoComissionada("CJ-03 Diretor de secretaria")).toBe(
      true,
    );
    expect(ehDescricaoFuncaoComissionada("Funcao comissionada FC 05")).toBe(
      true,
    );
    expect(ehDescricaoFuncaoComissionada("Analista Judiciario")).toBe(false);
  });

  it("considera jornada de 8 horas compativel para FC/CJ", () => {
    const resultado = avaliarCompatibilidadeJornadaDedicacaoIntegral({
      descricaoCargoServidor: "Cargo em comissao CJ 02",
      jornadaCargaDiariaMinutos: 480,
    });

    expect(resultado).toMatchObject({
      exigeDedicacaoIntegral: true,
      jornadaPreferencial: true,
      compativel: true,
      exigeJustificativaExcecao: false,
    });
  });

  it("exige justificativa para FC/CJ com jornada inferior a 8 horas", () => {
    const semJustificativa = avaliarCompatibilidadeJornadaDedicacaoIntegral({
      descricoesCargosLotacoes: ["FC-04 Supervisor"],
      jornadaCargaDiariaMinutos: 420,
      justificativa: "Excecao curta",
    });

    expect(semJustificativa).toMatchObject({
      exigeDedicacaoIntegral: true,
      jornadaPreferencial: false,
      compativel: false,
      exigeJustificativaExcecao: true,
    });

    const comJustificativa = avaliarCompatibilidadeJornadaDedicacaoIntegral({
      descricoesCargosLotacoes: ["FC-04 Supervisor"],
      jornadaCargaDiariaMinutos: 420,
      justificativa: "Excecao formal autorizada pela chefia imediata.",
    });

    expect(comJustificativa.compativel).toBe(true);
  });
});
