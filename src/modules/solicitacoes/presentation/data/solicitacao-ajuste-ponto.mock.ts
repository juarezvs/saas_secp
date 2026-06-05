import type { StepperStep } from "@/components/ui";

export type SolicitacaoAjustePonto = {
  dataMarcacao: string;
  tipoMarcacao: string;
  horarioSolicitado: string;
  justificativa: string;
  anexoNome: string;
};

export const solicitacaoInicial: SolicitacaoAjustePonto = {
  dataMarcacao: "",
  tipoMarcacao: "",
  horarioSolicitado: "",
  justificativa: "",
  anexoNome: "",
};

export const etapasSolicitacaoAjuste: StepperStep[] = [
  { id: "data", title: "Data", description: "Dia da ocorrência" },
  { id: "marcacao", title: "Marcação", description: "Horário faltante" },
  { id: "justificativa", title: "Justificativa", description: "Explique o fato" },
  { id: "anexo", title: "Anexo", description: "Opcional" },
  { id: "revisao", title: "Revisão", description: "Conferir dados" },
  { id: "comprovante", title: "Comprovante", description: "Protocolo visual" },
];

export const tiposMarcacaoMock = [
  "Entrada",
  "Saída intervalo",
  "Retorno intervalo",
  "Saída",
];

export const comprovanteSolicitacaoMock = {
  protocolo: "SOL-AJUSTE-20260601-001",
  responsavel: "Chefia imediata da unidade",
  status: "Enviada para análise",
  dataEnvio: "01/06/2026 08:14",
};

