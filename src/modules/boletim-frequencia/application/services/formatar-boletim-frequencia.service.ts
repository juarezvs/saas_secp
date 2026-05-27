export function minutosParaHoraBoletim(minutos: number) {
  const sinal = minutos < 0 ? "-" : "";
  const abs = Math.abs(minutos);
  const horas = Math.floor(abs / 60);
  const resto = abs % 60;

  return `${sinal}${String(horas).padStart(2, "0")}:${String(resto).padStart(
    2,
    "0",
  )}`;
}

export function rotuloStatusBoletim(status: string) {
  const rotulos: Record<string, string> = {
    GERADO: "Gerado",
    ENCAMINHADO_SECAP: "Encaminhado à SECAP/NUCGP",
    RECEBIDO_SECAP: "Recebido pela SECAP/NUCGP",
    CONFERIDO: "Conferido",
    CANCELADO: "Cancelado",
  };

  return rotulos[status] ?? status;
}

export function classeStatusBoletim(status: string) {
  if (["CONFERIDO", "RECEBIDO_SECAP"].includes(status)) {
    return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
  }

  if (status === "ENCAMINHADO_SECAP") {
    return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
  }

  if (status === "CANCELADO") {
    return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
  }

  return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
}

export function rotuloTipoResumoServidor(tipo: string) {
  const rotulos: Record<string, string> = {
    REGULAR: "Regular",
    COM_RESSALVA: "Com ressalva",
    COM_FALTA: "Com falta",
    COM_DEBITO: "Com débito",
    COM_CREDITO: "Com crédito",
    COM_PENDENCIA: "Com pendência",
  };

  return rotulos[tipo] ?? tipo;
}
