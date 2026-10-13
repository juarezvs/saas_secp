import { describe, expect, it } from "vitest";
import { politicaMctSchema, rubricaMctSchema } from "./mct-policy.schema";

const uuid = (final: string) => `00000000-0000-4000-8000-${final.padStart(12, "0")}`;

describe("schemas declarativos do MCT", () => {
  it("aceita uma politica sem codigo executavel", () => {
    const resultado = politicaMctSchema.parse({
      id: uuid("1"),
      codigo: "JORNADA_7H",
      orgaoId: uuid("2"),
      versao: 1,
      estado: "RASCUNHO",
      vigenciaInicio: "2026-01-01",
      cargaExigivelMinutos: 420,
      horarioReferenciaInicio: "08:00",
      horarioReferenciaFim: "15:00",
      regras: [
        {
          id: "entrada-flexivel",
          prioridade: 10,
          condicao: { campo: "atrasoMinutos", operador: "LTE", valor: 30 },
          efeitos: [
            {
              rubricaCodigo: "JUR-REGULAR",
              escopoTemporal: "dia",
              quantidade: { estrategia: "CONSTANTE", minutos: 0 },
            },
          ],
        },
      ],
    });

    expect(resultado.flexibilidadeEntradaMinutos).toBe(0);
    expect(resultado.regras).toHaveLength(1);
  });

  it("rejeita vigencia e limites contraditorios", () => {
    const resultado = politicaMctSchema.safeParse({
      id: uuid("1"),
      codigo: "INVALIDA",
      orgaoId: uuid("2"),
      versao: 1,
      estado: "RASCUNHO",
      vigenciaInicio: "2026-10-01",
      vigenciaFim: "2026-09-01",
      cargaExigivelMinutos: 420,
      intervaloMinimoMinutos: 90,
      intervaloMaximoMinutos: 60,
    });

    expect(resultado.success).toBe(false);
  });

  it("mantem rubrica de destinacao sem criar efeito automatico", () => {
    const rubrica = rubricaMctSchema.parse({
      id: uuid("3"),
      codigo: "DST-EXCEDENTE-PENDENTE",
      orgaoId: null,
      versao: 1,
      nome: "Excedente pendente",
      descricao: "Tempo ainda sem destinacao administrativa.",
      dimensao: "DESTINACAO",
      natureza: "PENDENCIA",
      unidade: "MINUTO",
      vigenciaInicio: "2026-01-01",
      prioridade: 0,
      exigeAutorizacao: true,
      exigeHomologacao: true,
      efeitoBancoHoras: "NENHUM",
      elegivelFolha: false,
      fundamentoNormativo: null,
      estado: "RASCUNHO",
    });

    expect(rubrica.efeitoBancoHoras).toBe("NENHUM");
    expect(rubrica.estado).toBe("RASCUNHO");
  });
});

