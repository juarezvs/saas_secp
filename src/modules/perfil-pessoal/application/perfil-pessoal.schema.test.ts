import { describe, expect, it } from "vitest";

import { perfilPessoalSchema } from "./perfil-pessoal.schema";

const valido = {
  cep: "69099-705",
  endereco: "Avenida Exemplo",
  bairro: "Centro",
  cidade: "Manaus",
  uf: "AM",
  numeroResidencia: "126",
  complemento: "Quadra 127",
  email: "servidor@trf1.jus.br",
  telefones: ["(92) 9 8888-7777"],
  altura: "1,79",
  raca: "1",
  corCabelo: "3",
  corOlhos: "2",
  tipoSanguineo: "7",
  identidadeGenero: "1",
};

describe("perfilPessoalSchema", () => {
  it("normaliza CEP e telefone antes da gravação", () => {
    const resultado = perfilPessoalSchema.parse(valido);
    expect(resultado.cep).toBe("69099705");
    expect(resultado.telefones).toEqual(["92988887777"]);
  });

  it("rejeita mais de quatro telefones", () => {
    const resultado = perfilPessoalSchema.safeParse({
      ...valido,
      telefones: ["92988887771", "92988887772", "92988887773", "92988887774", "92988887775"],
    });
    expect(resultado.success).toBe(false);
  });

  it("rejeita telefones repetidos", () => {
    const resultado = perfilPessoalSchema.safeParse({ ...valido, telefones: ["92988887777", "(92) 9 8888-7777"] });
    expect(resultado.success).toBe(false);
  });
});
