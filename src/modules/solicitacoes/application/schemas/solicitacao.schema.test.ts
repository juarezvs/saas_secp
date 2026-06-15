import { describe, expect, it } from "vitest";

import { criarSolicitacaoSchema } from "./solicitacao.schema";

const dadosBase = {
  titulo: "Autorização de banco de horas",
  descricao: "Solicitação apresentada previamente para análise da chefia.",
  dataReferencia: "",
  tipoMarcacao: "",
  horaAjuste: "",
};

describe("criarSolicitacaoSchema", () => {
  it("exige período e quantidade para crédito prévio", () => {
    const resultado = criarSolicitacaoSchema.safeParse({
      ...dadosBase,
      tipo: "HORA_CREDITO_PREVIA",
      dataInicio: "",
      dataFim: "",
    });

    expect(resultado.success).toBe(false);

    if (!resultado.success) {
      const erros = resultado.error.flatten().fieldErrors;
      expect(erros.dataInicio).toBeDefined();
      expect(erros.dataFim).toBeDefined();
      expect(erros.horasSolicitadas).toBeDefined();
    }
  });

  it("aceita compensação prévia completa", () => {
    const resultado = criarSolicitacaoSchema.safeParse({
      ...dadosBase,
      tipo: "COMPENSACAO",
      dataInicio: "2026-06-15T08:00",
      dataFim: "2026-06-15T10:00",
      tipoCompensacao: "UTILIZAR_CREDITO",
      horasSolicitadas: 2,
    });

    expect(resultado.success).toBe(true);
  });

  it("rejeita autorização acima do limite mensal ordinário", () => {
    const resultado = criarSolicitacaoSchema.safeParse({
      ...dadosBase,
      tipo: "HORA_CREDITO_PREVIA",
      dataInicio: "2026-06-15T08:00",
      dataFim: "2026-06-30T18:00",
      tipoCompensacao: "",
      horasSolicitadas: 17,
    });

    expect(resultado.success).toBe(false);
  });
});
