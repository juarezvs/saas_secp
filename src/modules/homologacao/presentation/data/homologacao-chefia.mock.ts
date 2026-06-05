export type StatusHomologacaoMock = "critico" | "pendente" | "regular" | "homologado";

export type ServidorHomologacaoMock = {
  id: string;
  nome: string;
  matricula: string;
  unidade: string;
  status: StatusHomologacaoMock;
  resumo: {
    comparecimentos: number;
    ausencias: number;
    credito: string;
    debito: string;
    solicitacoes: number;
  };
  pendencias: string[];
  ultimaAcao: string;
};

export const homologacaoChefiaMock = {
  competencia: "Junho/2026",
  unidade: "NUTEC",
  prazos: {
    homologacao: "Até o 2º dia útil",
    boletim: "Envio do boletim até o dia 10",
  },
  metricas: {
    total: 18,
    regulares: 11,
    pendentes: 4,
    criticos: 2,
    homologados: 1,
  },
  servidores: [
    {
      id: "srv-001",
      nome: "Ana Costa",
      matricula: "AM10203",
      unidade: "NUTEC",
      status: "critico",
      resumo: { comparecimentos: 18, ausencias: 1, credito: "+02h10", debito: "07h00", solicitacoes: 2 },
      pendencias: ["Falta sem justificativa em 03/06", "Solicitação de ajuste aguardando análise"],
      ultimaAcao: "Pendente há 2 dias úteis",
    },
    {
      id: "srv-002",
      nome: "Bruno Lima",
      matricula: "AM20401",
      unidade: "NUTEC",
      status: "pendente",
      resumo: { comparecimentos: 20, ausencias: 0, credito: "+01h25", debito: "00h40", solicitacoes: 1 },
      pendencias: ["Banco de horas com débito a compensar"],
      ultimaAcao: "Aguardando validação da chefia",
    },
    {
      id: "srv-003",
      nome: "Carla Mendes",
      matricula: "AM30987",
      unidade: "NUTEC",
      status: "regular",
      resumo: { comparecimentos: 21, ausencias: 0, credito: "+00h30", debito: "00h00", solicitacoes: 0 },
      pendencias: [],
      ultimaAcao: "Pronto para homologar",
    },
    {
      id: "srv-004",
      nome: "Diego Rocha",
      matricula: "AM40112",
      unidade: "NUTEC",
      status: "homologado",
      resumo: { comparecimentos: 21, ausencias: 0, credito: "+00h00", debito: "00h00", solicitacoes: 0 },
      pendencias: [],
      ultimaAcao: "Homologado em 02/07/2026",
    },
  ] satisfies ServidorHomologacaoMock[],
};

export const timelineAuditoriaMock = [
  { data: "01/07/2026 08:10", evento: "Fechamento mensal aberto", autor: "Sistema SECP" },
  { data: "01/07/2026 09:25", evento: "Pendências críticas priorizadas", autor: "Chefia imediata" },
  { data: "02/07/2026 10:40", evento: "Servidor regular homologado", autor: "Chefia imediata" },
];

export const approvalFlowMock = [
  "Conferir pendências",
  "Analisar solicitações",
  "Decidir devolução ou homologação",
  "Preparar boletim até o dia 10",
];

