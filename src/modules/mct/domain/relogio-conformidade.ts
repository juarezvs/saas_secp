import type {
  FatoConformidade,
  IntervaloTrabalhado,
  PoliticaJornadaMct,
  ResultadoRelogioConformidade,
  ResultadoRelogioJornada,
} from "./mct.types";
import { duracaoMinutos } from "./tempo";

export function executarRelogioConformidade(params: {
  politica: PoliticaJornadaMct;
  intervalosTrabalhados: IntervaloTrabalhado[];
  possuiPendenciaDeMarcacao?: boolean;
  resultadoJornada?: ResultadoRelogioJornada;
}): ResultadoRelogioConformidade {
  const fatos: FatoConformidade[] = [];
  const primeiraEntrada = params.intervalosTrabalhados[0]?.inicio;
  const ultimaSaida = params.intervalosTrabalhados.at(-1)?.fim;
  const referencia = params.politica.referencia;

  if (params.possuiPendenciaDeMarcacao) {
    fatos.push({
      codigo: "MARCACAO_INCOMPLETA",
      categoria: "PENDENTE",
      descricao: "As marcacoes nao formam todos os intervalos esperados.",
    });
  }

  if (referencia && primeiraEntrada && !params.politica.permiteFlexibilidade) {
    const atraso = Math.floor(
      (primeiraEntrada.getTime() - referencia.inicio.getTime()) / 60_000,
    );
    if (atraso > 0) {
      const tolerado = params.politica.flexibilidadeEntradaMinutos ?? 0;
      const compensadoNoDia =
        atraso > tolerado &&
        params.politica.permiteCompensacaoNoDia === true &&
        params.resultadoJornada?.tempoFaltanteMinutos === 0;
      fatos.push({
        codigo:
          atraso <= tolerado
            ? "ENTRADA_FLEXIVEL"
            : compensadoNoDia
              ? "ENTRADA_TARDIA_COMPENSADA"
              : "ENTRADA_APOS_REFERENCIA",
        categoria:
          atraso <= tolerado || compensadoNoDia ? "REGULAR" : "PENDENTE",
        minutos: atraso,
        descricao:
          atraso <= tolerado
            ? "Entrada dentro da janela flexivel configurada."
            : compensadoNoDia
              ? "Entrada tardia compensada no mesmo dia conforme a politica vigente."
              : "Entrada posterior ao horario de referencia; requer classificacao administrativa.",
      });
    }
  }

  if (
    referencia &&
    ultimaSaida &&
    !params.politica.permiteFlexibilidade &&
    ultimaSaida > referencia.fim
  ) {
    fatos.push({
      codigo: "SAIDA_APOS_REFERENCIA",
      categoria: "INFORMATIVO",
      minutos: Math.floor(
        (ultimaSaida.getTime() - referencia.fim.getTime()) / 60_000,
      ),
      descricao:
        "Permanencia apos o expediente identificada, sem destinacao automatica.",
    });
  }

  if (params.intervalosTrabalhados.length > 1) {
    for (
      let indice = 1;
      indice < params.intervalosTrabalhados.length;
      indice++
    ) {
      const intervalo = {
        inicio: params.intervalosTrabalhados[indice - 1].fim,
        fim: params.intervalosTrabalhados[indice].inicio,
      };
      const minutos = duracaoMinutos(intervalo);
      const minimo = params.politica.intervaloMinimoMinutos;
      const maximo = params.politica.intervaloMaximoMinutos;
      if (minimo != null && minutos < minimo) {
        fatos.push({
          codigo: "INTERVALO_INSUFICIENTE",
          categoria: "PENDENTE",
          minutos,
          descricao: "Intervalo inferior ao minimo definido na politica.",
        });
      }
      if (maximo != null && minutos > maximo) {
        fatos.push({
          codigo: "INTERVALO_EXCESSIVO",
          categoria: "PENDENTE",
          minutos,
          descricao: "Intervalo superior ao maximo definido na politica.",
        });
      }
    }
  }

  return {
    fatos,
    possuiPendencias: fatos.some((fato) => fato.categoria === "PENDENTE"),
  };
}
