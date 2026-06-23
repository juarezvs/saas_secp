export type FabricanteRelogioPonto = "HENRY" | "GENERIC";

export type StatusOperacionalRelogio =
  | "ONLINE"
  | "OFFLINE"
  | "DEGRADADO"
  | "DESCONHECIDO";

export type DadosConexaoRelogioPonto = {
  equipamentoId: string;
  codigo: string;
  fabricante: FabricanteRelogioPonto;
  modelo?: string | null;
  ip: string;
  porta: number;
  usuario?: string | null;
  senha?: string | null;
  timeoutMs?: number | null;
  configuracao?: unknown;
};

export type MarcacaoRelogioPonto = {
  nsr?: string | null;
  cpf?: string | null;
  matricula?: string | null;
  dataHora: Date;
  codigoExterno?: string | null;
  linhaOriginal?: string | null;
  payload?: unknown;
};

export type BiometriaServidorRelogioPonto = {
  matricula: string;
  cpf?: string | null;
  nome?: string | null;
  pis?: string | null;
  verificaBiometria?: boolean;
  templates: Array<{
    dedo?: number | string | null;
    template: string;
    formato?: "SUPREMA" | "FS_SWIPE_SINATRA" | "HENRY_RAW";
  }>;
};

export type ResultadoSaudeRelogioPonto = {
  status: StatusOperacionalRelogio;
  mensagem: string;
  dataHoraConsulta: Date;
  quantidadeUsuarios?: number | null;
  quantidadeDigitais?: number | null;
  quantidadeRegistros?: number | null;
  detalhes?: Record<string, unknown>;
};

export type ResultadoColetaRelogioPonto = {
  marcacoes: MarcacaoRelogioPonto[];
  proximoNsr?: string | null;
  mensagem: string;
  payload?: unknown;
};

export type ResultadoEnvioBiometriaRelogioPonto = {
  sucesso: boolean;
  mensagem: string;
  enviados: number;
  rejeitados: number;
  detalhes?: unknown;
};

export interface RelogioPontoProvider {
  testarConexao(): Promise<ResultadoSaudeRelogioPonto>;
  coletarMarcacoesDesdeNsr(params: {
    nsrInicial: string | number;
    quantidade?: number;
  }): Promise<ResultadoColetaRelogioPonto>;
  enviarBiometrias(
    servidores: BiometriaServidorRelogioPonto[],
  ): Promise<ResultadoEnvioBiometriaRelogioPonto>;
  configurarEventosOnline(params: {
    habilitado: boolean;
    ipServidor?: string | null;
    portaServidor?: number | null;
  }): Promise<{ sucesso: boolean; mensagem: string; payload?: unknown }>;
}
