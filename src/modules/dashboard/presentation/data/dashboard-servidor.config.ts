import {
  CalendarDays,
  CalendarRange,
  CalendarX,
  ClipboardCheck,
  Clock,
  FileText,
  Hourglass,
  type LucideIcon,
} from "lucide-react";

export type MarcacaoDia = {
  rotulo: string;
  horario: string;
  status: "registrada" | "pendente";
};

export type PrevisaoJornadaDia = {
  titulo: string;
  horarios: Array<{
    rotulo: string;
    horario: string;
  }>;
  carga: string;
  indicativo?: string;
  saidaEstimada?: string;
  entradaReferencia?: string;
};

export type AlertaServidor = {
  tipo: "warning" | "info" | "success";
  titulo: string;
  descricao: string;
  acao?: { label: string; href: string };
};

export type AcessoRapido = {
  titulo: string;
  descricao: string;
  href: string;
  icon: LucideIcon;
  permissoes?: string[];
};

export type MetricaServidor = {
  titulo: string;
  valor: string;
  descricao: string;
  icon: LucideIcon;
  variante: "info" | "success" | "warning";
  tempoReal?: {
    inicioIso: string;
    minutosBase: number;
  };
};

export const dashboardServidorConfig = {
  servidor: {
    perfil: "Servidor",
    unidade: "Lotação não informada",
    dataExtenso: "",
    horaReferencia: "",
    fusoHorario: "America/Manaus",
  },
  proximaAcao: {
    titulo: "Registre sua entrada por reconhecimento facial.",
    descricao: "Use o registro eletrônico/biométrico para iniciar sua jornada.",
    href: "/marcacoes/registrar",
    regra: "Regra aplicada: registro eletrônico/biométrico de frequência.",
  },
  acessos: [
    {
      titulo: "Registrar ponto",
      descricao: "Entrada, saída ou intervalo.",
      href: "/marcacoes/registrar",
      icon: Clock,
      permissoes: [
        "marcacoes:registrar-web:proprio",
        "marcacoes:registrar-facial:proprio",
      ],
    },
    {
      titulo: "Espelho de ponto",
      descricao: "Consulte sua frequência mensal.",
      href: "/espelho-ponto",
      icon: CalendarDays,
      permissoes: [
        "espelho-ponto:visualizar:proprio",
        "apuracao:consultar:global",
      ],
    },
    {
      titulo: "Marcações",
      descricao: "Consulte suas marcações do dia.",
      href: "/marcacoes",
      icon: Clock,
      permissoes: [
        "marcacoes:consultar:proprio",
        "marcacoes:visualizar:proprio",
        "marcacoes:consultar:global",
      ],
    },
    {
      titulo: "Meus afastamentos",
      descricao: "Consulte ferias, licencas e demais afastamentos.",
      href: "/meus-afastamentos",
      icon: CalendarX,
      permissoes: ["afastamentos:consultar:proprio"],
    },
    {
      titulo: "Solicitar ajuste",
      descricao: "Corrija falhas de marcação.",
      href: "/solicitacoes/nova",
      icon: ClipboardCheck,
      permissoes: ["solicitacoes:criar:proprio"],
    },
    {
      titulo: "Compensação",
      descricao: "Solicite compensação de horas.",
      href: "/banco-horas",
      icon: Hourglass,
      permissoes: [
        "banco-horas:visualizar:proprio",
        "banco-horas:consultar:proprio",
        "banco-horas:consultar:chefia",
        "banco-horas:consultar:global",
      ],
    },
    {
      titulo: "Recesso forense",
      descricao: "Acompanhe convocações.",
      href: "/recesso-forense",
      icon: CalendarRange,
      permissoes: [
        "recesso:consultar:proprio",
        "recesso:consultar:global",
        "recesso:gerenciar:global",
        "recesso:homologar:chefia",
        "recesso:aceitar:seccional",
      ],
    },
    {
      titulo: "Comprovantes",
      descricao: "Gere comprovantes.",
      href: "/relatorios",
      icon: FileText,
      permissoes: [
        "relatorios:consultar:proprio",
        "relatorios:consultar:global",
        "relatorios-gerenciais:consultar:proprio",
        "relatorios-gerenciais:consultar:chefia",
        "relatorios-gerenciais:consultar:global",
      ],
    },
  ] satisfies AcessoRapido[],
};
