type HomologacaoServidor = {
  id: string;
  servidorId: string;
  status: string;
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosCredito: number;
  minutosDebito: number;
  faltas: number;
  saldoBancoAntesMinutos: number;
  saldoBancoDepoisMinutos: number | null;
  observacaoChefia: string | null;
  pendencias: unknown;
};

export function consolidarBoletimServidor(homologacao: HomologacaoServidor) {
  let tipoResumo:
    | "REGULAR"
    | "COM_RESSALVA"
    | "COM_FALTA"
    | "COM_DEBITO"
    | "COM_CREDITO"
    | "COM_PENDENCIA" = "REGULAR";

  if (homologacao.status === "HOMOLOGADO_COM_RESSALVA") {
    tipoResumo = "COM_RESSALVA";
  }

  if (homologacao.faltas > 0) {
    tipoResumo = "COM_FALTA";
  }

  if (homologacao.minutosDebito > 0) {
    tipoResumo = "COM_DEBITO";
  }

  if (homologacao.minutosCredito > 0) {
    tipoResumo = "COM_CREDITO";
  }

  const pendencias =
    Array.isArray(homologacao.pendencias) && homologacao.pendencias.length > 0
      ? homologacao.pendencias
      : [];

  if (
    pendencias.length > 0 &&
    homologacao.status !== "HOMOLOGADO_COM_RESSALVA"
  ) {
    tipoResumo = "COM_PENDENCIA";
  }

  return {
    servidorId: homologacao.servidorId,
    homologacaoServidorMesId: homologacao.id,
    tipoResumo,
    cargaPrevistaMinutos: homologacao.cargaPrevistaMinutos,
    minutosTrabalhados: homologacao.minutosTrabalhados,
    minutosCredito: homologacao.minutosCredito,
    minutosDebito: homologacao.minutosDebito,
    faltas: homologacao.faltas,
    saldoBancoAntesMinutos: homologacao.saldoBancoAntesMinutos,
    saldoBancoDepoisMinutos: homologacao.saldoBancoDepoisMinutos,
    observacaoChefia: homologacao.observacaoChefia,
    ressalvas:
      homologacao.status === "HOMOLOGADO_COM_RESSALVA"
        ? {
            observacaoChefia: homologacao.observacaoChefia,
          }
        : null,
    ocorrencias: {
      pendencias,
      statusHomologacao: homologacao.status,
    },
  };
}
