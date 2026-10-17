import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Coffee,
  Info,
  LogIn,
  LogOut,
  TimerReset,
  type LucideIcon,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { DataTableShell, DataTableToolbar, StandardDataTable } from "@/components/listagens";
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
import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";

type MarcacoesPageProps = {
  searchParams?: Promise<{
    data?: string;
    q?: string;
    tipo?: string;
    status?: string;
    origem?: string;
    pagina?: string;
    itensPorPagina?: string;
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

function hrefExportacaoCsv(marcacoes: MarcacaoDoDia[]) {
  const csv = [
    "hora,tipo,status,origem,observacao",
    ...marcacoes.map((item) =>
      [item.dataHora.toISOString(), obterRotuloTipoMarcacao(item.tipo), statusRotulos[item.status] ?? item.status, obterOrigemRotulo(item.fonte), item.observacao ?? ""]
        .map((valor) => `"${String(valor).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
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
    return <main className="rounded-xl border bg-white p-8 text-sm text-slate-600">Não foi possível identificar o usuário da sessão.</main>;
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
    prismaListagem.apuracaoDiaria.findUnique({
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
  const itensPorPagina = Math.max(1, Number(params?.itensPorPagina ?? 10));
  const totalPaginas = Math.max(1, Math.ceil(marcacoesFiltradas.length / itensPorPagina));
  const pagina = Math.min(Math.max(1, Number(params?.pagina ?? 1)), totalPaginas);
  const marcacoesPagina = marcacoesFiltradas.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);
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
  const montarHrefPagina = (novaPagina: number) => {
    const query = new URLSearchParams(montarQueryData(dataReferencia));
    query.set("pagina", String(novaPagina));
    query.set("itensPorPagina", String(itensPorPagina));
    return `/marcacoes?${query.toString()}`;
  };

  return (
    <main className="space-y-3 text-slate-700">
      <PageHeader icon={Clock3} titulo="Marcações do dia" contexto={<Breadcrumb embedded items={[{ label: "Marcações" }]} />} variant="blade" />
      <section className="overflow-hidden border border-[var(--border)] bg-[var(--card)]">
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
        <DataTableShell title="Registros do dia" total={marcacoesFiltradas.length} pagina={pagina} totalPaginas={totalPaginas} itensPorPagina={itensPorPagina} montarHrefPagina={montarHrefPagina} toolbar={<DataTableToolbar novoHref={podeRegistrarPonto ? "/marcacoes/registrar" : undefined} novoLabel="Nova marcacao" filtros={[
          { nome: "data", label: "Data", tipo: "data", defaultValue: inputData },
          { nome: "q", label: "Pesquisa", tipo: "texto", placeholder: "Tipo, origem ou observacao" },
          { nome: "tipo", label: "Tipo", tipo: "select", options: [{ value: "", label: "Todos" }, ...opcoesUnicas(marcacoes, "tipo").map((tipo) => ({ value: tipo, label: obterRotuloTipoMarcacao(tipo) }))] },
          { nome: "status", label: "Status", tipo: "select", options: [{ value: "", label: "Todos" }, ...opcoesUnicas(marcacoes, "status").map((status) => ({ value: status, label: statusRotulos[status] ?? status }))] },
          { nome: "origem", label: "Origem", tipo: "select", options: [{ value: "", label: "Todas" }, ...opcoesUnicas(marcacoes, "fonte").map((origem) => ({ value: origem, label: obterOrigemRotulo(origem) }))] },
        ]} acoes={[{ href: `/marcacoes?${montarQueryData(adicionarDias(dataReferencia, -1))}`, label: "Dia anterior" }, { href: `/marcacoes?${montarQueryData(adicionarDias(dataReferencia, 1))}`, label: "Próximo dia" }, { href: hrefExportacaoCsv(marcacoesFiltradas), label: "Exportar lista" }]} />}>
          <StandardDataTable columns={[{ key: "hora", label: "Hora" }, { key: "tipo", label: "Tipo" }, { key: "origem", label: "Origem" }, { key: "status", label: "Status" }, { key: "observacao", label: "Observacao" }]} rows={marcacoesPagina.map((marcacao, indice) => { const visual = classificarMarcacaoVisual({ marcacao, indice, total: marcacoes.length, previsao, fusoHorario }); return { id: marcacao.id, label: visual.label, cells: { hora: { value: formatarHora(marcacao.dataHora, fusoHorario) }, tipo: { value: visual.label, detail: visual.subtitle }, origem: { value: obterOrigemRotulo(marcacao.fonte) }, status: { value: statusRotulos[marcacao.status] ?? marcacao.status, tone: marcacao.status === "VALIDA" ? "success" : marcacao.status === "CANCELADA" ? "danger" : "muted" }, observacao: { value: marcacao.observacao || "-" } } }; })} emptyMessage="Nenhuma marcacao encontrada para os filtros selecionados." minWidth={820} />
        </DataTableShell>

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
