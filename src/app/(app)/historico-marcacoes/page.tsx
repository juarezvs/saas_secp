import { Clock3 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui";
import { EspelhoPontoFiltrosAuto } from "@/modules/apuracao/presentation/components/espelho-ponto-filtros-auto";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { exigeIntervaloDaApuracao } from "@/modules/marcacoes/application/services/exige-intervalo-marcacao.service";
import { listarHistoricoMarcacoesDoUsuario } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { MarcacoesStepper } from "@/modules/marcacoes/presentation/components/marcacoes-stepper";

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
    : { servidor: null, marcacoes: [], apuracoes: [] };
  const grupos = agruparPorDataReferencia(resultado.marcacoes);
  const exigeIntervaloPorData = new Map(
    (resultado.apuracoes ?? []).map((apuracao) => [
      chaveDataReferencia(apuracao.dataReferencia),
      exigeIntervaloDaApuracao(apuracao.metadados),
    ]),
  );
  const totalMarcacoes = resultado.marcacoes.length;

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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">
              Linha do tempo da competência
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalMarcacoes} marcação{totalMarcacoes === 1 ? "" : "ões"} em{" "}
              {grupos.length} dia{grupos.length === 1 ? "" : "s"}.
            </p>
          </div>
          <EspelhoPontoFiltrosAuto
            competencia={competenciaInput}
            className="w-full sm:w-64"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {grupos.length > 0 ? (
          <div className="divide-y divide-border">
            {grupos.map((grupo) => (
              <section
                key={chaveDataReferencia(grupo.dataReferencia)}
                className="grid gap-5 p-5 xl:grid-cols-[14rem_minmax(0,1fr)]"
              >
                <div className="rounded-lg border bg-[var(--muted)]/25 p-4">
                  <p className="text-base font-black text-foreground">
                    {formatarDataReferencia(grupo.dataReferencia)}
                  </p>
                  <p className="mt-1 text-sm capitalize text-muted-foreground">
                    {formatarDiaSemana(grupo.dataReferencia)}
                  </p>
                  <p className="mt-4 w-fit rounded-full border bg-[var(--card)] px-2.5 py-1 text-xs font-bold text-muted-foreground">
                    {grupo.marcacoes.length} marcação
                    {grupo.marcacoes.length === 1 ? "" : "ões"}
                  </p>
                </div>

                <MarcacoesStepper
                  marcacoes={grupo.marcacoes.map((marcacao) => ({
                    ...marcacao,
                    evidenciaFacialUrl: marcacao.evidenciaFacial
                      ? `/api/marcacoes/${marcacao.id}/evidencia-facial`
                      : null,
                  }))}
                  variante="minimalista"
                  exigeIntervalo={
                    exigeIntervaloPorData.get(
                      chaveDataReferencia(grupo.dataReferencia),
                    ) ?? true
                  }
                />
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
