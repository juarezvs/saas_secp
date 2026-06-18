import { describe, expect, it } from "vitest";

import {
  EXPEDIENTE_EXTERNO_UNIDADE,
  EXPEDIENTE_INTERNO_UNIDADE,
  EXPEDIENTE_PADRAO,
  JANELA_URGENCIAS_UNIDADE_JUDICIAL,
  resolverExpedienteUnidade,
} from "./expediente.service";

describe("resolverExpedienteUnidade", () => {
  it.each([
    "VARA",
    "GABINETE",
    "TURMA_RECURSAL",
    "CENTRO_CONCILIACAO",
    "NUCLEO",
    "SECAO",
    "SECRETARIA",
    "DEPARTAMENTO",
    "SUBDEPARTAMENTO",
  ])("aplica expediente interno e externo para unidade do tipo %s", (tipo) => {
    const expediente = resolverExpedienteUnidade({
      id: "unidade-1",
      sigla: "UND",
      nome: "Unidade",
      tipo,
    });

    expect(expediente).toMatchObject({
      unidadeId: "unidade-1",
      sigla: "UND",
      tipo,
      regra: "INTERNO_EXTERNO",
      expedienteInterno: EXPEDIENTE_INTERNO_UNIDADE,
      expedienteExterno: EXPEDIENTE_EXTERNO_UNIDADE,
    });
  });

  it.each(["VARA", "TURMA_RECURSAL"])(
    "exige cobertura de urgencias para unidade judicial do tipo %s",
    (tipo) => {
      const expediente = resolverExpedienteUnidade({
        id: "unidade-judicial",
        sigla: "JUD",
        nome: "Unidade judicial",
        tipo,
      });

      expect(expediente.coberturaUrgencias).toMatchObject({
        obrigatoria: true,
        inicio: JANELA_URGENCIAS_UNIDADE_JUDICIAL.inicio,
        fim: JANELA_URGENCIAS_UNIDADE_JUDICIAL.fim,
      });
    },
  );

  it.each([
    "ORGAO",
    "SECAO_JUDICIARIA",
    "SUBSECAO_JUDICIARIA",
    "UNIDADE_AVANCADA_ATENDIMENTO",
    "OUTRA",
  ])("mantem expediente institucional geral para unidade do tipo %s", (tipo) => {
    const expediente = resolverExpedienteUnidade({
      id: "unidade-2",
      sigla: "INST",
      nome: "Institucional",
      tipo,
    });

    expect(expediente).toMatchObject({
      unidadeId: "unidade-2",
      sigla: "INST",
      tipo,
      regra: "INSTITUCIONAL_GERAL",
      expedienteInterno: EXPEDIENTE_PADRAO,
      expedienteExterno: EXPEDIENTE_PADRAO,
      coberturaUrgencias: {
        obrigatoria: false,
        inicio: null,
        fim: null,
        fundamento: null,
      },
    });
  });

  it.each(["GABINETE", "CENTRO_CONCILIACAO", "NUCLEO", "SECAO"])(
    "nao exige cobertura de urgencias para unidade nao judicial do tipo %s",
    (tipo) => {
      const expediente = resolverExpedienteUnidade({
        id: "unidade-nao-judicial",
        sigla: "ADM",
        nome: "Unidade nao judicial",
        tipo,
      });

      expect(expediente.coberturaUrgencias).toMatchObject({
        obrigatoria: false,
        inicio: null,
        fim: null,
        fundamento: null,
      });
    },
  );
});
