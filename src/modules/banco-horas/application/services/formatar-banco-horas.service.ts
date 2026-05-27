export function minutosParaHoraBanco(minutos: number) {
    const sinal = minutos < 0 ? "-" : "";
    const abs = Math.abs(minutos);
    const horas = Math.floor(abs / 60);
    const resto = abs % 60;
  
    return `${sinal}${String(horas).padStart(2, "0")}:${String(resto).padStart(
      2,
      "0"
    )}`;
  }
  
  export function rotuloTipoMovimentoBancoHoras(tipo: string) {
    const rotulos: Record<string, string> = {
      CREDITO: "Crédito",
      DEBITO: "Débito",
      COMPENSACAO_CREDITO: "Compensação de crédito",
      COMPENSACAO_DEBITO: "Compensação de débito",
      HORAS_ACIMA_LIMITE: "Horas acima do limite",
      HORAS_NAO_AUTORIZADAS: "Horas não autorizadas",
      AJUSTE_MANUAL: "Ajuste manual",
      ESTORNO: "Estorno",
    };
  
    return rotulos[tipo] ?? tipo;
  }