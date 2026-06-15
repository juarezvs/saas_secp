export function diferencaEmMinutos(inicio: Date, fim: Date) {
  return Math.max(0, Math.floor((fim.getTime() - inicio.getTime()) / 60000));
}

export function minutosParaTexto(minutos: number) {
  const sinal = minutos < 0 ? "-" : "";
  const abs = Math.abs(minutos);
  const horas = Math.floor(abs / 60);
  const resto = abs % 60;

  return `${sinal}${String(horas).padStart(2, "0")}:${String(resto).padStart(
    2,
    "0",
  )}`;
}

export function normalizarDataReferencia(data: Date) {
  const representaDataSemHorario =
    data.getUTCHours() === 0 &&
    data.getUTCMinutes() === 0 &&
    data.getUTCSeconds() === 0 &&
    data.getUTCMilliseconds() === 0;

  if (representaDataSemHorario) {
    return new Date(
      Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()),
    );
  }

  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);
  const ano = Number(partes.find((parte) => parte.type === "year")?.value);
  const mes = Number(partes.find((parte) => parte.type === "month")?.value);
  const dia = Number(partes.find((parte) => parte.type === "day")?.value);

  return new Date(Date.UTC(ano, mes - 1, dia));
}
