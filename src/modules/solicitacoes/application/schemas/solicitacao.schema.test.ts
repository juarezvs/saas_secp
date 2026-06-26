import { describe, expect, it } from "vitest";

import { criarSolicitacaoSchema } from "./solicitacao.schema";

const dadosBase = {
  titulo: "Autorizacao de banco de horas",
  descricao: "Solicitacao apresentada previamente para analise da chefia.",
  dataReferencia: "",
  tipoMarcacao: "",
  horaAjuste: "",
};

describe("criarSolicitacaoSchema", () => {
  it("exige periodo e quantidade para credito previo", () => {
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

  it("aceita compensacao previa completa", () => {
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

  it("rejeita autorizacao acima do limite mensal ordinario", () => {
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

  it("exige periodo para abono com efeito na apuracao", () => {
    const resultado = criarSolicitacaoSchema.safeParse({
      ...dadosBase,
      tipo: "ABONO_JUSTIFICATIVA",
      dataInicio: "",
      dataFim: "",
    });

    expect(resultado.success).toBe(false);

    if (!resultado.success) {
      const erros = resultado.error.flatten().fieldErrors;
      expect(erros.dataInicio).toBeDefined();
      expect(erros.dataFim).toBeDefined();
    }
  });

  it("exige modalidade para capacitacao", () => {
    const resultado = criarSolicitacaoSchema.safeParse({
      ...dadosBase,
      tipo: "CAPACITACAO",
      dataInicio: "2026-06-15T08:00",
      dataFim: "2026-06-15T12:30",
    });

    expect(resultado.success).toBe(false);

    if (!resultado.success) {
      const erros = resultado.error.flatten().fieldErrors;
      expect(erros.modalidadeCapacitacao).toBeDefined();
    }
  });

  it("aceita capacitacao interna com periodo informado", () => {
    const resultado = criarSolicitacaoSchema.safeParse({
      ...dadosBase,
      tipo: "CAPACITACAO",
      dataInicio: "2026-06-15T08:00",
      dataFim: "2026-06-15T12:30",
      modalidadeCapacitacao: "INTERNA",
    });

    expect(resultado.success).toBe(true);
  });

  it("aceita viagem a servico apenas com periodo em datas", () => {
    const resultado = criarSolicitacaoSchema.safeParse({
      ...dadosBase,
      tipo: "VIAGEM_SERVICO",
      titulo: "Viagem a servico",
      descricao: "Deslocamento autorizado para cumprimento de atividade externa.",
      dataInicio: "2026-06-15",
      dataFim: "2026-06-17",
    });

    expect(resultado.success).toBe(true);
  });
});
