import { buscarContextoDashboardServidor } from "@/modules/dashboard/application/dashboard-servidor-contexto.service";
import { buscarFrequenciaMesServidorPorUsuarioId } from "@/modules/dashboard/application/frequencia-mes-servidor.service";
import { buscarResumoDashboardServidor } from "@/modules/dashboard/application/dashboard-servidor-resumo.service";
import { DashboardServidor as DashboardServidorAtual } from "@/modules/dashboard/presentation/components/dashboard-servidor";
import { filtrarPermissoesLiberadas } from "@/modules/rotinas/application/services/liberacao-rotinas.service";
import type {
  MarcacaoDia,
  PrevisaoJornadaDia,
} from "@/modules/dashboard/presentation/data/dashboard-servidor.config";
import { obterRotuloTipoMarcacao } from "@/modules/marcacoes/application/services/classificar-marcacao.service";
import { listarMarcacoesDoUsuarioNoDia } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { contarNotificacoesUsuario } from "@/modules/notificacoes/application/notificacoes.service";
import { resolverFusoHorarioServidor } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { buscarNomeServidorPorUsuarioId } from "@/modules/servidores/infrastructure/repositories/servidor.repository";

type DashboardServidorProps = {
  usuarioId: string;
  nomeFallback: string;
  perfilAtivoCodigo?: string | null;
  permissoesPerfil?: string[];
};

const SLOTS_COM_INTERVALO = [
  "ENTRADA",
  "SAIDA_INTERVALO",
  "RETORNO_INTERVALO",
  "SAIDA",
];

const SLOTS_SEM_INTERVALO = ["ENTRADA", "SAIDA"];

const DIA_SEMANA_PRISMA: Record<string, string> = {
  sun: "DOMINGO",
  mon: "SEGUNDA",
  tue: "TERCA",
  wed: "QUARTA",
  thu: "QUINTA",
  fri: "SEXTA",
  sat: "SABADO",
};

function formatarHoraMarcacao(dataHora: Date, fusoHorario?: string | null) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fusoHorario ?? "America/Manaus",
  }).format(dataHora);
}

function formatarMinutosComoHora(minutos: number) {
  const minutosNoDia = ((minutos % 1440) + 1440) % 1440;
  const horas = Math.floor(minutosNoDia / 60);
  const minutosRestantes = minutosNoDia % 60;

  return `${String(horas).padStart(2, "0")}:${String(minutosRestantes).padStart(2, "0")}`;
}

function horaParaMinutos(hora?: string | null) {
  if (!hora) {
    return null;
  }

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

function diaSemanaLocal(data = new Date(), fusoHorario?: string | null) {
  const dia = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: fusoHorario ?? "America/Manaus",
  })
    .format(data)
    .toLowerCase();

  return DIA_SEMANA_PRISMA[dia] ?? null;
}

function minutosDoDiaLocal(data: Date, fusoHorario?: string | null) {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: fusoHorario ?? "America/Manaus",
  }).formatToParts(data);
  const horas = Number(partes.find((parte) => parte.type === "hour")?.value);
  const minutos = Number(
    partes.find((parte) => parte.type === "minute")?.value,
  );

  return horas * 60 + minutos;
}

function montarPrevisaoJornadaDia(
  servidor: NonNullable<
    Awaited<ReturnType<typeof listarMarcacoesDoUsuarioNoDia>>["servidor"]
  >,
  marcacoes: Awaited<
    ReturnType<typeof listarMarcacoesDoUsuarioNoDia>
  >["marcacoes"],
): PrevisaoJornadaDia | null {
  const vinculoJornada = servidor.jornadas[0];
  const fusoHorario = resolverFusoHorarioServidor(servidor);

  if (!vinculoJornada) {
    return null;
  }

  const diaSemana = diaSemanaLocal(new Date(), fusoHorario);
  const jornada = vinculoJornada.jornada;
  const escalaDia = vinculoJornada.escala?.dias.find(
    (dia) => dia.diaSemana === diaSemana,
  );

  if (escalaDia && !escalaDia.trabalha) {
    return {
      titulo: "Hoje não há jornada prevista na escala",
      horarios: [],
      carga: "0h",
    };
  }

  const entradaPrevista =
    escalaDia?.horarioEntrada ?? jornada.horarioEntradaPadrao;
  const saidaPrevista = escalaDia?.horarioSaida ?? jornada.horarioSaidaPadrao;
  const intervaloInicio = escalaDia?.intervaloInicio ?? null;
  const intervaloFim = escalaDia?.intervaloFim ?? null;
  const cargaPrevista =
    escalaDia?.cargaPrevistaMinutos && escalaDia.cargaPrevistaMinutos > 0
      ? escalaDia.cargaPrevistaMinutos
      : jornada.cargaDiariaMinutos;
  const horarios: PrevisaoJornadaDia["horarios"] = [];

  if (entradaPrevista) {
    horarios.push({ rotulo: "Entrada prevista", horario: entradaPrevista });
  }

  if (jornada.exigeIntervalo && intervaloInicio) {
    horarios.push({
      rotulo: "Saída intervalo",
      horario: intervaloInicio,
    });
  }

  if (jornada.exigeIntervalo && intervaloFim) {
    horarios.push({
      rotulo: "Retorno intervalo",
      horario: intervaloFim,
    });
  }

  if (saidaPrevista) {
    horarios.push({ rotulo: "Saída prevista", horario: saidaPrevista });
  }

  const entradaRegistrada = marcacoes.find((item) => item.tipo === "ENTRADA");
  const saidaRegistrada = marcacoes.find((item) => item.tipo === "SAIDA");
  const saidaIntervalo = marcacoes.find(
    (item) => item.tipo === "SAIDA_INTERVALO",
  );
  const retornoIntervalo = marcacoes.find(
    (item) => item.tipo === "RETORNO_INTERVALO",
  );
  let indicativo: string | undefined;
  let saidaEstimada: string | undefined;
  let entradaReferencia: string | undefined;

  if (entradaRegistrada && !saidaRegistrada) {
    const entradaMinutos = minutosDoDiaLocal(
      entradaRegistrada.dataHora,
      fusoHorario,
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
    const saidaSugerida = formatarMinutosComoHora(
      entradaMinutos + cargaPrevista + minutosIntervaloParaSaida,
    );
    const entradaFormatada = formatarHoraMarcacao(
      entradaRegistrada.dataHora,
      fusoHorario,
    );

    saidaEstimada = saidaSugerida;
    entradaReferencia = entradaFormatada;
    indicativo = `Com entrada às ${entradaFormatada}, a saída estimada para cumprir ${minutosParaTexto(
      cargaPrevista,
    )} é ${saidaSugerida}.`;
  }

  return {
    titulo: jornada.nome,
    horarios,
    carga: minutosParaTexto(cargaPrevista),
    indicativo,
    saidaEstimada,
    entradaReferencia,
  };
}

async function buscarMarcacoesDashboard(usuarioId: string): Promise<{
  marcacoes: MarcacaoDia[];
  previsao: PrevisaoJornadaDia | null;
}> {
  const { servidor, marcacoes } = await listarMarcacoesDoUsuarioNoDia(usuarioId);

  if (!servidor) {
    return {
      marcacoes: [],
      previsao: null,
    };
  }

  const exigeIntervalo = servidor.jornadas[0]?.jornada.exigeIntervalo ?? true;
  const slots = exigeIntervalo ? SLOTS_COM_INTERVALO : SLOTS_SEM_INTERVALO;
  const fusoHorario = resolverFusoHorarioServidor(servidor);

  return {
    marcacoes: slots.map((tipo) => {
      const marcacao = marcacoes.find((item) => item.tipo === tipo);

      return {
        rotulo: obterRotuloTipoMarcacao(tipo),
        horario: marcacao
          ? formatarHoraMarcacao(marcacao.dataHora, fusoHorario)
          : "--:--",
        status: marcacao?.status === "VALIDA" ? "registrada" : "pendente",
      };
    }),
    previsao: montarPrevisaoJornadaDia(servidor, marcacoes),
  };
}

export async function DashboardServidor({
  usuarioId,
  nomeFallback,
  perfilAtivoCodigo,
  permissoesPerfil = [],
}: DashboardServidorProps) {
  const permissoesEfetivas = await filtrarPermissoesLiberadas(permissoesPerfil);
  const [
    servidor,
    contexto,
    totalNotificacoes,
    frequenciaMes,
    marcacoesDashboard,
    resumoDashboard,
  ] =
    await Promise.all([
      buscarNomeServidorPorUsuarioId(usuarioId),
      buscarContextoDashboardServidor(usuarioId),
      contarNotificacoesUsuario(usuarioId, {
        perfilAtivo: {
          codigo: perfilAtivoCodigo ?? "SERVIDOR",
          permissoes: permissoesPerfil,
        },
      }),
      buscarFrequenciaMesServidorPorUsuarioId(usuarioId),
      buscarMarcacoesDashboard(usuarioId),
      buscarResumoDashboardServidor(usuarioId),
    ]);
  const nome = nomeServidor(servidor) || nomeFallback;
  const primeiroNome = nome.trim().split(/\s+/)[0] || "Servidor";
  const bancoHorasLiberado = permissoesEfetivas.some((permissao) =>
    permissao.startsWith("banco-horas:"),
  );
  const metricas = bancoHorasLiberado
    ? resumoDashboard?.metricas
    : resumoDashboard?.metricas.filter(
        (metrica) => metrica.titulo !== "Banco de horas",
      );
  const alertas = bancoHorasLiberado
    ? resumoDashboard?.alertas
    : resumoDashboard?.alertas.filter(
        (alerta) => alerta.acao?.href !== "/banco-horas",
      );

  return (
    <DashboardServidorAtual
      primeiroNome={primeiroNome}
      cabecalho={contexto}
      totalNotificacoes={totalNotificacoes}
      frequenciaMes={frequenciaMes ?? undefined}
      perfilAtivoCodigo={perfilAtivoCodigo}
      permissoesPerfil={permissoesEfetivas}
      marcacoesDia={marcacoesDashboard.marcacoes}
      previsaoJornadaDia={marcacoesDashboard.previsao}
      metricas={metricas}
      alertas={alertas}
    />
  );
}
