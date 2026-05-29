import type { SarhEndpointKey, TipoExecucaoSarh } from "../domain/sarh.types";

export type SincronizarSarhInput = {
  tipo?: TipoExecucaoSarh;
  modoSimulacao?: boolean;
  iniciadoPorUsuarioId?: string | null;
  endpoints?: SarhEndpointKey[];
  matricula?: string;
  codigoUnidadeSarh?: number;
  codigoCargoSarh?: number;
};

export const ENDPOINTS_PADRAO_SARH: SarhEndpointKey[] = [
  "empresas",
  "lotacoes",
  "cargos",
  "servidores",
  "lotacoesServidores",
];
