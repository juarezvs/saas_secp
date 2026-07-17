import {
  CircleHelp,
  Clock3,
  LogIn,
  LogOut,
  Utensils,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui";
import { EspelhoPontoFiltrosAuto } from "@/modules/apuracao/presentation/components/espelho-ponto-filtros-auto";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { obterRotuloTipoMarcacao } from "@/modules/marcacoes/application/services/classificar-marcacao.service";
import { normalizarFusoHorario } from "@/modules/marcacoes/application/services/data-marcacao.service";
import { listarHistoricoMarcacoesDoUsuario } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { OrigemMarcacaoIcon } from "@/modules/marcacoes/presentation/components/origem-marcacao-icon";

type HistoricoMarcacoesPageProps = {
  searchParams?: Promise<{
    competencia?: string;
    anoReferencia?: string;
    mesReferencia?: string;
  }>;
};

type HistoricoMarcacao = Awaited<
  ReturnType<typeof listarHistoricoMarcacoesDoUsuario>
>["marcacoes"][number];

type TipoMarcacaoVisual = {
  label: string;
  icon: LucideIcon;
  className: string;
};

const tiposMarcacaoVisual: Record<string, TipoMarcacaoVisual> = {
  ENTRADA: {
    label: "Entrada",
    icon: LogIn,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  },
  SAIDA_INTERVALO: {
    label: "Saída para intervalo",
    icon: Utensils,
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  RETORNO_INTERVALO: {
    label: "Retorno do intervalo",
    icon: UtensilsCrossed,
    className:
      "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-200",
  },
  SAIDA: {
    label: "Saída",
    icon: LogOut,
    className:
      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
  },
};

const statusMarcacaoVisual: Record<string, { label: string; className: string }> = {
  VALIDA: {
    label: "Válida",
    className: "text-emerald-700 dark:text-emerald-300",
  },
  PENDENTE: {
    label: "Pendente",
    className: "text-amber-700 dark:text-amber-300",
  },
  INVALIDA: {
    label: "Inválida",
    className: "text-red-700 dark:text-red-300",
  },
  DESCONSIDERADA: {
    label: "Desconsiderada",
    className: "text-slate-500 dark:text-slate-400",
  },
};

function normalizarCompetencia(params: {
  competencia?: string;
  anoReferencia?: string;
  mesReferencia?: string;
}) {
  const hoje = new Date();
  const matchCompetencia = params.competencia?.match(/^(\d{4})-(\d{2})$/);
  const anoCompetencia = matchCompetencia ? Number(matchCompetencia[1]) : null;
  const mesCompetencia = matchCompetencia ? Number(matchCompetencia[2]) : null;
  const anoParam = params.anoReferencia ? Number(params.anoReferencia) : null;
  const mesParam = params.mesReferencia ? Number(params.mesReferencia) : null;

  return {
    anoReferencia:
      anoCompetencia && Number.isInteger(anoCompetencia)
        ? anoCompetencia
        : anoParam && Number.isInteger(anoParam)
          ? anoParam
          : hoje.getFullYear(),
    mesReferencia:
      mesCompetencia &&
      Number.isInteger(mesCompetencia) &&
      mesCompetencia >= 1 &&
      mesCompetencia <= 12
        ? mesCompetencia
        : mesParam &&
            Number.isInteger(mesParam) &&
            mesParam >= 1 &&
            mesParam <= 12
          ? mesParam
          : hoje.getMonth() + 1,
  };
}

function competenciaParaInput(anoReferencia: number, mesReferencia: number) {
  return `${anoReferencia}-${String(mesReferencia).padStart(2, "0")}`;
}

function chaveDataReferencia(data: Date) {
  return data.toISOString().slice(0, 10);
}

function formatarDataReferencia(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);
}

function formatarDiaSemana(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(data);
}

function formatarHoraMarcacao(data: Date, fusoHorario?: string | null) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: normalizarFusoHorario(fusoHorario),
  }).format(data);
}

function agruparPorDataReferencia(marcacoes: HistoricoMarcacao[]) {
  const grupos = new Map<
    string,
    { dataReferencia: Date; marcacoes: HistoricoMarcacao[] }
  >();

  for (const marcacao of marcacoes) {
    const chave = chaveDataReferencia(marcacao.dataReferencia);
    const grupo =
      grupos.get(chave) ??
      ({
        dataReferencia: marcacao.dataReferencia,
        marcacoes: [],
      } satisfies { dataReferencia: Date; marcacoes: HistoricoMarcacao[] });

    grupo.marcacoes.push(marcacao);
    grupos.set(chave, grupo);
  }

  return Array.from(grupos.values())
    .map((grupo) => ({
      ...grupo,
      marcacoes: grupo.marcacoes.sort(
        (a, b) => a.dataHora.getTime() - b.dataHora.getTime(),
      ),
    }))
    .sort((a, b) => b.dataReferencia.getTime() - a.dataReferencia.getTime());
}

function obterVisualTipoMarcacao(tipo: string): TipoMarcacaoVisual {
  return (
    tiposMarcacaoVisual[tipo] ?? {
      label: obterRotuloTipoMarcacao(tipo),
      icon: CircleHelp,
      className:
        "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
    }
  );
}

function obterVisualStatusMarcacao(status: string) {
  return (
    statusMarcacaoVisual[status] ?? {
      label: status,
      className: "text-muted-foreground",
    }
  );
}

export default async function HistoricoMarcacoesPage({
  searchParams,
}: HistoricoMarcacoesPageProps) {
  const [permissao, params] = await Promise.all([
    exigirUmaDasPermissoesOuRedirecionar([
      "marcacoes:consultar:proprio",
      "marcacoes:visualizar:proprio",
    ]),
    searchParams,
  ]);
  const { anoReferencia, mesReferencia } = normalizarCompetencia(params ?? {});
  const competenciaInput = competenciaParaInput(anoReferencia, mesReferencia);
  const resultado = permissao.usuarioId
    ? await listarHistoricoMarcacoesDoUsuario({
        usuarioId: permissao.usuarioId,
        anoReferencia,
        mesReferencia,
      })
    : { servidor: null, marcacoes: [] };
  const grupos = agruparPorDataReferencia(resultado.marcacoes);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Histórico de marcações" }]} />

      <PageHeader
        icon={Clock3}
        titulo="Histórico de marcações"
        descricao="Consulte seus registros do mês atual ou selecione outra competência."
        artigo="Art. 6"
        regraTitulo="Histórico individual"
        regraDescricao="O histórico exibe marcações válidas ou pendentes da competência selecionada."
      />

      <Card className="p-5">
        <EspelhoPontoFiltrosAuto
          competencia={competenciaInput}
          className="w-full sm:w-64"
        />
      </Card>

      <Card className="overflow-hidden">
        {grupos.length > 0 ? (
          <div className="divide-y divide-border">
            {grupos.map((grupo) => (
              <section
                key={chaveDataReferencia(grupo.dataReferencia)}
                className="grid gap-4 p-5 lg:grid-cols-[13rem_1fr]"
              >
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {formatarDataReferencia(grupo.dataReferencia)}
                  </p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {formatarDiaSemana(grupo.dataReferencia)}
                  </p>
                  <p className="mt-3 text-xs font-medium text-muted-foreground">
                    {grupo.marcacoes.length} marcação(ões)
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
                  {grupo.marcacoes.map((marcacao) => {
                    const tipo = obterVisualTipoMarcacao(marcacao.tipo);
                    const status = obterVisualStatusMarcacao(marcacao.status);
                    const TipoIcon = tipo.icon;

                    return (
                      <article
                        key={marcacao.id}
                        className={`rounded-md border px-3 py-2 shadow-sm ${tipo.className}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-current/20 bg-white/55 dark:bg-black/15">
                                <TipoIcon className="size-4" aria-hidden="true" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-bold leading-tight">
                                  {tipo.label}
                                </p>
                                <p className="font-mono text-lg font-black leading-tight tracking-normal">
                                  {formatarHoraMarcacao(
                                    marcacao.dataHora,
                                    marcacao.fusoHorario,
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                          <OrigemMarcacaoIcon
                            origem={marcacao.fonte}
                            compacta
                          />
                        </div>

                        <p
                          className={`mt-2 text-[11px] font-semibold leading-tight ${status.className}`}
                        >
                          {status.label}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Nenhuma marcação encontrada na competência selecionada.
          </div>
        )}
      </Card>
    </div>
  );
}
