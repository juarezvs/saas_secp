export type ObterVigenciasRemuneratoriasInput = {
  orgaoId: string;
  servidorId: string;
  competencia: string;
};

export type VigenciaRemuneratoriaComSnapshot = {
  id: string;
  inicio: string;
  fim?: string;
  remuneracaoBaseCentavos: number;
  origem: "SARH" | "SNAPSHOT" | "MANUAL";
  fonteDocumento?: string | null;
  consultadoEm?: Date | null;
  payload?: unknown;
};

export type RemuneracaoProvider = {
  obterVigenciasRemuneratorias(
    input: ObterVigenciasRemuneratoriasInput,
  ): Promise<VigenciaRemuneratoriaComSnapshot[]>;
};

export class RemuneracaoIndisponivelError extends Error {
  constructor(message = "Remuneracao historica indisponivel.") {
    super(message);
    this.name = "RemuneracaoIndisponivelError";
  }
}

export class RemuneracaoProviderPendente implements RemuneracaoProvider {
  async obterVigenciasRemuneratorias(): Promise<
    VigenciaRemuneratoriaComSnapshot[]
  > {
    throw new RemuneracaoIndisponivelError(
      "Integracao SARH de remuneracao historica ainda nao configurada.",
    );
  }
}
