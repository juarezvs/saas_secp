import {
  CircleHelp,
  Clock3,
  LogIn,
  LogOut,
  Utensils,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { obterRotuloTipoMarcacao } from "../../application/services/classificar-marcacao.service";
import { normalizarFusoHorario } from "../../application/services/data-marcacao.service";
import { OrigemMarcacaoIcon } from "./origem-marcacao-icon";

export type MarcacaoStepperItem = {
  id: string;
  dataHora: Date;
  tipo: string;
  fonte: string;
  status: string;
  observacao?: string | null;
  fusoHorario?: string | null;
  evidenciaFacialUrl?: string | null;
};

type MarcacaoEtapaConfig = {
  tipo: string;
  titulo: string;
  subtitulo: string;
  icon: LucideIcon;
  className: string;
};

const etapasOrdinarias: MarcacaoEtapaConfig[] = [
  {
    tipo: "ENTRADA",
    titulo: "Entrada",
    subtitulo: "Início da jornada",
    icon: LogIn,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  },
  {
    tipo: "SAIDA_INTERVALO",
    titulo: "Saída intervalo",
    subtitulo: "Pausa intrajornada",
    icon: Utensils,
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  {
    tipo: "RETORNO_INTERVALO",
    titulo: "Retorno intervalo",
    subtitulo: "Retomada da jornada",
    icon: UtensilsCrossed,
    className:
      "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-200",
  },
  {
    tipo: "SAIDA",
    titulo: "Saída",
    subtitulo: "Encerramento",
    icon: LogOut,
    className:
      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
  },
];

const etapasSemIntervalo: MarcacaoEtapaConfig[] = [
  etapasOrdinarias[0],
  {
    ...etapasOrdinarias[3],
    subtitulo: "Encerramento da jornada",
  },
];

const tiposExtras: Record<string, { icon: LucideIcon; className: string }> = {
  MANUAL: {
    icon: Wrench,
    className:
      "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200",
  },
  AJUSTE: {
    icon: Wrench,
    className:
      "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200",
  },
};

const classesEstado = {
  registrada: "border-current/25 bg-white/70 shadow-sm dark:bg-black/15",
  pendente:
    "border-dashed border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
  invalida:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
};

function formatarHoraMarcacao(data: Date, fusoHorario?: string | null) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: normalizarFusoHorario(fusoHorario),
  }).format(data);
}

function statusEhRegistrado(status: string) {
  return !["INVALIDA", "DESCONSIDERADA"].includes(status);
}

function EvidenciaFacialMiniatura({
  marcacao,
}: {
  marcacao: MarcacaoStepperItem;
}) {
  if (!marcacao.evidenciaFacialUrl) {
    return null;
  }

  return (
    <img
      src={marcacao.evidenciaFacialUrl}
      alt="Evidência facial da marcação"
      loading="lazy"
      className="size-8 rounded-full border border-current/20 object-cover"
    />
  );
}

function ordenarMarcacoes(marcacoes: MarcacaoStepperItem[]) {
  return [...marcacoes].sort(
    (a, b) => a.dataHora.getTime() - b.dataHora.getTime(),
  );
}

function primeiraMarcacaoPorTipo(
  marcacoes: MarcacaoStepperItem[],
  tipo: string,
) {
  return ordenarMarcacoes(marcacoes).find(
    (marcacao) => marcacao.tipo === tipo && statusEhRegistrado(marcacao.status),
  );
}

export function MarcacoesStepper({
  marcacoes,
  vazioTexto = "Nenhuma marcação registrada.",
  variante = "cards",
  exigeIntervalo = true,
}: {
  marcacoes: MarcacaoStepperItem[];
  vazioTexto?: string;
  variante?: "cards" | "minimalista";
  exigeIntervalo?: boolean;
}) {
  const etapas = exigeIntervalo ? etapasOrdinarias : etapasSemIntervalo;
  const extras = ordenarMarcacoes(marcacoes).filter(
    (marcacao) => !etapas.some((etapa) => etapa.tipo === marcacao.tipo),
  );

  if (marcacoes.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        {vazioTexto}
      </div>
    );
  }

  if (variante === "minimalista") {
    return (
      <MarcacoesStepperMinimalista
        marcacoes={marcacoes}
        extras={extras}
        etapas={etapas}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-1">
        <ol
          className={`grid gap-0 ${
            exigeIntervalo
              ? "min-w-[58rem] grid-cols-4"
              : "min-w-[28rem] grid-cols-2"
          }`}
        >
          {etapas.map((etapa, indice) => {
            const marcacao = primeiraMarcacaoPorTipo(marcacoes, etapa.tipo);

            return (
              <MarcacaoStepperEtapa
                key={etapa.tipo}
                etapa={etapa}
                marcacao={marcacao}
                indice={indice}
                total={etapas.length}
              />
            );
          })}
        </ol>
      </div>

      {extras.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {extras.map((marcacao) => (
            <MarcacaoExtra key={marcacao.id} marcacao={marcacao} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MarcacoesStepperMinimalista({
  marcacoes,
  extras,
  etapas,
}: {
  marcacoes: MarcacaoStepperItem[];
  extras: MarcacaoStepperItem[];
  etapas: MarcacaoEtapaConfig[];
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-2">
        <ol
          className={`grid ${
            etapas.length === 4
              ? "min-w-[42rem] grid-cols-4"
              : "min-w-[22rem] grid-cols-2"
          }`}
        >
          {etapas.map((etapa, indice) => {
            const marcacao = primeiraMarcacaoPorTipo(marcacoes, etapa.tipo);

            return (
              <MarcacaoStepperEtapaMinimalista
                key={etapa.tipo}
                etapa={etapa}
                marcacao={marcacao}
                indice={indice}
                total={etapas.length}
              />
            );
          })}
        </ol>
      </div>

      {extras.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {extras.map((marcacao) => (
            <MarcacaoExtra key={marcacao.id} marcacao={marcacao} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MarcacaoStepperEtapaMinimalista({
  etapa,
  marcacao,
  indice,
  total,
}: {
  etapa: MarcacaoEtapaConfig;
  marcacao?: MarcacaoStepperItem;
  indice: number;
  total: number;
}) {
  const Icon = etapa.icon;
  const registrada = marcacao && statusEhRegistrado(marcacao.status);
  const invalida = marcacao && !statusEhRegistrado(marcacao.status);
  const estadoClasse = invalida
    ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
    : registrada
      ? etapa.className
      : "border-slate-300 bg-[var(--card)] text-slate-500 dark:border-slate-700 dark:text-slate-400";

  return (
    <li className="relative px-2 text-center">
      {indice < total - 1 ? (
        <div className="absolute left-1/2 right-[-50%] top-5 h-px bg-border" />
      ) : null}

      <div className="relative z-10 mx-auto flex size-10 items-center justify-center rounded-full border bg-[var(--card)] shadow-sm">
        <span
          className={`flex size-8 items-center justify-center rounded-full border ${estadoClasse}`}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>

      <div className="mx-auto mt-2 max-w-[10rem]">
        <p className="truncate text-xs font-bold text-foreground">
          {etapa.titulo}
        </p>
        <p className="mt-0.5 font-mono text-sm font-black tracking-normal">
          {marcacao
            ? formatarHoraMarcacao(marcacao.dataHora, marcacao.fusoHorario)
            : "--:--"}
        </p>
        <div className="mt-1 flex items-center justify-center gap-2">
          {marcacao ? (
            <>
              <OrigemMarcacaoIcon origem={marcacao.fonte} compacta />
              <EvidenciaFacialMiniatura marcacao={marcacao} />
            </>
          ) : (
            <span className="text-[11px] font-semibold text-muted-foreground">
              Aguardando
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function MarcacaoStepperEtapa({
  etapa,
  marcacao,
  indice,
  total,
}: {
  etapa: MarcacaoEtapaConfig;
  marcacao?: MarcacaoStepperItem;
  indice: number;
  total: number;
}) {
  const Icon = etapa.icon;
  const invalida = marcacao && !statusEhRegistrado(marcacao.status);
  const className = marcacao
    ? invalida
      ? classesEstado.invalida
      : `${etapa.className} ${classesEstado.registrada}`
    : classesEstado.pendente;

  return (
    <li className="relative px-2 first:pl-0 last:pr-0">
      {indice < total - 1 ? (
        <div className="absolute left-[calc(50%+2.25rem)] right-0 top-8 h-px bg-border" />
      ) : null}

      <div className={`relative rounded-lg border p-3 ${className}`}>
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-current/20 bg-white/70 dark:bg-black/20">
            <Icon className="size-5" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide">
              Etapa {indice + 1}
            </p>
            <h3 className="mt-1 text-sm font-black">{etapa.titulo}</h3>
            <p className="mt-0.5 text-xs opacity-80">{etapa.subtitulo}</p>

            {marcacao ? (
              <div className="mt-3 space-y-2">
                <p className="font-mono text-2xl font-black leading-none tracking-normal">
                  {formatarHoraMarcacao(
                    marcacao.dataHora,
                    marcacao.fusoHorario,
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <OrigemMarcacaoIcon origem={marcacao.fonte} compacta />
                  <EvidenciaFacialMiniatura marcacao={marcacao} />
                  <span className="rounded-full border border-current/20 bg-white/55 px-2 py-0.5 text-[11px] font-bold dark:bg-black/15">
                    {marcacao.status}
                  </span>
                </div>
                {marcacao.observacao ? (
                  <p className="line-clamp-2 text-xs opacity-85">
                    {marcacao.observacao}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold">
                <Clock3 className="size-4" aria-hidden="true" />
                Aguardando registro
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function MarcacaoExtra({ marcacao }: { marcacao: MarcacaoStepperItem }) {
  const config = tiposExtras[marcacao.tipo] ?? {
    icon: CircleHelp,
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  };
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${config.className}`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {obterRotuloTipoMarcacao(marcacao.tipo)}
      <span className="font-mono">
        {formatarHoraMarcacao(marcacao.dataHora, marcacao.fusoHorario)}
      </span>
      <OrigemMarcacaoIcon origem={marcacao.fonte} compacta />
      <EvidenciaFacialMiniatura marcacao={marcacao} />
    </span>
  );
}
