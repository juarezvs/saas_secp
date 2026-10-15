import type { IntervaloTemporal } from "./tempo";

export type ModoOperacaoMct = "LEGACY" | "SHADOW" | "MCT";

export type TipoEventoTemporal =
  "ENTRADA" | "SAIDA" | "INICIO_INTERVALO" | "FIM_INTERVALO";

export type EventoTemporal = {
  id: string;
  ocorridoEm: Date;
  tipo: TipoEventoTemporal;
  fonte: string;
  idOrigem?: string;
};

export type EventoTemporalNormalizado = EventoTemporal & {
  duplicadoDe?: string;
};

export type PendenciaTemporal = {
  codigo: "EVENTO_DUPLICADO" | "ENTRADA_SEM_SAIDA" | "SAIDA_SEM_ENTRADA";
  eventoIds: string[];
  descricao: string;
};

export type IntervaloTrabalhado = IntervaloTemporal & {
  eventoEntradaId: string;
  eventoSaidaId: string;
};

export type SegmentoTemporal = IntervaloTemporal & {
  indice: number;
  minutos: number;
  ativo: boolean;
  marcadores: string[];
};

export type PoliticaJornadaMct = {
  id: string;
  versao: number;
  orgaoId: string;
  vigenciaInicio: Date;
  vigenciaFim?: Date | null;
  cargaExigivelMinutos: number;
  referencia?: IntervaloTemporal | null;
  intervaloMinimoMinutos?: number | null;
  intervaloMaximoMinutos?: number | null;
  flexibilidadeEntradaMinutos?: number;
  flexibilidadeSaidaMinutos?: number;
  permiteFlexibilidade?: boolean;
  permiteCompensacaoNoDia?: boolean;
  fusoHorario?: string;
};

export type ResultadoRelogioJornada = {
  jornadaPrevistaMinutos: number;
  jornadaExigivelMinutos: number;
  permanenciaBrutaMinutos: number;
  tempoEfetivamenteTrabalhadoMinutos: number;
  intervalosNaoComputaveisMinutos: number;
  tempoComputavelMinutos: number;
  tempoFaltanteMinutos: number;
  excedenteBrutoMinutos: number;
  creditoReconhecidoMinutos: number;
  debitoReconhecidoMinutos: number;
  excedentePendenteMinutos: number;
  jornadaCompletadaEm: Date | null;
};

export type FatoConformidade = {
  codigo: string;
  categoria: "INFORMATIVO" | "REGULAR" | "PENDENTE" | "NAO_REGULARIZADO";
  minutos?: number;
  descricao: string;
};

export type ResultadoRelogioConformidade = {
  fatos: FatoConformidade[];
  possuiPendencias: boolean;
};
