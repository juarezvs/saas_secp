export function minutosParaHoraBanco(minutos: number) {
  const sinal = minutos < 0 ? "-" : "";
  const abs = Math.abs(minutos);
  const horas = Math.floor(abs / 60);
  const resto = abs % 60;

  return `${sinal}${String(horas).padStart(2, "0")}:${String(resto).padStart(
    2,
    "0",
  )}`;
}

export function rotuloTipoMovimentoBancoHoras(tipo: string) {
  const rotulos: Record<string, string> = {
    CREDITO: "Crédito",
    DEBITO: "Débito",
    COMPENSACAO_CREDITO: "Utilização de crédito",
    COMPENSACAO_DEBITO: "Compensação de débito",
    HORAS_ACIMA_LIMITE: "Horas acima do limite",
    HORAS_NAO_AUTORIZADAS: "Horas não autorizadas",
    AJUSTE_MANUAL: "Ajuste manual",
    ESTORNO: "Estorno",
  };

  return rotulos[tipo] ?? tipo;
}

export function rotuloOrigemMovimentoBancoHoras(origem: string) {
  const rotulos: Record<string, string> = {
    APURACAO_DIARIA: "Apuração diária",
    SOLICITACAO: "Solicitação",
    HOMOLOGACAO: "Homologação",
    AJUSTE_ADMINISTRATIVO: "Ajuste administrativo",
    IMPORTACAO: "Importação",
  };

  return rotulos[origem] ?? origem;
}

export function rotuloStatusMovimentoBancoHoras(status: string) {
  const rotulos: Record<string, string> = {
    PENDENTE: "Pendente",
    VALIDADO: "Validado",
    DESCONSIDERADO: "Desconsiderado",
    EXPIRADO: "Expirado",
    ESTORNADO: "Estornado",
  };

  return rotulos[status] ?? status;
}

export function rotuloSituacaoLoteBancoHoras(situacao?: string | null) {
  const rotulos: Record<string, string> = {
    VIGENTE: "Vigente",
    PARCIALMENTE_COMPENSADO: "Parcialmente compensado",
    COMPENSADO: "Compensado",
    VENCIDO: "Vencido",
    PARCIALMENTE_COMPENSADO_VENCIDO: "Parcialmente compensado e vencido",
  };

  return situacao ? rotulos[situacao] ?? situacao : "Sem rastreamento";
}
