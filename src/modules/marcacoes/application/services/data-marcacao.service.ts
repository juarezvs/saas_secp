export function obterDataReferencia(dataHora: Date) {
    const dataReferencia = new Date(dataHora);
    dataReferencia.setHours(0, 0, 0, 0);
  
    return dataReferencia;
  }
  
  export function formatarDataHoraPtBr(data: Date) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "America/Manaus",
    }).format(data);
  }
  
  export function formatarHoraPtBr(data: Date) {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "America/Manaus",
    }).format(data);
  }