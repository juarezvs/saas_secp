import type { ModoOperacaoMct } from "./mct.types";

export function resolverModoOperacaoMct(params: {
  solicitado?: ModoOperacaoMct | null;
  permitirModoOficial?: boolean;
  competenciaHomologada?: boolean;
}): ModoOperacaoMct {
  const modo = params.solicitado ?? "LEGACY";
  if (modo !== "MCT") return modo;
  if (!params.permitirModoOficial) {
    throw new Error("Modo oficial MCT bloqueado: piloto ainda nao autorizado.");
  }
  if (params.competenciaHomologada) {
    throw new Error("Modo oficial MCT nao pode reprocessar competencia homologada.");
  }
  return modo;
}

