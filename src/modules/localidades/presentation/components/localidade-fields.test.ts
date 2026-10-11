import { describe, expect, it } from "vitest";

import { cidadesDaUf } from "./localidade-fields";

const estados = [
  {
    id: 13,
    sigla: "AM",
    nome: "Amazonas",
    cidades: [{ id: 1302603, nome: "Manaus" }],
  },
  {
    id: 14,
    sigla: "RR",
    nome: "Roraima",
    cidades: [{ id: 1400100, nome: "Boa Vista" }],
  },
];

describe("cidadesDaUf", () => {
  it("retorna apenas as cidades do estado selecionado", () => {
    expect(cidadesDaUf(estados, "AM")).toEqual([
      { id: 1302603, nome: "Manaus" },
    ]);
    expect(cidadesDaUf(estados, "RR")).toEqual([
      { id: 1400100, nome: "Boa Vista" },
    ]);
  });

  it("retorna uma lista vazia sem UF selecionada", () => {
    expect(cidadesDaUf(estados, "")).toEqual([]);
  });
});
