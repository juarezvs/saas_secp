export type DiaCicloMct = {
  posicao: number;
  trabalha: boolean;
  cargaMinutos: number;
  codigo: string;
};

export type CicloJornadaMct = {
  ancora: Date;
  dias: DiaCicloMct[];
};

export type EfeitoPlanejamentoMct =
  | { tipo: "DISPENSA_JORNADA" }
  | { tipo: "DEFINE_CARGA"; minutos: number }
  | { tipo: "REDUZ_CARGA"; minutos: number }
  | { tipo: "CONSIDERA_CUMPRIDA"; minutos?: number };

export type OcorrenciaPlanejamentoMct = {
  id: string;
  prioridade: number;
  inicio: Date;
  fim: Date;
  efeito: EfeitoPlanejamentoMct;
};

export type PlanoTemporalDia = {
  dataReferencia: Date;
  trabalha: boolean;
  jornadaPrevistaMinutos: number;
  jornadaExigivelMinutos: number;
  minutosReconhecidosComoExercicio: number;
  posicaoCiclo: number | null;
  codigoDiaCiclo: string | null;
  ocorrenciasAplicadas: string[];
};

export function planejarDia(params: {
  dataReferencia: Date;
  cargaPadraoMinutos: number;
  ciclo?: CicloJornadaMct | null;
  ocorrencias?: OcorrenciaPlanejamentoMct[];
}): PlanoTemporalDia {
  validarMinutos(params.cargaPadraoMinutos);
  const data = normalizarDia(params.dataReferencia);
  const diaCiclo = params.ciclo ? resolverDiaCiclo(params.ciclo, data) : null;
  let trabalha = diaCiclo?.trabalha ?? true;
  let prevista = diaCiclo?.cargaMinutos ?? params.cargaPadraoMinutos;
  let exigivel = trabalha ? prevista : 0;
  let reconhecidos = 0;
  const ocorrenciasAplicadas: string[] = [];
  const ocorrencias = [...(params.ocorrencias ?? [])]
    .filter((item) => data >= normalizarDia(item.inicio) && data <= normalizarDia(item.fim))
    .sort((a, b) => a.prioridade - b.prioridade || a.id.localeCompare(b.id));

  for (const ocorrencia of ocorrencias) {
    ocorrenciasAplicadas.push(ocorrencia.id);
    const efeito = ocorrencia.efeito;
    if (efeito.tipo === "DISPENSA_JORNADA") {
      trabalha = false;
      exigivel = 0;
    } else if (efeito.tipo === "DEFINE_CARGA") {
      validarMinutos(efeito.minutos);
      trabalha = efeito.minutos > 0;
      prevista = efeito.minutos;
      exigivel = efeito.minutos;
    } else if (efeito.tipo === "REDUZ_CARGA") {
      validarMinutos(efeito.minutos);
      exigivel = Math.max(0, exigivel - efeito.minutos);
    } else {
      const quantidade = efeito.minutos ?? exigivel;
      validarMinutos(quantidade);
      reconhecidos = Math.min(exigivel, reconhecidos + quantidade);
    }
  }

  return {
    dataReferencia: data,
    trabalha,
    jornadaPrevistaMinutos: prevista,
    jornadaExigivelMinutos: exigivel,
    minutosReconhecidosComoExercicio: reconhecidos,
    posicaoCiclo: diaCiclo?.posicao ?? null,
    codigoDiaCiclo: diaCiclo?.codigo ?? null,
    ocorrenciasAplicadas,
  };
}

function resolverDiaCiclo(ciclo: CicloJornadaMct, data: Date) {
  if (ciclo.dias.length === 0) throw new Error("Ciclo MCT deve possuir ao menos um dia.");
  const posicoes = [...ciclo.dias].sort((a, b) => a.posicao - b.posicao);
  posicoes.forEach((dia, indice) => {
    if (dia.posicao !== indice) throw new Error("Posicoes do ciclo devem ser continuas e iniciar em zero.");
    validarMinutos(dia.cargaMinutos);
  });
  const diferenca = Math.floor(
    (data.getTime() - normalizarDia(ciclo.ancora).getTime()) / 86_400_000,
  );
  const indice = ((diferenca % posicoes.length) + posicoes.length) % posicoes.length;
  return posicoes[indice];
}

function normalizarDia(data: Date) {
  if (!Number.isFinite(data.getTime())) throw new Error("Data de planejamento invalida.");
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
}

function validarMinutos(valor: number) {
  if (!Number.isInteger(valor) || valor < 0) {
    throw new Error("Carga temporal deve ser inteira e nao negativa.");
  }
}

