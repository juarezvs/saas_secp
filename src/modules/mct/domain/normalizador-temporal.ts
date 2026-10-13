import type {
  EventoTemporal,
  EventoTemporalNormalizado,
  IntervaloTrabalhado,
  PendenciaTemporal,
} from "./mct.types";
import { criarIntervalo } from "./tempo";

const TIPOS_ENTRADA = new Set(["ENTRADA", "FIM_INTERVALO"]);
const TIPOS_SAIDA = new Set(["SAIDA", "INICIO_INTERVALO"]);

export function normalizarEventosTemporais(eventos: EventoTemporal[]): {
  eventos: EventoTemporalNormalizado[];
  intervalosTrabalhados: IntervaloTrabalhado[];
  pendencias: PendenciaTemporal[];
} {
  const ordenados = eventos
    .map((evento) => ({ ...evento, ocorridoEm: new Date(evento.ocorridoEm) }))
    .sort(
      (a, b) =>
        a.ocorridoEm.getTime() - b.ocorridoEm.getTime() ||
        a.id.localeCompare(b.id),
    );
  const normalizados: EventoTemporalNormalizado[] = [];
  const pendencias: PendenciaTemporal[] = [];
  const chaves = new Map<string, string>();

  for (const evento of ordenados) {
    if (!Number.isFinite(evento.ocorridoEm.getTime())) {
      throw new Error(`Evento temporal invalido: ${evento.id}.`);
    }

    const chave = `${evento.tipo}:${evento.ocorridoEm.toISOString()}`;
    const duplicadoDe = chaves.get(chave);
    normalizados.push({ ...evento, duplicadoDe });

    if (duplicadoDe) {
      pendencias.push({
        codigo: "EVENTO_DUPLICADO",
        eventoIds: [duplicadoDe, evento.id],
        descricao: "Eventos equivalentes ocorreram no mesmo instante.",
      });
    } else {
      chaves.set(chave, evento.id);
    }
  }

  const efetivos = normalizados.filter((evento) => !evento.duplicadoDe);
  const intervalosTrabalhados: IntervaloTrabalhado[] = [];
  let entrada: EventoTemporalNormalizado | null = null;

  for (const evento of efetivos) {
    if (TIPOS_ENTRADA.has(evento.tipo)) {
      if (entrada) {
        pendencias.push({
          codigo: "ENTRADA_SEM_SAIDA",
          eventoIds: [entrada.id, evento.id],
          descricao: "Uma nova entrada foi registrada antes da saida anterior.",
        });
      }
      entrada = evento;
      continue;
    }

    if (TIPOS_SAIDA.has(evento.tipo)) {
      if (!entrada) {
        pendencias.push({
          codigo: "SAIDA_SEM_ENTRADA",
          eventoIds: [evento.id],
          descricao: "Foi registrada uma saida sem entrada correspondente.",
        });
        continue;
      }

      const intervalo = criarIntervalo(entrada.ocorridoEm, evento.ocorridoEm);
      intervalosTrabalhados.push({
        ...intervalo,
        eventoEntradaId: entrada.id,
        eventoSaidaId: evento.id,
      });
      entrada = null;
    }
  }

  if (entrada) {
    pendencias.push({
      codigo: "ENTRADA_SEM_SAIDA",
      eventoIds: [entrada.id],
      descricao: "A ultima entrada nao possui saida correspondente.",
    });
  }

  return { eventos: normalizados, intervalosTrabalhados, pendencias };
}

