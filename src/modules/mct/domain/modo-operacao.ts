import type { ModoOperacaoMct } from "./mct.types";

export function resolverModoOperacaoMct(params: {
  solicitado?: ModoOperacaoMct | null;
  permitirModoOficial?: boolean;
  competenciaHomologada?: boolean;
  escopoExplicitamenteHabilitado?: boolean;
  outroEscritorOficialAtivo?: boolean;
}): ModoOperacaoMct {
  const modo = params.solicitado ?? "LEGACY";
  if (modo !== "MCT") return modo;
  if (!params.permitirModoOficial) {
    throw new Error("Modo oficial MCT bloqueado: piloto ainda nao autorizado.");
  }
  if (!params.escopoExplicitamenteHabilitado) {
    throw new Error("Modo oficial MCT bloqueado: escopo sem habilitacao explicita.");
  }
  if (params.outroEscritorOficialAtivo) {
    throw new Error("Modo oficial MCT bloqueado: ja existe outro escritor oficial no escopo.");
  }
  if (params.competenciaHomologada) {
    throw new Error("Modo oficial MCT nao pode reprocessar competencia homologada.");
  }
  return modo;
}

