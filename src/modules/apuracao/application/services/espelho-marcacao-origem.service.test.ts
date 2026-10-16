import { describe, expect, it } from "vitest";
import { detalhesOrigemMarcacao, type EquipamentoOrigemEspelho } from "./espelho-marcacao-origem.service";

const equipamento: EquipamentoOrigemEspelho = {
  nome: "Entrada NUTEC", codigo: "FACE-01", ip: "172.19.5.29", porta: 80,
  localizacao: "Recepção", fabricante: "CONTROL_ID", modelo: "FACE ID", numeroSerie: null,
};
const base = { tipo: "ENTRADA", status: "VALIDA" };

describe("detalhesOrigemMarcacao", () => {
  it("distingue web e reconhecimento facial pelo computador", () => {
    expect(detalhesOrigemMarcacao({ ...base, fonte: "WEB" }).titulo).toBe("Sistema web");
    expect(detalhesOrigemMarcacao({ ...base, fonte: "BIOMETRIA_FACIAL" }).titulo).toBe("Reconhecimento facial via computador");
  });
  it("mostra dados permitidos do equipamento facial e o NSR", () => {
    const resultado = detalhesOrigemMarcacao({ ...base, fonte: "EQUIPAMENTO_BIOMETRICO", equipamentoOrigem: equipamento,
      metadados: { nsr: "73", senha: "segredo", template: "biometria" } });
    expect(resultado.titulo).toBe("Reconhecimento facial via equipamento biométrico");
    expect(resultado.campos).toEqual(expect.arrayContaining([
      ["Equipamento", "Entrada NUTEC"], ["IP do equipamento", "172.19.5.29"], ["Localização", "Recepção"], ["NSR / evento", "73"],
    ]));
    expect(JSON.stringify(resultado)).not.toMatch(/segredo|template|biometria/);
  });
  it("não afirma reconhecimento facial sem evidência do modelo", () => {
    expect(detalhesOrigemMarcacao({ ...base, fonte: "EQUIPAMENTO_BIOMETRICO", metadados: { equipamentoCodigo: "ANTIGO" } })).toMatchObject({
      titulo: "Equipamento biométrico", campos: expect.arrayContaining([["Código do equipamento", "ANTIGO"]]),
    });
  });
  it("preserva a origem AFD mesmo quando a fonte foi normalizada como equipamento", () => {
    expect(detalhesOrigemMarcacao({ ...base, fonte: "EQUIPAMENTO_BIOMETRICO", metadados: { origemBruta: "IMPORTACAO_AFD" } }).titulo).toBe("Importação de arquivo AFD");
  });
  it("distingue totem e ajuste sem perder a origem original", () => {
    expect(detalhesOrigemMarcacao({ ...base, fonte: "BIOMETRIA_FACIAL", metadados: { origemBruta: "TOTEM_FACIAL_SECP" } }).titulo).toBe("Reconhecimento facial via totem");
    expect(detalhesOrigemMarcacao({ ...base, fonte: "WEB", status: "AJUSTADA" })).toMatchObject({ titulo: "Sistema web", ajustada: true });
  });
  it("trata registros antigos sem metadados", () => {
    expect(detalhesOrigemMarcacao({ ...base, metadados: [] }).titulo).toBe("Origem não informada");
  });
});
