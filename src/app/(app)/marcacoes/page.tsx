import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Coffee,
  Download,
  Info,
  LogIn,
  LogOut,
  Monitor,
  MoreVertical,
  Plus,
  Search,
  Smartphone,
  TimerReset,
  type LucideIcon,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { PERMISSOES_ACESSO_REGISTRO_PONTO_SECP } from "@/modules/auth/domain/constants/perfis-sistema";
import { minutosParaTexto } from "@/modules/apuracao/application/services/calcular-tempo.service";
import { obterRotuloTipoMarcacao } from "@/modules/marcacoes/application/services/classificar-marcacao.service";
import {
  normalizarFusoHorario,
  obterDataReferencia,
  obterMinutosLocais,
} from "@/modules/marcacoes/application/services/data-marcacao.service";
import {
  buscarServidorPorUsuarioId,
  listarMarcacoesDoServidorNoDia,
} from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { resolverFusoHorarioServidor } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

type MarcacoesPageProps = {
  searchParams?: Promise<{
    data?: string;
    q?: string;
    tipo?: string;
    status?: string;
    origem?: string;
  }>;
};

type MarcacaoDoDia = Awaited<
  ReturnType<typeof listarMarcacoesDoServidorNoDia>
>[number];

type PrevisaoDia = {
  entrada: string | null;
  saida: string | null;
  intervaloInicio: string | null;
  intervaloFim: string | null;
  cargaMinutos: number;
  exigeIntervalo: boolean;
  saidaEstimada?: string | null;
};

const diaSemanaPrisma: Record<string, string> = {
  sun: "DOMINGO",
  mon: "SEGUNDA",
  tue: "TERCA",
  wed: "QUARTA",
  thu: "QUINTA",
  fri: "SEXTA",
  sat: "SABADO",
};

const origemRotulos: Record<string, string> = {
  WEB: "Web",
  WEB_AUTORIZADO: "Web",
  BIOMETRIA_FACIAL: "Reconhecimento facial",
  FACIAL_AUTORIZADO: "Reconhecimento facial",
  EQUIPAMENTO_BIOMETRICO: "Equipamento biometrico",
  TOTEM_FACIAL_SECP: "Totem facial",
  AFD: "AFD",
  IMPORTACAO_AFD: "AFD",
  MANUAL_ADMINISTRATIVO: "Manual",
  IMPORTACAO: "Importacao",
  MOBILE: "App",
};

const statusRotulos: Record<string, string> = {
  VALIDA: "Valida",
  PENDENTE: "Pendente",
  AJUSTADA: "Ajustada",
  CANCELADA: "Cancelada",
};

function parseDataReferencia(valor?: string) {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const [ano, mes, dia] = valor.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function dataInput(data: Date) {
  return data.toISOString().slice(0, 10);
}

function adicionarDias(data: Date, dias: number) {
  const nova = new Date(data);
  nova.setUTCDate(nova.getUTCDate() + dias);
  return nova;
}

function meioDiaDataReferencia(data: Date) {
  return new Date(
    Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate(), 12),
  );
}

function formatarData(data: Date, fusoHorario: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: fusoHorario,
  }).format(meioDiaDataReferencia(data));
}

function formatarHora(data: Date, fusoHorario?: string | null) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: normalizarFusoHorario(fusoHorario),
  }).format(data);
}

function horaParaMinutos(hora?: string | null) {
  if (!hora) return null;
  const [horas, minutos] = hora.split(":").map(Number);
  if (!Number.isInteger(horas) || !Number.isInteger(minutos)) return null;
  return horas * 60 + minutos;
}

function minutosParaHora(minutos: number) {
  const minutosDia = ((minutos % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutosDia / 60)).padStart(2, "0")}:${String(
    minutosDia % 60,
  ).padStart(2, "0")}`;
}

function minutosCurto(minutos: number) {
  const sinal = minutos < 0 ? "-" : "";
  const abs = Math.abs(minutos);
  const horas = Math.floor(abs / 60);
  const resto = abs % 60;
  if (horas && resto) return `${sinal}${horas}h ${resto}min`;
  if (horas) return `${sinal}${horas}h`;
  return `${sinal}${resto}min`;
}

function diaSemanaLocal(data: Date, fusoHorario: string) {
  const dia = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: fusoHorario,
  })
    .format(meioDiaDataReferencia(data))
    .toLowerCase();
  return diaSemanaPrisma[dia] ?? null;
}

function montarPrevisaoDia(
  servidor: NonNullable<Awaited<ReturnType<typeof buscarServidorPorUsuarioId>>>,
  marcacoes: MarcacaoDoDia[],
  dataReferencia: Date,
): PrevisaoDia {
  const vinculo = servidor.jornadas[0];
  const jornada = vinculo?.jornada;
  const fusoHorario = resolverFusoHorarioServidor(servidor);
  const escalaDia = vinculo?.escala?.dias.find(
    (dia) => dia.diaSemana === diaSemanaLocal(dataReferencia, fusoHorario),
  );
  const entrada = escalaDia?.horarioEntrada ?? jornada?.horarioEntradaPadrao ?? null;
  const saida = escalaDia?.horarioSaida ?? jornada?.horarioSaidaPadrao ?? null;
  const intervaloInicio = escalaDia?.intervaloInicio ?? null;
  const intervaloFim = escalaDia?.intervaloFim ?? null;
  const exigeIntervalo = jornada?.exigeIntervalo ?? true;
  const cargaMinutos =
    escalaDia?.cargaPrevistaMinutos && escalaDia.cargaPrevistaMinutos > 0
      ? escalaDia.cargaPrevistaMinutos
      : (jornada?.cargaDiariaMinutos ?? 0);
  const entradaRegistrada = marcacoes.find((item) => item.tipo === "ENTRADA");
  const saidaRegistrada = marcacoes.find((item) => item.tipo === "SAIDA");
  let saidaEstimada: string | null = null;

  if (entradaRegistrada && !saidaRegistrada && cargaMinutos > 0) {
    const entradaMinutos = obterMinutosLocais(
      entradaRegistrada.dataHora,
      fusoHorario,
    );
    const saidaIntervalo = marcacoes.find((item) => item.tipo === "SAIDA_INTERVALO");
    const retornoIntervalo = marcacoes.find(
      (item) => item.tipo === "RETORNO_INTERVALO",
    );
    const intervaloRegistrado =
      saidaIntervalo && retornoIntervalo
        ? obterMinutosLocais(retornoIntervalo.dataHora, fusoHorario) -
          obterMinutosLocais(saidaIntervalo.dataHora, fusoHorario)
        : null;
    const intervaloPrevisto =
      horaParaMinutos(intervaloFim) !== null &&
      horaParaMinutos(intervaloInicio) !== null
        ? horaParaMinutos(intervaloFim)! - horaParaMinutos(intervaloInicio)!
        : (jornada?.intervaloMinimoMinutos ?? 0);

    saidaEstimada = minutosParaHora(
      entradaMinutos +
        cargaMinutos +
        (exigeIntervalo ? Math.max(intervaloRegistrado ?? intervaloPrevisto, 0) : 0),
    );
  }

  return {
    entrada,
    saida,
    intervaloInicio,
    intervaloFim,
    cargaMinutos,
    exigeIntervalo,
    saidaEstimada,
  };
}

function calcularTempoTrabalhado(marcacoes: MarcacaoDoDia[], usarAgora: boolean) {
  const ordenadas = [...marcacoes]
    .filter((item) => item.status !== "CANCELADA")
    .sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime());
  let total = 0;

  for (let i = 0; i < ordenadas.length; i += 2) {
    const entrada = ordenadas[i];
    const saida = ordenadas[i + 1];
    const fim = saida?.dataHora ?? (usarAgora ? new Date() : null);
    if (entrada && fim) {
      total += Math.max(0, Math.floor((fim.getTime() - entrada.dataHora.getTime()) / 60000));
    }
  }

  return total;
}

function calcularIntervalo(marcacoes: MarcacaoDoDia[]) {
  const saidas = marcacoes.filter((item) => item.tipo === "SAIDA_INTERVALO");
  const retornos = marcacoes.filter((item) => item.tipo === "RETORNO_INTERVALO");
  return saidas.reduce((total, saida, index) => {
    const retorno = retornos[index];
    return retorno
      ? total + Math.max(0, Math.floor((retorno.dataHora.getTime() - saida.dataHora.getTime()) / 60000))
      : total;
  }, 0);
}

function obterOrigemRotulo(origem: string | null | undefined) {
  return origemRotulos[origem ?? ""] ?? origem ?? "Nao informada";
}

function origemIcone(origem: string | null | undefined): LucideIcon {
  if (origem === "MOBILE") return Smartphone;
  return Monitor;
}

function configurarStatus(status: string) {
  if (status === "VALIDA") {
    return { label: "Valida", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
  }
  if (status === "PENDENTE") {
    return { label: "Pendente", className: "bg-amber-50 text-amber-700", dot: "bg-amber-500" };
  }
  if (status === "AJUSTADA") {
    return { label: "Ajustada", className: "bg-violet-50 text-violet-700", dot: "bg-violet-500" };
  }
  return { label: statusRotulos[status] ?? status, className: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
}

function classificarMarcacaoVisual(params: {
  marcacao: MarcacaoDoDia;
  indice: number;
  total: number;
  previsao: PrevisaoDia;
  fusoHorario: string;
}) {
  const { marcacao, indice, total, previsao, fusoHorario } = params;
  const saidaPrevista = horaParaMinutos(previsao.saida);
  const minutos = obterMinutosLocais(marcacao.dataHora, fusoHorario);
  const antesDaSaidaPrevista =
    saidaPrevista !== null && minutos < saidaPrevista && indice < total - 1;
  const direcaoSaida = indice % 2 === 1;

  if (indice === 0 || marcacao.tipo === "ENTRADA") {
    return { label: "Entrada", subtitle: "Inicio da jornada", icon: LogIn, color: "emerald" };
  }
  if (marcacao.tipo === "SAIDA_INTERVALO") {
    return { label: "Saida para intervalo", subtitle: "Inicio do intervalo", icon: Coffee, color: "rose" };
  }
  if (marcacao.tipo === "RETORNO_INTERVALO") {
    return { label: "Retorno do intervalo", subtitle: "Fim do intervalo", icon: LogIn, color: "blue" };
  }
  if ((marcacao.tipo === "SAIDA" || direcaoSaida) && antesDaSaidaPrevista) {
    return { label: "Saida tecnica", subtitle: "Afastamento temporario", icon: LogOut, color: "rose" };
  }
  if (marcacao.tipo === "MANUAL" && !direcaoSaida) {
    return { label: "Retorno", subtitle: "Retorno de afastamento", icon: LogIn, color: "blue" };
  }
  if (marcacao.tipo === "SAIDA") {
    return { label: "Saida", subtitle: "Fim da jornada", icon: LogOut, color: "slate" };
  }
  return { label: obterRotuloTipoMarcacao(marcacao.tipo), subtitle: marcacao.observacao ?? "-", icon: Circle, color: "blue" };
}

function corMarcacao(color: string) {
  if (color === "emerald") return "bg-emerald-50 text-emerald-700";
  if (color === "rose") return "bg-rose-50 text-rose-600";
  if (color === "blue") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

function filtrarMarcacoes(params: {
  marcacoes: MarcacaoDoDia[];
  q?: string;
  tipo?: string;
  status?: string;
  origem?: string;
}) {
  const termo = params.q?.trim().toLowerCase();
  return params.marcacoes.filter((marcacao) => {
    const texto = [
      marcacao.tipo,
      obterRotuloTipoMarcacao(marcacao.tipo),
      marcacao.status,
      obterOrigemRotulo(marcacao.fonte),
      marcacao.observacao,
    ].join(" ").toLowerCase();
    return (
      (!termo || texto.includes(termo)) &&
      (!params.tipo || marcacao.tipo === params.tipo) &&
      (!params.status || marcacao.status === params.status) &&
      (!params.origem || marcacao.fonte === params.origem)
    );
  });
}

function opcoesUnicas(marcacoes: MarcacaoDoDia[], chave: "tipo" | "status" | "fonte") {
  return Array.from(new Set(marcacoes.map((item) => item[chave]).filter(Boolean))).sort();
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "blue",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "blue" | "green" | "amber";
}) {
  const iconClass =
    tone === "green"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-100 text-amber-700"
        : "bg-blue-100 text-blue-700";
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${iconClass}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-lg font-black text-blue-950">{value}</p>
      </div>
    </div>
  );
}

function TimelineJornada({
  previsao,
  trabalhado,
}: {
  previsao: PrevisaoDia;
  trabalhado: number;
}) {
  const entrada = horaParaMinutos(previsao.entrada) ?? 8 * 60;
  const saida = horaParaMinutos(previsao.saida) ?? entrada + Math.max(previsao.cargaMinutos, 1);
  const inicioIntervalo = horaParaMinutos(previsao.intervaloInicio);
  const fimIntervalo = horaParaMinutos(previsao.intervaloFim);
  const total = Math.max(saida - entrada, 1);
  const pct = previsao.cargaMinutos
    ? Math.min(100, Math.round((trabalhado / previsao.cargaMinutos) * 100))
    : 0;
  const antesIntervalo = inicioIntervalo ? Math.max(0, inicioIntervalo - entrada) : total;
  const intervalo = inicioIntervalo && fimIntervalo ? Math.max(0, fimIntervalo - inicioIntervalo) : 0;
  const depoisIntervalo = Math.max(0, total - antesIntervalo - intervalo);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-black text-blue-950">
          <CalendarDays className="size-4 text-blue-700" aria-hidden="true" />
          Linha do tempo da jornada de hoje ({minutosCurto(trabalhado)} de {minutosCurto(previsao.cargaMinutos)})
        </h2>
        <span className="text-xs font-black text-blue-700">{pct}% concluido</span>
      </div>
      <div className="mt-4 overflow-hidden rounded-full border border-slate-100 bg-slate-50">
        <div className="flex h-12 min-w-[42rem] text-center text-xs font-black">
          <div className="grid place-items-center bg-emerald-100 text-emerald-800" style={{ width: `${(antesIntervalo / total) * 100}%` }}>Trabalhando</div>
          {intervalo > 0 ? (
            <div className="grid place-items-center bg-rose-50 text-rose-600" style={{ width: `${(intervalo / total) * 100}%` }}>Intervalo</div>
          ) : null}
          {depoisIntervalo > 0 ? (
            <div className="grid place-items-center bg-emerald-100 text-emerald-800" style={{ width: `${(depoisIntervalo / total) * 100}%` }}>Trabalhando</div>
          ) : null}
          <div
            className="grid min-w-24 place-items-center text-slate-500"
            style={{ backgroundImage: "repeating-linear-gradient(135deg,#dbe4ef 0,#dbe4ef 2px,#f8fafc 2px,#f8fafc 6px)" }}
          >
            Aguardando
          </div>
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-bold text-slate-500">
        <span>{previsao.entrada ?? "--:--"}</span>
        {previsao.intervaloInicio ? <span>{previsao.intervaloInicio}</span> : null}
        {previsao.intervaloFim ? <span>{previsao.intervaloFim}</span> : null}
        <span>{previsao.saida ?? "--:--"}</span>
      </div>
    </section>
  );
}

function CsvDownloadLink({ marcacoes, data }: { marcacoes: MarcacaoDoDia[]; data: string }) {
  const csv = [
    "hora,tipo,status,origem,observacao",
    ...marcacoes.map((item) =>
      [
        item.dataHora.toISOString(),
        obterRotuloTipoMarcacao(item.tipo),
        statusRotulos[item.status] ?? item.status,
        obterOrigemRotulo(item.fonte),
        item.observacao ?? "",
      ]
        .map((valor) => `"${String(valor).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");

  return (
    <a
      href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
      download={`marcacoes-${data}.csv`}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-100 bg-white px-4 text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-50"
    >
      <Download className="size-4" aria-hidden="true" />
      Exportar
    </a>
  );
}

function ResumoMini({
  icon: Icon,
  label,
  value,
  tone = "blue",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "blue" | "green" | "amber" | "rose";
}) {
  const classes =
    tone === "green"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-100 text-amber-700"
        : tone === "rose"
          ? "bg-rose-100 text-rose-700"
          : "bg-blue-100 text-blue-700";
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <span className={`grid size-8 place-items-center rounded-full ${classes}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold text-slate-500">{label}</p>
          <p className="text-lg font-black text-blue-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default async function MarcacoesPage({ searchParams }: MarcacoesPageProps) {
  const [permissao, params] = await Promise.all([
    exigirUmaDasPermissoesOuRedirecionar([
      "marcacoes:consultar:proprio",
      "marcacoes:visualizar:proprio",
      "marcacoes:consultar:global",
      "marcacoes:registrar-web:proprio",
      "marcacoes:registrar-facial:proprio",
    ]),
    searchParams,
  ]);
  const usuarioId = permissao.usuarioId;

  if (!usuarioId) {
    return <main className="rounded-xl border bg-white p-8 text-sm text-slate-600">Nao foi possivel identificar o usuario da sessao.</main>;
  }

  const servidor = await buscarServidorPorUsuarioId(usuarioId);

  if (!servidor) {
    return <main className="rounded-xl border bg-white p-8 text-sm text-slate-600">Nenhum servidor ativo encontrado para este usuario.</main>;
  }

  const fusoHorario = resolverFusoHorarioServidor(servidor);
  const hoje = obterDataReferencia(new Date(), fusoHorario);
  const dataReferencia = parseDataReferencia(params?.data) ?? hoje;
  const inputData = dataInput(dataReferencia);
  const dataEhHoje = dataReferencia.getTime() === hoje.getTime();
  const podeRegistrarPonto = PERMISSOES_ACESSO_REGISTRO_PONTO_SECP.some(
    (permissaoRegistro) => permissao.permissoes.includes(permissaoRegistro),
  );
  const [marcacoes, apuracao] = await Promise.all([
    listarMarcacoesDoServidorNoDia({
      servidorId: servidor.id,
      dataHora: meioDiaDataReferencia(dataReferencia),
      fusoHorario,
      dataReferencia,
    }),
    prisma.apuracaoDiaria.findUnique({
      where: {
        servidorId_dataReferencia: {
          servidorId: servidor.id,
          dataReferencia,
        },
      },
      select: {
        minutosTrabalhados: true,
        minutosIntervalo: true,
        minutosCredito: true,
        minutosDebito: true,
        resultado: true,
      },
    }),
  ]);
  const previsao = montarPrevisaoDia(servidor, marcacoes, dataReferencia);
  const trabalhadoCalculado = calcularTempoTrabalhado(marcacoes, dataEhHoje);
  const trabalhado =
    dataEhHoje && marcacoes.length % 2 === 1
      ? trabalhadoCalculado
      : (apuracao?.minutosTrabalhados ?? trabalhadoCalculado);
  const intervalo = apuracao?.minutosIntervalo ?? calcularIntervalo(marcacoes);
  const saldoDia = (apuracao?.minutosCredito ?? 0) - (apuracao?.minutosDebito ?? 0);
  const pendentes = marcacoes.filter((item) => item.status === "PENDENTE").length;
  const inconsistencias =
    apuracao && !["REGULAR", "SEM_EXPEDIENTE", "RECESSO"].includes(apuracao.resultado)
      ? 1
      : 0;
  const origemMaisComum = Object.entries(
    marcacoes.reduce<Record<string, number>>((acc, item) => {
      acc[item.fonte] = (acc[item.fonte] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1])[0];
  const marcacoesFiltradas = filtrarMarcacoes({
    marcacoes,
    q: params?.q,
    tipo: params?.tipo,
    status: params?.status,
    origem: params?.origem,
  });
  const saidaPrevista =
    previsao.saidaEstimada ??
    previsao.saida ??
    (previsao.cargaMinutos
      ? minutosParaHora((horaParaMinutos(previsao.entrada) ?? 0) + previsao.cargaMinutos)
      : "--:--");
  const montarQueryData = (data: Date) => {
    const query = new URLSearchParams({ data: dataInput(data) });
    for (const chave of ["q", "tipo", "status", "origem"] as const) {
      const valor = params?.[chave];
      if (valor) query.set(chave, valor);
    }
    return query.toString();
  };

  return (
    <main className="space-y-3 text-slate-700">
      <Breadcrumb items={[{ label: "Marcações" }]} />
      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-t-4 border-blue-700 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700 shadow-sm">
              <Clock3 className="size-7" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-normal text-blue-950 md:text-3xl">Marcações do dia</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Consulte os registros de hoje e acompanhe sua jornada de trabalho.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-11 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <span className="grid w-12 place-items-center border-r bg-slate-50 text-blue-700">
                <CalendarDays className="size-4" aria-hidden="true" />
              </span>
              <span className="grid min-w-64 place-items-center px-4 text-sm font-black text-blue-950">{formatarData(dataReferencia, fusoHorario)}</span>
              <Link href={`/marcacoes?${montarQueryData(adicionarDias(dataReferencia, -1))}`} className="grid w-11 place-items-center border-l text-blue-700 hover:bg-blue-50" aria-label="Dia anterior">
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Link>
              <Link href={`/marcacoes?${montarQueryData(adicionarDias(dataReferencia, 1))}`} className="grid w-11 place-items-center border-l text-blue-700 hover:bg-blue-50" aria-label="Proximo dia">
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            {podeRegistrarPonto ? (
              <Link href="/marcacoes/registrar" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-black text-white shadow-sm hover:bg-blue-800">
                <Plus className="size-4" aria-hidden="true" />
                Nova marcação
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 border-t bg-slate-50/60 p-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard icon={Clock3} label="Entrada prevista" value={previsao.entrada ?? "--:--"} />
          <StatCard icon={Clock3} label="Saida prevista" value={previsao.saida ?? "--:--"} />
          <StatCard icon={CalendarDays} label="Jornada prevista" value={previsao.cargaMinutos ? minutosCurto(previsao.cargaMinutos) : "0h"} />
          <StatCard icon={TimerReset} label="Trabalhado ate agora" value={minutosCurto(trabalhado)} tone="green" />
          <StatCard icon={BarChart3} label="Saldo do dia" value={minutosParaTexto(saldoDia)} tone={saldoDia < 0 ? "amber" : "green"} />
          <StatCard icon={Clock3} label="Proxima marcação" value={`Saida as ${saidaPrevista}`} />
        </div>
      </section>

      <TimelineJornada previsao={previsao} trabalhado={trabalhado} />

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4">
            <h2 className="inline-flex items-center gap-2 text-base font-black text-blue-950">
              <CalendarDays className="size-4 text-blue-700" aria-hidden="true" />
              Registros do dia ({marcacoes.length} marcações)
            </h2>
            <form className="grid gap-2 lg:grid-cols-[minmax(12rem,1fr)_11rem_11rem_11rem_auto_auto]">
              <input type="hidden" name="data" value={inputData} />
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input name="q" defaultValue={params?.q ?? ""} placeholder="Pesquisar marcações..." className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
              </label>
              <select name="tipo" defaultValue={params?.tipo ?? ""} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-blue-950">
                <option value="">Todos os tipos</option>
                {opcoesUnicas(marcacoes, "tipo").map((tipo) => <option key={tipo} value={tipo}>{obterRotuloTipoMarcacao(tipo)}</option>)}
              </select>
              <select name="status" defaultValue={params?.status ?? ""} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-blue-950">
                <option value="">Todos os status</option>
                {opcoesUnicas(marcacoes, "status").map((status) => <option key={status} value={status}>{statusRotulos[status] ?? status}</option>)}
              </select>
              <select name="origem" defaultValue={params?.origem ?? ""} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-blue-950">
                <option value="">Todas as origens</option>
                {opcoesUnicas(marcacoes, "fonte").map((origem) => <option key={origem} value={origem}>{obterOrigemRotulo(origem)}</option>)}
              </select>
              <button className="h-10 rounded-lg bg-blue-700 px-4 text-sm font-black text-white hover:bg-blue-800">Filtrar</button>
              <CsvDownloadLink marcacoes={marcacoesFiltradas} data={inputData} />
            </form>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[58rem] divide-y divide-slate-100 p-4">
              {marcacoesFiltradas.map((marcacao, indice) => {
                const visual = classificarMarcacaoVisual({ marcacao, indice, total: marcacoes.length, previsao, fusoHorario });
                const Icon = visual.icon;
                const OrigemIcon = origemIcone(marcacao.fonte);
                const status = configurarStatus(marcacao.status);

                return (
                  <div key={marcacao.id} className="grid grid-cols-[2rem_4.5rem_minmax(11rem,1fr)_10rem_8rem_minmax(10rem,1fr)_2rem] items-center gap-3 py-2.5 text-sm">
                    <span className="grid size-7 place-items-center rounded-full bg-blue-50 text-xs font-black text-blue-700">{indice + 1}</span>
                    <span className="font-mono text-base font-black text-blue-950">{formatarHora(marcacao.dataHora, fusoHorario)}</span>
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${corMarcacao(visual.color)}`}><Icon className="size-5" aria-hidden="true" /></span>
                      <span className="min-w-0">
                        <span className="block truncate font-black text-blue-950">{visual.label}</span>
                        <span className="block truncate text-xs font-medium text-slate-500">{visual.subtitle}</span>
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500"><OrigemIcon className="size-4 text-blue-600" aria-hidden="true" />{obterOrigemRotulo(marcacao.fonte)}</span>
                    <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${status.className}`}><span className={`size-2 rounded-full ${status.dot}`} />{status.label}</span>
                    <span className="truncate text-xs font-medium text-slate-500">{marcacao.observacao || "-"}</span>
                    <button className="grid size-8 place-items-center rounded-lg text-blue-700 hover:bg-blue-50" aria-label="Opções da marcação"><MoreVertical className="size-4" aria-hidden="true" /></button>
                  </div>
                );
              })}

              {dataEhHoje && !marcacoes.some((item) => item.tipo === "SAIDA") ? (
                <div className="grid grid-cols-[2rem_4.5rem_minmax(11rem,1fr)_10rem_8rem_minmax(10rem,1fr)_2rem] items-center gap-3 py-2.5 text-sm opacity-85">
                  <span className="grid size-7 place-items-center rounded-full bg-blue-50 text-xs font-black text-blue-700">{marcacoesFiltradas.length + 1}</span>
                  <span className="font-mono text-base font-black text-blue-950">{saidaPrevista}</span>
                  <span className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><Clock3 className="size-5" aria-hidden="true" /></span><span><span className="block font-black text-blue-950">Saida (prevista)</span><span className="block text-xs font-medium text-slate-500">Fim da jornada</span></span></span>
                  <span className="text-slate-400">-</span>
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600"><span className="size-2 rounded-full bg-blue-400" />Aguardando</span>
                  <span className="truncate text-xs font-medium text-slate-500">Proxima marcação esperada.</span>
                  <span />
                </div>
              ) : null}

              {marcacoesFiltradas.length === 0 &&
              !(dataEhHoje && !marcacoes.some((item) => item.tipo === "SAIDA")) ? (
                <div className="py-10 text-center text-sm font-medium text-slate-500">Nenhuma marcação encontrada para os filtros selecionados.</div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-sm font-black text-blue-950"><Clock3 className="size-4 text-blue-700" aria-hidden="true" />Resumo do dia</h2>
              <Link href="/espelho-ponto" className="text-xs font-black text-blue-700">Ver detalhes</Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ResumoMini icon={BarChart3} label="Total de marcações" value={String(marcacoes.length)} />
              <ResumoMini icon={TimerReset} label="Horas trabalhadas" value={minutosCurto(trabalhado)} tone="green" />
              <ResumoMini icon={Coffee} label="Horas de intervalo" value={minutosCurto(intervalo)} tone="amber" />
              <ResumoMini icon={BarChart3} label="Saldo do dia" value={minutosParaTexto(saldoDia)} tone="green" />
              <ResumoMini icon={AlertTriangle} label="Marcações pendentes" value={String(pendentes)} tone="rose" />
              <ResumoMini icon={AlertTriangle} label="Inconsistências" value={String(inconsistencias)} tone="rose" />
            </div>
            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">Origem predominante</p>
              <p className="mt-1 text-lg font-black text-blue-950">{origemMaisComum ? obterOrigemRotulo(origemMaisComum[0]) : "-"}</p>
              <p className="text-xs font-semibold text-slate-500">{origemMaisComum ? `${origemMaisComum[1]} marcação(ões)` : "Sem registros"}</p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-sm font-black text-blue-950"><CheckCircle2 className="size-4 text-blue-700" aria-hidden="true" />Próximas ações</h2>
            <div className="mt-3 space-y-2 text-xs font-semibold text-slate-600">
              <p className="flex gap-2"><span className="mt-1 size-2 rounded-full bg-emerald-500" />Status da jornada: {marcacoes.length % 2 === 1 && dataEhHoje ? "Em andamento" : marcacoes.length ? "Encerrada" : "Sem registros"}.</p>
              <p className="flex gap-2"><span className="mt-1 size-2 rounded-full bg-blue-500" />Próxima marcação esperada: saída às {saidaPrevista}.</p>
              {pendentes ? <p className="flex gap-2"><span className="mt-1 size-2 rounded-full bg-amber-500" />Há {pendentes} marcação(ões) pendente(s) de validação.</p> : null}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-sm font-black text-blue-950"><Info className="size-4 text-blue-700" aria-hidden="true" />Orientações</h2>
            <p className="mt-2 text-xs font-medium leading-5 text-slate-500">Mantenha suas marcações em dia. Em caso de inconsistências, entre em contato com a Seção de Gestão de Pessoas.</p>
          </section>
        </aside>
      </section>
    </main>
  );
}
