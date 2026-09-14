export const STATUS_PROGRAMACAO_FERIAS_EDITAVEIS = [
  "ENVIADA",
  "EM_ANALISE",
  "DEVOLVIDA",
] as const;

export const STATUS_PROGRAMACAO_FERIAS_ATIVAS = [
  "ENVIADA",
  "EM_ANALISE",
  "DEVOLVIDA",
  "APROVADA_CHEFIA",
  "AGUARDANDO_ENVIO_SARH",
  "ENVIANDO_SARH",
  "ENVIADA_SARH",
  "CONFIRMADA_SARH",
  "ERRO_ENVIO_SARH",
] as const;

export const STATUS_PROGRAMACAO_FERIAS_MAPA = [
  "ENVIADA",
  "EM_ANALISE",
  "DEVOLVIDA",
  "APROVADA_CHEFIA",
  "AGUARDANDO_ENVIO_SARH",
  "ENVIANDO_SARH",
  "ENVIADA_SARH",
  "CONFIRMADA_SARH",
  "ERRO_ENVIO_SARH",
] as const;

export function programacaoFeriasPodeEditar(status: string) {
  return STATUS_PROGRAMACAO_FERIAS_EDITAVEIS.includes(
    status as (typeof STATUS_PROGRAMACAO_FERIAS_EDITAVEIS)[number],
  );
}

export function programacaoFeriasPodeExecutarSarh(status: string) {
  return ["APROVADA_CHEFIA", "AGUARDANDO_ENVIO_SARH", "ERRO_ENVIO_SARH"].includes(
    status,
  );
}

export function rotuloStatusProgramacaoFerias(status: string) {
  const rotulos: Record<string, string> = {
    ENVIADA: "Enviada",
    EM_ANALISE: "Em análise",
    DEVOLVIDA: "Devolvida",
    APROVADA_CHEFIA: "Aprovada pela chefia",
    REPROVADA_CHEFIA: "Reprovada pela chefia",
    AGUARDANDO_ENVIO_SARH: "Aguardando envio ao SARH",
    ENVIANDO_SARH: "Enviando ao SARH",
    ENVIADA_SARH: "Enviada ao SARH",
    CONFIRMADA_SARH: "Confirmada no SARH",
    ERRO_ENVIO_SARH: "Erro no envio ao SARH",
    CANCELADA: "Cancelada",
  };

  return rotulos[status] ?? status;
}

export function classeStatusProgramacaoFerias(status: string) {
  if (["APROVADA_CHEFIA", "ENVIADA_SARH", "CONFIRMADA_SARH"].includes(status)) {
    return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200";
  }

  if (["REPROVADA_CHEFIA", "CANCELADA", "ERRO_ENVIO_SARH"].includes(status)) {
    return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200";
  }

  if (["DEVOLVIDA", "AGUARDANDO_ENVIO_SARH", "ENVIANDO_SARH"].includes(status)) {
    return "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
  }

  return "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200";
}

export function diasEntreDatasUtc(dataInicio: Date, dataFim: Date) {
  const inicio = Date.UTC(
    dataInicio.getUTCFullYear(),
    dataInicio.getUTCMonth(),
    dataInicio.getUTCDate(),
  );
  const fim = Date.UTC(
    dataFim.getUTCFullYear(),
    dataFim.getUTCMonth(),
    dataFim.getUTCDate(),
  );

  return Math.floor((fim - inicio) / 86_400_000) + 1;
}

function normalizarDataUtc(data: Date) {
  return new Date(
    Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()),
  );
}

export function diferencaDiasCalendarioUtc(dataInicio: Date, dataFim: Date) {
  return Math.floor(
    (normalizarDataUtc(dataFim).getTime() - normalizarDataUtc(dataInicio).getTime()) /
      86_400_000,
  );
}

export async function subtrairDiasUteisInstitucionais(
  dataReferencia: Date,
  quantidade: number,
  servidorId?: string | null,
) {
  const { classificarDiaInstitucional } = await import(
    "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service"
  );
  let data = normalizarDataUtc(dataReferencia);
  let encontrados = 0;

  while (encontrados < quantidade) {
    data = new Date(
      Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate() - 1),
    );

    const classificacao = await classificarDiaInstitucional(
      data,
      undefined,
      servidorId,
    );
    if (classificacao.contaComoDiaUtil) {
      encontrados += 1;
    }
  }

  return data;
}

export function dataIsoParaUtc(valor: string) {
  return new Date(`${valor}T00:00:00.000Z`);
}

export function formatarDataFerias(data: Date | null) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(data);
}
