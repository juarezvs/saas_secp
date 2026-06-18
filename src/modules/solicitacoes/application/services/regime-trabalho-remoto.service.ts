export const diasSemanaTrabalhoRemoto = [
  "DOMINGO",
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SABADO",
] as const;

export type DiaSemanaTrabalhoRemoto =
  (typeof diasSemanaTrabalhoRemoto)[number];

export type RegimeTrabalhoRemoto = {
  tipo: "TOTAL" | "HIBRIDO";
  diasRemotos: DiaSemanaTrabalhoRemoto[];
};

function normalizarTexto(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function normalizarDiaSemana(valor: unknown): DiaSemanaTrabalhoRemoto | null {
  const texto = normalizarTexto(valor);

  if (texto === "TERÇA") {
    return "TERCA";
  }

  return diasSemanaTrabalhoRemoto.includes(texto as DiaSemanaTrabalhoRemoto)
    ? (texto as DiaSemanaTrabalhoRemoto)
    : null;
}

function dadosComoObjeto(dados: unknown): Record<string, unknown> | null {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    return null;
  }

  return dados as Record<string, unknown>;
}

export function diaSemanaDaDataReferencia(
  dataReferencia: Date,
): DiaSemanaTrabalhoRemoto {
  return diasSemanaTrabalhoRemoto[dataReferencia.getUTCDay()];
}

export function extrairRegimeTrabalhoRemoto(
  dadosSolicitados: unknown,
): RegimeTrabalhoRemoto | null {
  const dados = dadosComoObjeto(dadosSolicitados);

  if (!dados) {
    return null;
  }

  const bruto = dadosComoObjeto(dados.regimeTrabalhoRemoto);

  if (!bruto) {
    return null;
  }

  const tipo = normalizarTexto(bruto.tipo);

  if (tipo === "TOTAL" || tipo === "TELETRABALHO_TOTAL") {
    return {
      tipo: "TOTAL",
      diasRemotos: [...diasSemanaTrabalhoRemoto],
    };
  }

  if (tipo !== "HIBRIDO") {
    return null;
  }

  const dias = Array.isArray(bruto.diasRemotos)
    ? bruto.diasRemotos
        .map(normalizarDiaSemana)
        .filter((dia): dia is DiaSemanaTrabalhoRemoto => Boolean(dia))
    : [];

  return {
    tipo: "HIBRIDO",
    diasRemotos: [...new Set(dias)],
  };
}

export function regimeTrabalhoRemotoCobreData(params: {
  regime: RegimeTrabalhoRemoto | null;
  dataReferencia: Date;
}) {
  if (!params.regime) {
    return false;
  }

  if (params.regime.tipo === "TOTAL") {
    return true;
  }

  return params.regime.diasRemotos.includes(
    diaSemanaDaDataReferencia(params.dataReferencia),
  );
}

export function ehDispensaTeletrabalho(params: {
  tipoSolicitacao: string;
  titulo?: string | null;
  descricao?: string | null;
  dadosSolicitados?: unknown;
}) {
  if (params.tipoSolicitacao !== "DISPENSA_PONTO") {
    return false;
  }

  if (extrairRegimeTrabalhoRemoto(params.dadosSolicitados)) {
    return true;
  }

  const texto = normalizarTexto(`${params.titulo ?? ""} ${params.descricao ?? ""}`);

  return texto.includes("TELETRABALHO") || texto.includes("TRABALHO REMOTO");
}
