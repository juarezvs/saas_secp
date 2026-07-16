import { describe, expect, it } from "vitest";

import {
  resolverDispensaPontoEletronico,
  servidorEhOficialJustica,
} from "./dispensa-ponto-eletronico.service";

describe("dispensa-ponto-eletronico.service", () => {
  it("identifica oficial de justica mesmo com acentuacao", () => {
    expect(servidorEhOficialJustica("Oficial de Justiça Avaliador")).toBe(true);
  });

  it("dispensa oficial de justica do registro eletronico", () => {
    const resultado = resolverDispensaPontoEletronico({
      cargoDescricao: "Oficial de Justica",
      quantidadeEquipamentosAtivosUnidade: 2,
    });

    expect(resultado.dispensado).toBe(true);
    expect(resultado.exigeFrequenciaManual).toBe(true);
    expect(resultado.motivos).toEqual(
      expect.arrayContaining([
        expect.stringContaining("oficial de justica"),
      ]),
    );
  });

  it("dispensa servidor lotado em unidade sem equipamento ativo", () => {
    const resultado = resolverDispensaPontoEletronico({
      cargoDescricao: "Analista Judiciario",
      quantidadeEquipamentosAtivosUnidade: 0,
    });

    expect(resultado.dispensado).toBe(true);
    expect(resultado.exigeFrequenciaManual).toBe(true);
    expect(resultado.motivos).toEqual(
      expect.arrayContaining([
        expect.stringContaining("sem equipamento biometrico ativo"),
      ]),
    );
  });

  it("nao dispensa quando ha equipamento ativo no orgao da unidade", () => {
    const resultado = resolverDispensaPontoEletronico({
      cargoDescricao: "Analista Judiciario",
      quantidadeEquipamentosAtivosUnidade: 0,
      quantidadeEquipamentosAtivosOrgao: 2,
    });

    expect(resultado.dispensado).toBe(false);
    expect(resultado.motivos).toEqual([]);
  });

  it("nao dispensa quando nao ha enquadramento excepcional", () => {
    const resultado = resolverDispensaPontoEletronico({
      cargoDescricao: "Tecnico Judiciario",
      quantidadeEquipamentosAtivosUnidade: 1,
    });

    expect(resultado.dispensado).toBe(false);
    expect(resultado.motivos).toEqual([]);
  });

  it("dispensa servidor por controle administrativo explicito", () => {
    const resultado = resolverDispensaPontoEletronico({
      cargoDescricao: "Tecnico Judiciario",
      quantidadeEquipamentosAtivosUnidade: 1,
      dispensaAdministrativa: {
        motivo: "Atividade externa permanente autorizada pela chefia",
        exigeFrequenciaManual: true,
      },
    });

    expect(resultado.dispensado).toBe(true);
    expect(resultado.exigeFrequenciaManual).toBe(true);
    expect(resultado.motivos).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Dispensa administrativa"),
      ]),
    );
  });
});
