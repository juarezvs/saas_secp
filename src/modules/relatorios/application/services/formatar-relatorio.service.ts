export function minutosParaHoraRelatorio(minutos: number) {
  const sinal = minutos < 0 ? "-" : "";
  const abs = Math.abs(minutos);
  const horas = Math.floor(abs / 60);
  const resto = abs % 60;

  return `${sinal}${String(horas).padStart(2, "0")}:${String(resto).padStart(
    2,
    "0",
  )}`;
}

export function formatarDataRelatorio(data: Date | null | undefined) {
  if (!data) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR").format(data);
}

export function formatarDataHoraRelatorio(data: Date | null | undefined) {
  if (!data) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Manaus",
  }).format(data);
}

export function nomeMesReferencia(mes: number) {
  const nomes = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  return nomes[mes - 1] ?? String(mes);
}
