import { describe, expect, it } from "vitest";

import {
  classificarDiaEspelho,
  conferenciaEspelho,
  resumirEspelhoMensal,
} from "./classificar-espelho-mensal.service";

describe("classificar espelho mensal", () => {
  it("traduz o status tecnico para conferencia amigavel", () => {
    expect(conferenciaEspelho("CALCULADA")).toEqual(
      expect.objectContaining({
        rotulo: "Calculada",
        tom: "ok",
      }),
    );

    expect(conferenciaEspelho("INCONSISTENTE")).toEqual(
      expect.objectContaining({
        rotulo: "Requer analise",
        tom: "alerta",
      }),
    );
  });

  it("detalha as causas da conferencia quando a apuracao esta inconsistente", () => {
    const conferencia = conferenciaEspelho("INCONSISTENTE", {
      resultado: "DEBITO",
      minutosDebito: 120,
      ocorrencias: [
        {
          tipo: "MARCACAO_INCOMPLETA",
          descricao: "Registro de entrada sem saida correspondente.",
          minutos: 0,
        },
      ],
      metadados: {
        solicitacoesAplicadas: [
          {
            id: "solicitacao-parcial",
            tipo: "ABONO_JUSTIFICATIVA",
            titulo: "Ausencia parcial",
            minutosCobertos: 60,
            coberturaIntegral: false,
          },
        ],
      },
    });

    expect(conferencia.descricao).toContain("Causas da conferencia:");
    expect(conferencia.descricao).toContain("Marcacoes incompletas");
    expect(conferencia.descricao).toContain(
      "Solicitacao deferida nao cobre totalmente",
    );
    expect(conferencia.descricao).toContain(
      "Debito ou falta nao justificados",
    );
  });

  it("nao exige analise quando ha dispensa de ponto aplicada", () => {
    expect(
      conferenciaEspelho("INCONSISTENTE", {
        resultado: "FALTA",
        minutosDebito: 420,
        ocorrencias: [
          {
            tipo: "FALTA",
            descricao: "Ausencia integral sem marcacao.",
            minutos: 420,
          },
        ],
        metadados: {
          dispensaPontoAdministrativa: {
            ativa: true,
            motivo: "Dispensa administrativa de ponto.",
          },
        },
      }),
    ).toEqual(
      expect.objectContaining({
        rotulo: "Calculada",
        tom: "ok",
      }),
    );
  });

  it("nao trata dispensa eletronica automatica como dispensa de ponto administrativa", () => {
    const metadados = {
      dispensaPontoEletronico: {
        ativa: true,
        motivos: ["Unidade de lotacao sem equipamento biometrico ativo."],
        exigeFrequenciaManual: true,
      },
    };

    expect(
      classificarDiaEspelho({
        resultado: "REGULAR",
        minutosDebito: 0,
        metadados,
      }),
    ).toEqual(
      expect.objectContaining({
        dispensaPonto: false,
      }),
    );

    expect(
      conferenciaEspelho("INCONSISTENTE", {
        resultado: "FALTA",
        minutosDebito: 420,
        metadados,
      }),
    ).toEqual(
      expect.objectContaining({
        rotulo: "Requer analise",
        tom: "alerta",
      }),
    );
  });

  it("classifica falta e debito como ausencia no espelho", () => {
    expect(
      classificarDiaEspelho({
        resultado: "FALTA",
        minutosDebito: 420,
      }),
    ).toEqual(
      expect.objectContaining({
        ausente: true,
        ausenciaParcial: false,
      }),
    );

    expect(
      classificarDiaEspelho({
        resultado: "DEBITO",
        minutosDebito: 90,
      }),
    ).toEqual(
      expect.objectContaining({
        ausente: false,
        ausenciaParcial: true,
      }),
    );
  });

  it("resume ausencias, atividades externas e viagens de servico", () => {
    const resumo = resumirEspelhoMensal([
      {
        resultado: "FALTA",
        minutosDebito: 420,
      },
      {
        resultado: "REGULAR",
        minutosDebito: 0,
        metadados: {
          solicitacoesAplicadas: [
            {
              id: "atividade-externa",
              tipo: "ATIVIDADE_EXTERNA",
              titulo: "Diligencia externa",
              minutosCobertos: 180,
              coberturaIntegral: false,
            },
          ],
        },
      },
      {
        resultado: "REGULAR",
        minutosDebito: 0,
        metadados: {
          solicitacoesAplicadas: [
            {
              id: "viagem",
              tipo: "VIAGEM_SERVICO",
              titulo: "Viagem a servico",
              minutosCobertos: 420,
              coberturaIntegral: true,
            },
          ],
        },
      },
    ]);

    expect(resumo).toEqual({
      ausencias: 1,
      minutosAusencia: 420,
      atividadesExternas: 1,
      minutosAtividadeExterna: 180,
      viagensServico: 1,
      minutosViagemServico: 420,
    });
  });
});
