import type {
  SarhEndpointKey,
  SarhSyncProgress,
  TipoExecucaoSarh,
} from "../domain/sarh.types";

export type SincronizarSarhInput = {
  tipo?: TipoExecucaoSarh;
  modoSimulacao?: boolean;
  iniciadoPorUsuarioId?: string | null;
  orgaoId?: string | null;
  endpoints?: SarhEndpointKey[];
  matricula?: string;
  codigoUnidadeSarh?: number;
  codigosUnidadesSarhPermitidos?: number[];
  codigoCargoSarh?: number;
  atualizarProgresso?: (progresso: SarhSyncProgress) => Promise<void> | void;
  verificarCancelamento?: (execucaoId: string) => Promise<boolean> | boolean;
};

export const ENDPOINTS_PADRAO_SARH: SarhEndpointKey[] = [
  "empresas",
  "lotacoes",
  "cargos",
  "servidores",
  "estagiarios",
  "prestadores",
  "voluntarios",
  "lotacoesServidores",
  "tiposAfastamento",
  "afastamentos",
  "ferias",
  "chefias",
  "substituicoes",
  "calendarios",
];
