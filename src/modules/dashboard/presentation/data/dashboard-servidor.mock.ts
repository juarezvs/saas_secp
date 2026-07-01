import {
  CalendarDays,
  CalendarRange,
  CalendarX,
  ClipboardCheck,
  ClipboardList,
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
};

export const dashboardServidorMock = {
  servidor: {
    nome: "Juarez",
    perfil: "Servidor",
    unidade: "SJAM > SECAD > NUTEC",
    dataExtenso: "Segunda-feira, 01 de junho de 2026",
    horaReferencia: "08:02",
    fusoHorario: "America/Manaus",
  },
  proximaAcao: {
    titulo: "Registre sua entrada por reconhecimento facial.",
    descricao: "Use o registro eletrônico/biométrico para iniciar sua jornada.",
    href: "/marcacoes/registrar",
    regra: "Regra aplicada: registro eletrônico/biométrico de frequência.",
  },
  metricas: [
    {
      titulo: "Jornada hoje",
      valor: "7h00",
      descricao: "Jornada prevista",
      icon: Clock,
      variante: "info",
    },
    {
      titulo: "Trabalhado hoje",
      valor: "00h00",
      descricao: "Horas registradas",
      icon: Clock,
      variante: "success",
    },
    {
      titulo: "Banco de horas",
      valor: "+08h20",
      descricao: "Saldo atual",
      icon: Hourglass,
      variante: "success",
    },
    {
      titulo: "Pendências",
      valor: "1",
      descricao: "Ajuste pendente",
      icon: ClipboardList,
      variante: "warning",
    },
  ] satisfies MetricaServidor[],
  marcacoes: [
    { rotulo: "Entrada", horario: "--:--", status: "pendente" },
    { rotulo: "Saída intervalo", horario: "--:--", status: "pendente" },
    { rotulo: "Retorno intervalo", horario: "--:--", status: "pendente" },
    { rotulo: "Saída", horario: "--:--", status: "pendente" },
  ] satisfies MarcacaoDia[],
  alertas: [
    {
      tipo: "warning",
      titulo: "Ajuste pendente de justificativa",
      descricao: "Resolva a pendência antes do fechamento mensal.",
      acao: { label: "Resolver agora", href: "/solicitacoes" },
    },
    {
      tipo: "info",
      titulo: "Homologação mensal",
      descricao: "Sua chefia realizará a homologação mensal da frequência.",
    },
    {
      tipo: "success",
      titulo: "Consulta disponível",
      descricao: "Consulte frequência e saldo sempre que precisar.",
    },
  ] satisfies AlertaServidor[],
  frequenciaMes: {
    mes: "Junho/2026",
    diasUteis: 21,
    regular: 14,
    pendente: 3,
    falta: 1,
    recesso: 2,
    aguardando: 1,
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
      descricao: "Consulte férias, licenças e demais afastamentos.",
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
        "recesso:aceitar:secad",
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
  regras: [
    "Registro eletrônico/biométrico de frequência.",
    "Jornada diária prevista de 7h ou 8h, conforme vínculo.",
    "Consulta de frequência e saldo pelo servidor.",
    "Homologação mensal pela chefia imediata.",
  ],
};
