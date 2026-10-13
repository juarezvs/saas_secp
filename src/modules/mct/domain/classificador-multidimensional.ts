export type ValorContextoMct = string | number | boolean | string[] | null;
export type ContextoClassificacaoMct = Record<string, ValorContextoMct>;

export type CondicaoClassificacaoMct =
  | {
      campo: string;
      operador: "EQ" | "NE" | "GT" | "GTE" | "LT" | "LTE" | "IN";
      valor: string | number | boolean | string[];
    }
  | { operador: "E" | "OU"; condicoes: CondicaoClassificacaoMct[] }
  | { operador: "NAO"; condicao: CondicaoClassificacaoMct };

export type RubricaClassificacaoMct = {
  id: string;
  codigo: string;
  dimensao:
    | "TEMPORAL"
    | "JURIDICA_ADMINISTRATIVA"
    | "DESTINACAO"
    | "INCIDENCIA";
  grupoExclusividade?: string | null;
  prioridade: number;
  exigeAutorizacao: boolean;
  exigeHomologacao: boolean;
  efeitoBancoHoras: "NENHUM" | "CREDITO" | "DEBITO" | "COMPENSACAO";
};

export type RegraClassificacaoMct = {
  id: string;
  prioridade: number;
  condicao: CondicaoClassificacaoMct;
  efeitos: Array<{
    rubricaCodigo: string;
    escopoTemporal: string;
    quantidade:
      | { estrategia: "CONSTANTE"; minutos: number }
      | { estrategia: "CAMPO"; campo: string };
  }>;
};

export type RubricaAplicadaMct = {
  rubricaVersaoId: string;
  codigo: string;
  dimensao: RubricaClassificacaoMct["dimensao"];
  escopoTemporal: string;
  quantidade: number;
  status: "APLICADA" | "PENDENTE_AUTORIZACAO" | "PENDENTE_HOMOLOGACAO";
  destinacao: RubricaClassificacaoMct["efeitoBancoHoras"];
  regraId: string;
  prioridadeEfetiva: number;
};

export type ConflitoClassificacaoMct = {
  codigo: "RUBRICA_DESCONHECIDA" | "EXCLUSIVIDADE_AMBIGUA" | "DUPLA_DESTINACAO" | "QUANTIDADE_INVALIDA";
  regraIds: string[];
  rubricas: string[];
  escopoTemporal: string;
  descricao: string;
};

export function classificarRubricasMct(params: {
  contexto: ContextoClassificacaoMct;
  catalogo: RubricaClassificacaoMct[];
  regras: RegraClassificacaoMct[];
  autorizacoes?: string[];
}): {
  aplicacoes: RubricaAplicadaMct[];
  conflitos: ConflitoClassificacaoMct[];
  regrasExecutadas: Array<{ id: string; satisfeita: boolean }>;
} {
  const catalogo = new Map(params.catalogo.map((rubrica) => [rubrica.codigo, rubrica]));
  const candidatas: RubricaAplicadaMct[] = [];
  const conflitos: ConflitoClassificacaoMct[] = [];
  const regrasExecutadas: Array<{ id: string; satisfeita: boolean }> = [];

  for (const regra of [...params.regras].sort(ordenarRegras)) {
    const satisfeita = avaliarCondicaoMct(regra.condicao, params.contexto);
    regrasExecutadas.push({ id: regra.id, satisfeita });
    if (!satisfeita) continue;

    for (const efeito of regra.efeitos) {
      const rubrica = catalogo.get(efeito.rubricaCodigo);
      if (!rubrica) {
        conflitos.push({
          codigo: "RUBRICA_DESCONHECIDA",
          regraIds: [regra.id],
          rubricas: [efeito.rubricaCodigo],
          escopoTemporal: efeito.escopoTemporal,
          descricao: "A regra referencia rubrica inexistente no catalogo vigente.",
        });
        continue;
      }
      const quantidade = resolverQuantidade(efeito.quantidade, params.contexto);
      if (quantidade == null) {
        conflitos.push({
          codigo: "QUANTIDADE_INVALIDA",
          regraIds: [regra.id],
          rubricas: [rubrica.codigo],
          escopoTemporal: efeito.escopoTemporal,
          descricao: "A quantidade da rubrica nao pode ser resolvida como minutos inteiros nao negativos.",
        });
        continue;
      }
      const autorizada = (params.autorizacoes ?? []).includes(rubrica.codigo);
      candidatas.push({
        rubricaVersaoId: rubrica.id,
        codigo: rubrica.codigo,
        dimensao: rubrica.dimensao,
        escopoTemporal: efeito.escopoTemporal,
        quantidade,
        status:
          rubrica.exigeAutorizacao && !autorizada
            ? "PENDENTE_AUTORIZACAO"
            : rubrica.exigeHomologacao
              ? "PENDENTE_HOMOLOGACAO"
              : "APLICADA",
        destinacao: rubrica.efeitoBancoHoras,
        regraId: regra.id,
        prioridadeEfetiva: regra.prioridade + rubrica.prioridade,
      });
    }
  }

  const rejeitadas = new Set<RubricaAplicadaMct>();
  for (let esquerda = 0; esquerda < candidatas.length; esquerda++) {
    for (let direita = esquerda + 1; direita < candidatas.length; direita++) {
      const a = candidatas[esquerda];
      const b = candidatas[direita];
      if (a.escopoTemporal !== b.escopoTemporal || a.codigo === b.codigo) continue;
      const rubricaA = catalogo.get(a.codigo)!;
      const rubricaB = catalogo.get(b.codigo)!;
      const exclusivas =
        rubricaA.grupoExclusividade &&
        rubricaA.grupoExclusividade === rubricaB.grupoExclusividade;
      const duplaDestinacao =
        a.dimensao === "DESTINACAO" &&
        b.dimensao === "DESTINACAO" &&
        a.destinacao !== "NENHUM" &&
        b.destinacao !== "NENHUM";
      if (!exclusivas && !duplaDestinacao) continue;

      if (a.prioridadeEfetiva !== b.prioridadeEfetiva) {
        rejeitadas.add(a.prioridadeEfetiva < b.prioridadeEfetiva ? a : b);
        continue;
      }
      rejeitadas.add(a);
      rejeitadas.add(b);
      conflitos.push({
        codigo: duplaDestinacao ? "DUPLA_DESTINACAO" : "EXCLUSIVIDADE_AMBIGUA",
        regraIds: [a.regraId, b.regraId].sort(),
        rubricas: [a.codigo, b.codigo].sort(),
        escopoTemporal: a.escopoTemporal,
        descricao: duplaDestinacao
          ? "Duas destinacoes concorrentes possuem a mesma precedencia."
          : "Rubricas mutuamente exclusivas possuem a mesma precedencia.",
      });
    }
  }

  return {
    aplicacoes: candidatas
      .filter((item) => !rejeitadas.has(item))
      .sort((a, b) => a.escopoTemporal.localeCompare(b.escopoTemporal) || b.prioridadeEfetiva - a.prioridadeEfetiva || a.codigo.localeCompare(b.codigo)),
    conflitos,
    regrasExecutadas,
  };
}

export function avaliarCondicaoMct(
  condicao: CondicaoClassificacaoMct,
  contexto: ContextoClassificacaoMct,
): boolean {
  if ("condicoes" in condicao) {
    return condicao.operador === "E"
      ? condicao.condicoes.every((item) => avaliarCondicaoMct(item, contexto))
      : condicao.condicoes.some((item) => avaliarCondicaoMct(item, contexto));
  }
  if ("condicao" in condicao) return !avaliarCondicaoMct(condicao.condicao, contexto);
  const atual = contexto[condicao.campo];
  if (atual == null) return false;
  if (condicao.operador === "EQ") return atual === condicao.valor;
  if (condicao.operador === "NE") return atual !== condicao.valor;
  if (condicao.operador === "IN") {
    return Array.isArray(condicao.valor) && condicao.valor.includes(String(atual));
  }
  if (typeof atual !== "number" || typeof condicao.valor !== "number") return false;
  if (condicao.operador === "GT") return atual > condicao.valor;
  if (condicao.operador === "GTE") return atual >= condicao.valor;
  if (condicao.operador === "LT") return atual < condicao.valor;
  return atual <= condicao.valor;
}

function resolverQuantidade(
  quantidade: RegraClassificacaoMct["efeitos"][number]["quantidade"],
  contexto: ContextoClassificacaoMct,
) {
  const valor =
    quantidade.estrategia === "CONSTANTE"
      ? quantidade.minutos
      : contexto[quantidade.campo];
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0
    ? valor
    : null;
}

function ordenarRegras(a: RegraClassificacaoMct, b: RegraClassificacaoMct) {
  return b.prioridade - a.prioridade || a.id.localeCompare(b.id);
}

