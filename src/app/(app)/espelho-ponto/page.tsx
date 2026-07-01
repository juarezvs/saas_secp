import { CalendarDays, Download } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CompetenciaInput, SearchableSelect } from "@/components/ui";
import { redirect } from "next/navigation";
import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { RecalcularMesForm } from "@/modules/recalculo/presentation/components/recalcular-mes-form";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import {
  resolverFusoHorarioServidorNoBanco,
} from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import {
  buscarServidorComUsuarioPorUsuarioId,
  listarApuracoesDoServidorNoMes,
  listarMarcacoesDoServidorNoMes,
  listarServidoresParaEspelhoPonto,
} from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";
import { EspelhoPontoMensal } from "@/modules/apuracao/presentation/components/espelho-ponto-mensal";

type EspelhoPontoPageProps = {
  searchParams: Promise<{
    servidorId?: string;
    competencia?: string;
    anoReferencia?: string;
    mesReferencia?: string;
  }>;
};

type ServidorEspelho = Awaited<
  ReturnType<typeof listarServidoresParaEspelhoPonto>
>[number];

function normalizarCompetencia(params: {
  competencia?: string;
  anoReferencia?: string;
  mesReferencia?: string;
}) {
  const hoje = new Date();
  const matchCompetencia = params.competencia?.match(/^(\d{4})-(\d{2})$/);
  const anoCompetencia = matchCompetencia ? Number(matchCompetencia[1]) : null;
  const mesCompetencia = matchCompetencia ? Number(matchCompetencia[2]) : null;
  const anoParam = params.anoReferencia
    ? Number(params.anoReferencia)
    : null;
  const mesParam = params.mesReferencia
    ? Number(params.mesReferencia)
    : null;

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
        : mesParam && Number.isInteger(mesParam) && mesParam >= 1 && mesParam <= 12
          ? mesParam
          : hoje.getMonth() + 1,
  };
}

function competenciaParaInput(anoReferencia: number, mesReferencia: number) {
  return `${anoReferencia}-${String(mesReferencia).padStart(2, "0")}`;
}

function obterCompetenciaAtual(fusoHorario: string) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const ano = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;

  return `${ano}-${mes}`;
}

function paramsPossuemCompetencia(params: {
  competencia?: string;
  anoReferencia?: string;
  mesReferencia?: string;
}) {
  return Boolean(
    params.competencia || params.anoReferencia || params.mesReferencia,
  );
}

function servidorProprioParaLista(
  servidor: Awaited<ReturnType<typeof buscarServidorComUsuarioPorUsuarioId>>,
): ServidorEspelho[] {
  if (!servidor) {
    return [];
  }

  return [
    {
      ...servidor,
      lotacoes: [],
    },
  ];
}

function montarHrefExportacaoEspelho(params: {
  servidorId: string;
  anoReferencia: number;
  mesReferencia: number;
}) {
  const query = new URLSearchParams({
    ano: String(params.anoReferencia),
    mes: String(params.mesReferencia),
  });

  return `/api/relatorios/espelho/${params.servidorId}/pdf?${query.toString()}`;
}

function perfilAtivoEhChefia(params: {
  perfilAtivoCodigo?: string | null;
  permissoes: string[];
}) {
  const codigo = params.perfilAtivoCodigo?.toUpperCase() ?? "";

  if (
    ["CHEFIA", "GESTOR", "GESTOR_UNIDADE", "DELEGADO_CHEFIA"].includes(codigo)
  ) {
    return true;
  }

  if (
    ["ADMIN", "MASTER", "SUPORTE", "SUPORTE_TECNICO", "NUTEC"].includes(codigo)
  ) {
    return false;
  }

  return (
    params.permissoes.includes("homologacao:gerenciar:chefia") ||
    params.permissoes.includes("boletim-frequencia:gerar:chefia")
  );
}

export default async function EspelhoPontoPage({
  searchParams,
}: EspelhoPontoPageProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "espelho-ponto:visualizar:proprio",
    "apuracao:consultar:global",
  ]);

  const params = await searchParams;
  const { anoReferencia, mesReferencia } = normalizarCompetencia(params);

  const podeConsultarGlobal = usuarioPossuiPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    "apuracao:consultar:global",
  );
  const perfilChefiaAtivo = perfilAtivoEhChefia({
    perfilAtivoCodigo: permissao.perfilAtivoCodigo,
    permissoes: permissao.permissoes,
  });
  const podeConsultarTodosServidores =
    podeConsultarGlobal && !perfilChefiaAtivo;
  const podeRecalcular = usuarioPossuiPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    "apuracao:recalcular:global",
  );
  const perfilServidorAtivo =
    permissao.perfilAtivoCodigo?.toUpperCase() === "SERVIDOR";

  const servidores = podeConsultarTodosServidores
    ? await listarServidoresParaEspelhoPonto({
        anoReferencia,
        mesReferencia,
        escopo: "global",
      })
    : perfilChefiaAtivo && permissao.usuarioId
      ? await listarServidoresParaEspelhoPonto({
          usuarioId: permissao.usuarioId,
          anoReferencia,
          mesReferencia,
          escopo: "chefia",
        })
    : permissao.usuarioId
      ? servidorProprioParaLista(
          await buscarServidorComUsuarioPorUsuarioId(permissao.usuarioId),
        )
      : [];
  const podeSelecionarServidor =
    !perfilServidorAtivo && (podeConsultarTodosServidores || perfilChefiaAtivo);

  const servidorSelecionado =
    servidores.find((servidor) => servidor.id === params.servidorId) ??
    servidores[0] ??
    null;

  if (!paramsPossuemCompetencia(params)) {
    const fusoHorario = servidorSelecionado
      ? await resolverFusoHorarioServidorNoBanco({
          servidorId: servidorSelecionado.id,
        })
      : "America/Manaus";
    const query = new URLSearchParams({
      competencia: obterCompetenciaAtual(fusoHorario),
    });

    if (servidorSelecionado) {
      query.set("servidorId", servidorSelecionado.id);
    }

    redirect(`/espelho-ponto?${query.toString()}`);
  }

  const [apuracoes, marcacoes] = servidorSelecionado
    ? await Promise.all([
        listarApuracoesDoServidorNoMes({
          servidorId: servidorSelecionado.id,
          ano: anoReferencia,
          mes: mesReferencia,
        }),
        listarMarcacoesDoServidorNoMes({
          servidorId: servidorSelecionado.id,
          ano: anoReferencia,
          mes: mesReferencia,
        }),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Espelho de ponto" }]} />

      <PageHeader
        icon={CalendarDays}
        titulo="Espelho de ponto"
        descricao="Consulte marcações, jornada prevista, horas trabalhadas, créditos, débitos e inconsistências apuradas para a competência selecionada."
        artigo="Arts. 8, 16 e 17"
        regraTitulo="Conferência mensal da frequência"
        regraDescricao="O servidor pode consultar a própria frequência e o saldo; a chefia homologa mensalmente comparecimento, ausências, créditos, débitos e compensações."
      />

      {!perfilServidorAtivo && (
      <Card className="p-5">
        <form className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
          <div>
            <label
              htmlFor="servidorId"
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              Servidor
            </label>
            <SearchableSelect
              id="servidorId"
              name="servidorId"
              defaultValue={servidorSelecionado?.id ?? ""}
              disabled={!podeSelecionarServidor}
              className="mt-2"
              searchPlaceholder="Pesquisar por matrícula ou nome..."
              options={servidores.map((servidor) => ({
                value: servidor.id,
                label: `${servidor.matricula} — ${nomeServidor(servidor)}`,
              }))}
            />
          </div>

          <CompetenciaInput
            defaultValue={competenciaParaInput(anoReferencia, mesReferencia)}
          />

          <button
            type="submit"
            className="h-10 rounded-md border px-4 text-sm font-semibold hover:bg-[var(--muted)]"
          >
            Filtrar
          </button>
        </form>

        {podeRecalcular && servidorSelecionado && (
          <RecalcularMesForm
            servidorId={servidorSelecionado.id}
            anoReferencia={anoReferencia}
            mesReferencia={mesReferencia}
          />
        )}

        {servidorSelecionado && (
          <div className="mt-4 flex justify-end border-t pt-4">
            <a
              href={montarHrefExportacaoEspelho({
                servidorId: servidorSelecionado.id,
                anoReferencia,
                mesReferencia,
              })}
              className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-[var(--muted)]"
            >
              <Download className="size-4" aria-hidden="true" />
              Exportar PDF
            </a>
          </div>
        )}
      </Card>
      )}

      {servidorSelecionado ? (
        <EspelhoPontoMensal
          apuracoes={apuracoes}
          marcacoes={marcacoes}
          controles={
            perfilServidorAtivo ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
                <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <CompetenciaInput
                    defaultValue={competenciaParaInput(
                      anoReferencia,
                      mesReferencia,
                    )}
                  />

                  <button
                    type="submit"
                    className="h-10 rounded-md border px-4 text-sm font-semibold hover:bg-[var(--muted)]"
                  >
                    Filtrar
                  </button>
                </form>

                <a
                  href={montarHrefExportacaoEspelho({
                    servidorId: servidorSelecionado.id,
                    anoReferencia,
                    mesReferencia,
                  })}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-[var(--muted)]"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Exportar PDF
                </a>
              </div>
            ) : undefined
          }
        />
      ) : (
        <Card className="p-8 text-center text-sm text-[var(--muted-foreground)]">
          Nenhum servidor ativo foi encontrado para exibição do espelho.
        </Card>
      )}
    </div>
  );
}
