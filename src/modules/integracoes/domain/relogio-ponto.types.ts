export type FabricanteRelogioPonto =
  | "HENRY"
  | "DIMEP"
  | "CONTROL_ID"
  | "GENERIC";

export type FormatoTemplateBiometricoRelogio =
  | "SUPREMA"
  | "FS_SWIPE_SINATRA"
  | "HENRY_RAW"
  | "DIMEP_RAW"
  | "ISO_19794_2"
  | "ANSI_378";

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
  pis?: string | null;
  matricula?: string | null;
  dataHora: Date;
  codigoExterno?: string | null;
  linhaOriginal?: string | null;
  payload?: unknown;
};

export type TipoRegistroAfdRelogioPonto = "MARCACAO" | "CADASTRO";

export type TipoIdentificadorAfdRelogioPonto =
  | "CPF"
  | "PIS"
  | "DESCONHECIDO";

export type IdentificadorAfdRelogioPonto = {
  nsr: string;
  dataHora: Date;
  tipoRegistro: TipoRegistroAfdRelogioPonto;
  identificador: string;
  tipoIdentificador: TipoIdentificadorAfdRelogioPonto;
  cpf?: string | null;
  pis?: string | null;
  nome?: string | null;
  operacao?: "INCLUSAO" | "EXCLUSAO" | null;
  linhaOriginal?: string | null;
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
    formato?: FormatoTemplateBiometricoRelogio;
  }>;
};

export type CadastroBiometricoEquipamento = {
  codigo?: string | null;
  matricula: string;
  cpf?: string | null;
  nome?: string | null;
  cartoes?: string[];
  templates?: Array<{
    dedo?: number | string | null;
    template: string;
    formato?: FormatoTemplateBiometricoRelogio;
  }>;
  payload?: unknown;
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

export type ResultadoAnaliseAfdRelogioPonto = {
  registros: IdentificadorAfdRelogioPonto[];
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

export type ResultadoLeituraCadastrosBiometricos = {
  cadastros: CadastroBiometricoEquipamento[];
  mensagem: string;
  payload?: unknown;
};

export interface RelogioPontoProvider {
  testarConexao(): Promise<ResultadoSaudeRelogioPonto>;
  coletarMarcacoesDesdeNsr(params: {
    nsrInicial: string | number;
    quantidade?: number;
  }): Promise<ResultadoColetaRelogioPonto>;
  analisarAfdDesdeNsr?(params: {
    nsrInicial: string | number;
    quantidade?: number;
  }): Promise<ResultadoAnaliseAfdRelogioPonto>;
  enviarBiometrias(
    servidores: BiometriaServidorRelogioPonto[],
  ): Promise<ResultadoEnvioBiometriaRelogioPonto>;
  listarCadastrosBiometricos?(params?: {
    indiceInicial?: string | number;
    quantidade?: number;
    incluirTemplates?: boolean;
  }): Promise<ResultadoLeituraCadastrosBiometricos>;
  configurarEventosOnline(params: {
    habilitado: boolean;
    ipServidor?: string | null;
    portaServidor?: number | null;
  }): Promise<{ sucesso: boolean; mensagem: string; payload?: unknown }>;
}
