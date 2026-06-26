import { describe, expect, it } from "vitest";

import {
  FUSOS_HORARIOS_BRASIL_PADRAO,
} from "./fusos-horarios-oficiais";

function fusoValido(valor: string) {
  expect(() =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: valor }).format(new Date()),
  ).not.toThrow();
}

describe("fusos-horarios-oficiais", () => {
  it("mantem os fusos geograficos brasileiros recomendados", () => {
    expect(FUSOS_HORARIOS_BRASIL_PADRAO.map((fuso) => fuso.rotulo)).toEqual([
      "Fernando de Noronha (UTC-02)",
      "Brasília/São Paulo (UTC-03)",
      "Manaus (UTC-04)",
      "Tabatinga/Eirunepé (UTC-05)",
      "Rio Branco (UTC-05)",
    ]);
    FUSOS_HORARIOS_BRASIL_PADRAO.forEach((fuso) => fusoValido(fuso.valor));
  });
});
