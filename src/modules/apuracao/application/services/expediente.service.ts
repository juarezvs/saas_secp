export const EXPEDIENTE_PADRAO = {
  inicio: "08:00",
  fim: "18:00",
} as const;

export const EXPEDIENTE_DIFERENCIADO_LIMITE = {
  inicio: "06:00",
  fim: "19:00",
} as const;

type JornadaExpediente = {
  horarioDiferenciadoPermitido: boolean;
  horarioDiferenciadoAutorizado: boolean;
  entradaMinimaDiferenciada: string | null;
  saidaMaximaDiferenciada: string | null;
};

export type JanelaExpediente = {
  inicio: string;
  fim: string;
  diferenciada: boolean;
};

function horaParaMinutos(hora: string) {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
}

function minutosLocais(data: Date) {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Manaus",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);

  const horas = Number(partes.find((parte) => parte.type === "hour")?.value);
  const minutos = Number(
    partes.find((parte) => parte.type === "minute")?.value,
  );

  return horas * 60 + minutos;
}

export function resolverJanelaExpediente(
  jornada: JornadaExpediente,
): JanelaExpediente {
  const diferenciada =
    jornada.horarioDiferenciadoPermitido &&
    jornada.horarioDiferenciadoAutorizado;

  if (!diferenciada) {
    return {
      ...EXPEDIENTE_PADRAO,
      diferenciada: false,
    };
  }

  return {
    inicio:
      jornada.entradaMinimaDiferenciada ??
      EXPEDIENTE_DIFERENCIADO_LIMITE.inicio,
    fim:
      jornada.saidaMaximaDiferenciada ??
      EXPEDIENTE_DIFERENCIADO_LIMITE.fim,
    diferenciada: true,
  };
}

export function calcularMinutosNoExpediente(params: {
  inicio: Date;
  fim: Date;
  janela: JanelaExpediente;
}) {
  const inicioSegmento = minutosLocais(params.inicio);
  const fimSegmento = minutosLocais(params.fim);
  const inicioJanela = horaParaMinutos(params.janela.inicio);
  const fimJanela = horaParaMinutos(params.janela.fim);

  return Math.max(
    0,
    Math.min(fimSegmento, fimJanela) -
      Math.max(inicioSegmento, inicioJanela),
  );
}
