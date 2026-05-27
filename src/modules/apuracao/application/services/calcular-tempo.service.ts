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
      "0"
    )}`;
  }
  
  export function normalizarDataReferencia(data: Date) {
    const ref = new Date(data);
    ref.setHours(0, 0, 0, 0);
    return ref;
  }