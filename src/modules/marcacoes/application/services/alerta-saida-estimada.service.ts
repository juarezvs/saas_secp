import { resolverFusoHorarioServidor } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { listarMarcacoesDoUsuarioNoDia } from "../../infrastructure/repositories/marcacao.repository";

const DIA_SEMANA_PRISMA: Record<string, string> = {
  sun: "DOMINGO",
  mon: "SEGUNDA",
  tue: "TERCA",
  wed: "QUARTA",
  thu: "QUINTA",
  fri: "SEXTA",
  sat: "SABADO",
};

function horaParaMinutos(hora?: string | null) {
  if (!hora) return null;

  const [horas, minutos] = hora.split(":").map(Number);

  if (
    !Number.isInteger(horas) ||
    !Number.isInteger(minutos) ||
    horas < 0 ||
    horas > 23 ||
    minutos < 0 ||
    minutos > 59
  ) {
    return null;
  }

  return horas * 60 + minutos;
}

function formatarMinutosComoHora(minutos: number) {
  const minutosNoDia = ((minutos % 1440) + 1440) % 1440;
  const horas = Math.floor(minutosNoDia / 60);
  const minutosRestantes = minutosNoDia % 60;

  return `${String(horas).padStart(2, "0")}:${String(minutosRestantes).padStart(2, "0")}`;
}

function minutosParaTexto(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;

  if (horas > 0 && minutosRestantes > 0) {
    return `${horas}h${String(minutosRestantes).padStart(2, "0")}`;
  }

  if (horas > 0) {
    return `${horas}h`;
  }

  return `${minutosRestantes}min`;
}

function diaSemanaLocal(data: Date, fusoHorario: string) {
  const dia = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: fusoHorario,
  })
    .format(data)
    .toLowerCase();

  return DIA_SEMANA_PRISMA[dia] ?? null;
}

function minutosDoDiaLocal(data: Date, fusoHorario: string) {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: fusoHorario,
  }).formatToParts(data);
  const horas = Number(partes.find((parte) => parte.type === "hour")?.value);
  const minutos = Number(
    partes.find((parte) => parte.type === "minute")?.value,
  );

  return horas * 60 + minutos;
}

function dataLocalIso(data: Date, fusoHorario: string) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: fusoHorario,
  }).formatToParts(data);
  const ano = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;
  const dia = partes.find((parte) => parte.type === "day")?.value;

  return `${ano}-${mes}-${dia}`;
}

function partesDataHoraLocal(data: Date, fusoHorario: string) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: fusoHorario,
  }).formatToParts(data);

  return {
    ano: Number(partes.find((parte) => parte.type === "year")?.value),
    mes: Number(partes.find((parte) => parte.type === "month")?.value),
    dia: Number(partes.find((parte) => parte.type === "day")?.value),
    hora: Number(partes.find((parte) => parte.type === "hour")?.value),
    minuto: Number(partes.find((parte) => parte.type === "minute")?.value),
  };
}

function dataHoraLocalParaUtc(params: {
  dataLocal: string;
  minutosDoDia: number;
  fusoHorario: string;
}) {
  const [ano, mes, dia] = params.dataLocal.split("-").map(Number);
  const hora = Math.floor(params.minutosDoDia / 60);
  const minuto = params.minutosDoDia % 60;
  let utc = new Date(Date.UTC(ano, mes - 1, dia, hora, minuto));

  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    const local = partesDataHoraLocal(utc, params.fusoHorario);
    const diferencaMinutos =
      (ano - local.ano) * 525_600 +
      (mes - local.mes) * 43_200 +
      (dia - local.dia) * 1_440 +
      (hora - local.hora) * 60 +
      (minuto - local.minuto);

    if (diferencaMinutos === 0) break;
    utc = new Date(utc.getTime() + diferencaMinutos * 60_000);
  }

  return utc;
}

function formatarHora(data: Date, fusoHorario: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fusoHorario,
  }).format(data);
}

export async function obterAlertaSaidaEstimadaUsuario(usuarioId: string) {
  const agora = new Date();
  const { servidor, marcacoes } = await listarMarcacoesDoUsuarioNoDia(usuarioId);

  if (!servidor) {
    return { ativo: false, motivo: "Servidor nao localizado." };
  }

  const vinculoJornada = servidor.jornadas[0];
  const fusoHorario = resolverFusoHorarioServidor(servidor);

  if (!vinculoJornada) {
    return { ativo: false, motivo: "Servidor sem jornada ativa." };
  }

  const entradaRegistrada = marcacoes.find((item) => item.tipo === "ENTRADA");
  const saidaRegistrada = marcacoes.find((item) => item.tipo === "SAIDA");

  if (!entradaRegistrada || saidaRegistrada) {
    return {
      ativo: false,
      motivo: saidaRegistrada
        ? "Saida ja registrada hoje."
        : "Entrada ainda nao registrada hoje.",
    };
  }

  const jornada = vinculoJornada.jornada;
  const diaSemana = diaSemanaLocal(agora, fusoHorario);
  const escalaDia = vinculoJornada.escala?.dias.find(
    (dia) => dia.diaSemana === diaSemana,
  );

  if (escalaDia && !escalaDia.trabalha) {
    return { ativo: false, motivo: "Hoje nao ha jornada prevista." };
  }

  const cargaPrevista =
    escalaDia?.cargaPrevistaMinutos && escalaDia.cargaPrevistaMinutos > 0
      ? escalaDia.cargaPrevistaMinutos
      : jornada.cargaDiariaMinutos;
  const intervaloInicio = escalaDia?.intervaloInicio ?? null;
  const intervaloFim = escalaDia?.intervaloFim ?? null;
  const saidaIntervalo = marcacoes.find(
    (item) => item.tipo === "SAIDA_INTERVALO",
  );
  const retornoIntervalo = marcacoes.find(
    (item) => item.tipo === "RETORNO_INTERVALO",
  );
  const intervaloRegistrado =
    saidaIntervalo && retornoIntervalo
      ? minutosDoDiaLocal(retornoIntervalo.dataHora, fusoHorario) -
        minutosDoDiaLocal(saidaIntervalo.dataHora, fusoHorario)
      : null;
  const intervaloPrevisto =
    horaParaMinutos(intervaloFim) !== null &&
    horaParaMinutos(intervaloInicio) !== null
      ? horaParaMinutos(intervaloFim)! - horaParaMinutos(intervaloInicio)!
      : (jornada.intervaloMinimoMinutos ?? 0);
  const minutosIntervaloParaSaida = jornada.exigeIntervalo
    ? Math.max(intervaloRegistrado ?? intervaloPrevisto, 0)
    : 0;
  const entradaMinutos = minutosDoDiaLocal(
    entradaRegistrada.dataHora,
    fusoHorario,
  );
  const saidaEstimadaMinutos =
    entradaMinutos + cargaPrevista + minutosIntervaloParaSaida;
  const saidaEstimadaHora = formatarMinutosComoHora(saidaEstimadaMinutos);
  const dataLocal = dataLocalIso(agora, fusoHorario);
  const saidaEstimadaEm = dataHoraLocalParaUtc({
    dataLocal,
    minutosDoDia: saidaEstimadaMinutos,
    fusoHorario,
  });
  const minutosAteAlerta = Math.floor(
    (saidaEstimadaEm.getTime() - agora.getTime()) / 60_000,
  );

  return {
    ativo: true,
    servidorNome: servidor.usuario.nome,
    fusoHorario,
    agoraServidorIso: agora.toISOString(),
    saidaEstimadaIso: saidaEstimadaEm.toISOString(),
    saidaEstimada: saidaEstimadaHora,
    entradaReferencia: formatarHora(entradaRegistrada.dataHora, fusoHorario),
    carga: minutosParaTexto(cargaPrevista),
    minutosAteAlerta,
    deveAlertarAgora: minutosAteAlerta <= 0,
    mensagem: `Sua jornada estimada foi cumprida às ${saidaEstimadaHora}. Registre a saída se for encerrar o expediente.`,
  };
}

