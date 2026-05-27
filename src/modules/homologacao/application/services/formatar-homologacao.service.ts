export function minutosParaHoraHomologacao(minutos: number) {
  const sinal = minutos < 0 ? "-" : "";
  const abs = Math.abs(minutos);
  const horas = Math.floor(abs / 60);
  const resto = abs % 60;

  return `${sinal}${String(horas).padStart(2, "0")}:${String(resto).padStart(
    2,
    "0",
  )}`;
}

export function rotuloStatusFechamento(status: string) {
  const rotulos: Record<string, string> = {
    ABERTO: "Aberto",
    EM_HOMOLOGACAO: "Em homologação",
    HOMOLOGADO: "Homologado",
    HOMOLOGADO_PARCIAL: "Homologado parcialmente",
    CANCELADO: "Cancelado",
  };

  return rotulos[status] ?? status;
}

export function rotuloStatusHomologacaoServidor(status: string) {
  const rotulos: Record<string, string> = {
    PENDENTE: "Pendente",
    COM_PENDENCIAS: "Com pendências",
    HOMOLOGADO: "Homologado",
    HOMOLOGADO_COM_RESSALVA: "Homologado com ressalva",
    DEVOLVIDO: "Devolvido",
  };

  return rotulos[status] ?? status;
}

export function classeStatusHomologacao(status: string) {
  if (["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"].includes(status)) {
    return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
  }

  if (status === "COM_PENDENCIAS") {
    return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
  }

  if (status === "DEVOLVIDO") {
    return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
  }

  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}
