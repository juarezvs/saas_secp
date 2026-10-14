export type AnaliseJornadaMctDto = {
  execucaoId: string;
  dataReferencia: string;
  modo: string;
  status: string;
  versaoMotor: string;
  iniciadaEm: string;
  finalizadaEm: string | null;
  duracaoMs: number | null;
  referencia?: {
    entrada: string;
    saida: string;
  } | null;
  politica: {
    codigo: string;
    nome: string;
    versao: number;
  };
  resultadoJornada: unknown;
  resultadoConformidade: unknown;
  memoriaCalculo: unknown;
  eventos: Array<{
    id: string;
    tipo: string;
    fonte: string;
    ocorridoEm: string;
    duplicadoDe: string | null;
  }>;
  segmentos: Array<{
    id: string;
    indice: number;
    inicio: string;
    fim: string;
    minutos: number;
    marcadores: unknown;
  }>;
  fatos: Array<{
    id: string;
    codigo: string;
    categoria: string;
    minutos: number | null;
    descricao: string;
  }>;
  rubricas: Array<{
    id: string;
    codigo: string;
    nome: string;
    dimensao: string;
    quantidade: number;
    status: string;
    destinacao: string | null;
    explicacao: string | null;
    baseIncidencia: unknown;
    fundamentoNormativo: string | null;
  }>;
  comparacaoLegado: {
    totalDivergencias: number;
    possuiDivergenciaCritica: boolean;
    divergencias: unknown;
    comparadoEm: string;
  } | null;
  historico: Array<{
    execucaoId: string;
    status: string;
    versaoMotor: string;
    iniciadaEm: string;
    finalizadaEm: string | null;
  }>;
};
