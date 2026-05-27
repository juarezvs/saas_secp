export function rotuloTipoSolicitacao(tipo: string) {
    const rotulos: Record<string, string> = {
      AJUSTE_PONTO: "Ajuste de ponto",
      COMPENSACAO: "Compensação",
      ABONO_JUSTIFICATIVA: "Abono/justificativa",
      ATIVIDADE_EXTERNA: "Atividade externa",
      VIAGEM_SERVICO: "Viagem a serviço",
      CAPACITACAO: "Capacitação",
      DISPENSA_PONTO: "Dispensa de ponto",
      HORA_CREDITO_PREVIA: "Autorização prévia de hora-crédito",
    };
  
    return rotulos[tipo] ?? tipo;
  }
  
  export function rotuloStatusSolicitacao(status: string) {
    const rotulos: Record<string, string> = {
      RASCUNHO: "Rascunho",
      ENVIADA: "Enviada",
      EM_ANALISE: "Em análise",
      DEFERIDA: "Deferida",
      INDEFERIDA: "Indeferida",
      CANCELADA: "Cancelada",
    };
  
    return rotulos[status] ?? status;
  }
  
  export function solicitacaoPodeSerAnalisada(status: string) {
    return ["ENVIADA", "EM_ANALISE"].includes(status);
  }
  
  export function classeStatusSolicitacao(status: string) {
    if (status === "DEFERIDA") {
      return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
    }
  
    if (status === "INDEFERIDA") {
      return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
    }
  
    if (["ENVIADA", "EM_ANALISE"].includes(status)) {
      return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
    }
  
    return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }