import { describe, expect, it } from "vitest";
import { classificarRubricasMct, type RubricaClassificacaoMct } from "./classificador-multidimensional";

const rubrica = (
  codigo: string,
  dimensao: RubricaClassificacaoMct["dimensao"],
  extras: Partial<RubricaClassificacaoMct> = {},
): RubricaClassificacaoMct => ({
  id: `${codigo}-v1`, codigo, dimensao, prioridade: 0,
  exigeAutorizacao: false, exigeHomologacao: false,
  efeitoBancoHoras: "NENHUM", ...extras,
});

describe("classificador multidimensional MCT", () => {
  it("permite dimensoes coexistirem sem somar tempo indevidamente", () => {
    const resultado = classificarRubricasMct({
      contexto: { minutosTrabalhados: 420, feriado: true },
      catalogo: [
        rubrica("TMP-TRABALHO", "TEMPORAL"),
        rubrica("JUR-REGULAR", "JURIDICA_ADMINISTRATIVA"),
        rubrica("INC-FERIADO", "INCIDENCIA"),
      ],
      regras: [{
        id: "regra", prioridade: 1,
        condicao: { campo: "feriado", operador: "EQ", valor: true },
        efeitos: ["TMP-TRABALHO", "JUR-REGULAR", "INC-FERIADO"].map((rubricaCodigo) => ({ rubricaCodigo, escopoTemporal: "segmento-1", quantidade: { estrategia: "CAMPO" as const, campo: "minutosTrabalhados" } })),
      }],
    });
    expect(resultado.aplicacoes).toHaveLength(3);
    expect(new Set(resultado.aplicacoes.map((item) => item.dimensao)).size).toBe(3);
    expect(resultado.conflitos).toEqual([]);
  });

  it("nao cria credito quando falta autorizacao", () => {
    const resultado = classificarRubricasMct({
      contexto: { excedente: 60 },
      catalogo: [rubrica("DST-BANCO-CREDITO", "DESTINACAO", { exigeAutorizacao: true, efeitoBancoHoras: "CREDITO" })],
      regras: [{ id: "credito", prioridade: 1, condicao: { campo: "excedente", operador: "GT", valor: 0 }, efeitos: [{ rubricaCodigo: "DST-BANCO-CREDITO", escopoTemporal: "excedente", quantidade: { estrategia: "CAMPO", campo: "excedente" } }] }],
    });
    expect(resultado.aplicacoes[0]).toMatchObject({ status: "PENDENTE_AUTORIZACAO", destinacao: "CREDITO" });
  });

  it("transforma dupla destinacao sem precedencia em conflito", () => {
    const resultado = classificarRubricasMct({
      contexto: { excedente: 60 },
      catalogo: [
        rubrica("DST-BANCO-CREDITO", "DESTINACAO", { efeitoBancoHoras: "CREDITO" }),
        rubrica("DST-COMPENSACAO", "DESTINACAO", { efeitoBancoHoras: "COMPENSACAO" }),
      ],
      regras: ["DST-BANCO-CREDITO", "DST-COMPENSACAO"].map((rubricaCodigo, indice) => ({ id: `r${indice}`, prioridade: 1, condicao: { campo: "excedente", operador: "GT" as const, valor: 0 }, efeitos: [{ rubricaCodigo, escopoTemporal: "excedente", quantidade: { estrategia: "CAMPO" as const, campo: "excedente" } }] })),
    });
    expect(resultado.aplicacoes).toEqual([]);
    expect(resultado.conflitos).toContainEqual(expect.objectContaining({ codigo: "DUPLA_DESTINACAO" }));
  });

  it("resolve exclusividade por precedencia deterministica", () => {
    const resultado = classificarRubricasMct({
      contexto: { falta: 30 },
      catalogo: [
        rubrica("JUR-PENDENTE", "JURIDICA_ADMINISTRATIVA", { grupoExclusividade: "situacao", prioridade: 1 }),
        rubrica("JUR-JUSTIFICADO", "JURIDICA_ADMINISTRATIVA", { grupoExclusividade: "situacao", prioridade: 10 }),
      ],
      regras: ["JUR-PENDENTE", "JUR-JUSTIFICADO"].map((rubricaCodigo) => ({ id: rubricaCodigo, prioridade: 1, condicao: { campo: "falta", operador: "GT" as const, valor: 0 }, efeitos: [{ rubricaCodigo, escopoTemporal: "ausencia", quantidade: { estrategia: "CAMPO" as const, campo: "falta" } }] })),
    });
    expect(resultado.aplicacoes.map((item) => item.codigo)).toEqual(["JUR-JUSTIFICADO"]);
    expect(resultado.conflitos).toEqual([]);
  });

  it("avalia condicoes compostas sem executar codigo", () => {
    const resultado = classificarRubricasMct({
      contexto: { feriado: true, autorizado: false, minutos: 30 },
      catalogo: [rubrica("INC-FERIADO", "INCIDENCIA")],
      regras: [{ id: "composta", prioridade: 1, condicao: { operador: "E", condicoes: [{ campo: "feriado", operador: "EQ", valor: true }, { operador: "NAO", condicao: { campo: "autorizado", operador: "EQ", valor: true } }] }, efeitos: [{ rubricaCodigo: "INC-FERIADO", escopoTemporal: "dia", quantidade: { estrategia: "CAMPO", campo: "minutos" } }] }],
    });
    expect(resultado.aplicacoes).toHaveLength(1);
  });
});

