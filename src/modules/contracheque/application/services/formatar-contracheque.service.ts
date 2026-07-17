const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatadorNumero = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const meses = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function competenciaAtualNoFuso(fusoHorario = "America/Manaus") {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const ano = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;

  return `${ano}-${mes}`;
}

export function normalizarCompetenciaContracheque(competencia?: string | null) {
  return /^\d{4}-\d{2}$/.test(competencia ?? "")
    ? String(competencia)
    : competenciaAtualNoFuso();
}

export function dividirCompetenciaContracheque(competencia: string) {
  const normalizada = normalizarCompetenciaContracheque(competencia);
  const [ano, mes] = normalizada.split("-").map(Number);

  return { ano, mes };
}

export function competenciaParaDataFolha(competencia: string) {
  const { ano, mes } = dividirCompetenciaContracheque(competencia);

  return new Date(Date.UTC(ano, mes - 1, 1, 4));
}

export function dataDocumentoContrachequeParaId(data: Date) {
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(data.getUTCDate()).padStart(2, "0")}`;
}

export function formatarDataDocumentoContracheque(data: Date | null | undefined) {
  if (!data) return "-";

  return `${String(data.getUTCDate()).padStart(2, "0")}/${String(
    data.getUTCMonth() + 1,
  ).padStart(2, "0")}/${data.getUTCFullYear()}`;
}

export function montarIdDocumentoContracheque(
  chaveFolha: Date,
  sequdepe: number,
  sequpa: number,
) {
  return `${dataDocumentoContrachequeParaId(chaveFolha)}_${sequdepe}_${sequpa}`;
}

export function lerIdDocumentoContracheque(documento?: string | null) {
  const match = String(documento ?? "").match(
    /^(\d{4}-\d{2}-\d{2})_(-?\d+)_(-?\d+)$/,
  );

  if (!match) return null;

  return {
    data: match[1],
    sequdepe: Number(match[2]),
    sequpa: Number(match[3]),
  };
}

export function rotuloCompetenciaContracheque(competencia: string) {
  const { ano, mes } = dividirCompetenciaContracheque(competencia);

  return `${meses[mes - 1] ?? String(mes)} de ${ano}`;
}

export function formatarMoedaContracheque(valor: number | null | undefined) {
  return formatadorMoeda.format(valor ?? 0);
}

export function formatarNumeroContracheque(valor: number | null | undefined) {
  return formatadorNumero.format(valor ?? 0);
}

export function formatarDataContracheque(data: Date | null | undefined) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Manaus",
  }).format(data);
}

export function formatarDataHoraContracheque(data: Date | null | undefined) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Manaus",
  }).format(data);
}
