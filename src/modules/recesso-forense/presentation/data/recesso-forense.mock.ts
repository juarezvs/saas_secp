export type StatusRecesso = "nao-convocado" | "convocado" | "fechado" | "homologado" | "aceito";
export type EscolhaRecesso = "Pecúnia" | "Folga";

export type PeriodoRecesso = {
  id: string;
  titulo: string;
  intervalo: string;
  status: StatusRecesso;
  chefia: string;
  escolha: EscolhaRecesso;
  convocados: number;
  naoConvocados: number;
};

export type ConvocadoRecesso = {
  id: string;
  nome: string;
  matricula: string;
  diasConvocados: string[];
  chefia: string;
  escolha: EscolhaRecesso;
  status: StatusRecesso;
};

export type DiaRecesso = {
  data: string;
  convocado: boolean;
  marcacoes: string[];
  situacao: "Convocado" | "Recesso forense" | "Homologado";
};

export const periodosRecessoMock: PeriodoRecesso[] = [
  {
    id: "dezembro",
    titulo: "Dezembro",
    intervalo: "20/12 a 31/12",
    status: "homologado",
    chefia: "Mariana Alves",
    escolha: "Folga",
    convocados: 6,
    naoConvocados: 12,
  },
  {
    id: "janeiro",
    titulo: "Janeiro",
    intervalo: "01/01 a 06/01",
    status: "fechado",
    chefia: "Carlos Nogueira",
    escolha: "Pecúnia",
    convocados: 4,
    naoConvocados: 14,
  },
];

export const convocadosRecessoMock: ConvocadoRecesso[] = [
  {
    id: "srv-1",
    nome: "Ana Costa",
    matricula: "AM10203",
    diasConvocados: ["22/12", "23/12", "02/01"],
    chefia: "Mariana Alves",
    escolha: "Folga",
    status: "homologado",
  },
  {
    id: "srv-2",
    nome: "Bruno Lima",
    matricula: "AM20401",
    diasConvocados: ["26/12", "03/01"],
    chefia: "Carlos Nogueira",
    escolha: "Pecúnia",
    status: "fechado",
  },
  {
    id: "srv-3",
    nome: "Carla Mendes",
    matricula: "AM30987",
    diasConvocados: [],
    chefia: "Mariana Alves",
    escolha: "Folga",
    status: "nao-convocado",
  },
];

export const espelhoRecessoMock: DiaRecesso[] = [
  { data: "20/12", convocado: false, marcacoes: [], situacao: "Recesso forense" },
  { data: "21/12", convocado: false, marcacoes: [], situacao: "Recesso forense" },
  { data: "22/12", convocado: true, marcacoes: ["08:00", "12:00", "13:00", "15:00"], situacao: "Convocado" },
  { data: "23/12", convocado: true, marcacoes: ["08:05", "12:01", "13:02", "15:04"], situacao: "Homologado" },
  { data: "24/12", convocado: false, marcacoes: [], situacao: "Recesso forense" },
  { data: "02/01", convocado: true, marcacoes: ["08:10", "12:00"], situacao: "Convocado" },
  { data: "06/01", convocado: false, marcacoes: [], situacao: "Recesso forense" },
];

export const fluxoRecessoMock = [
  "Servidor fecha período",
  "Chefia homologa",
  "SECAD aceita homologação",
  "SEPAG apura pecúnia",
  "SECAP registra folgas",
];

