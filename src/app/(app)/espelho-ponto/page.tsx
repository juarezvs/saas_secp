import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  MoreVertical,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Card } from "@/components/ui";
import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { perfilAtivoEhChefia } from "@/modules/auth/application/services/perfil-chefia.service";
import { RecalcularMesForm } from "@/modules/recalculo/presentation/components/recalcular-mes-form";
import { enfileirarRecalculoEspelhoPonto } from "@/modules/recalculo/application/queues/recalcular-espelho-ponto-queue";
import {
  obterProcessamentoEspelhoPonto,
  processamentoAtualizadoHoje,
} from "@/modules/recalculo/application/services/processamento-espelho-ponto.service";
import { recalculoEspelhoPontoDisponivel } from "@/modules/recalculo/application/services/recalculo-worker-env";
import {
  montarOpcoesCargoFuncaoAssinatura,
  resolverSeccionalAssinatura,
} from "@/modules/documentos-autenticacao/application/services/dados-assinatura-documento.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { FavoritoPaginaButton } from "@/modules/favoritos/presentation/favorito-pagina-button";
import { resolverFusoHorarioServidorNoBanco } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import {
  buscarServidorComUsuarioPorUsuarioId,
  listarApuracoesDoServidorNoMes,
  listarMarcacoesDoServidorNoMes,
  listarServidoresParaEspelhoPonto,
  listarSolicitacoesDoServidorNoMes,
} from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";
import { EspelhoPontoMensal } from "@/modules/apuracao/presentation/components/espelho-ponto-mensal";
import { EspelhoPontoFiltrosAuto } from "@/modules/apuracao/presentation/components/espelho-ponto-filtros-auto";
import {
  EspelhoPontoCarregamentoToast,
  EspelhoPontoNavLink,
  EspelhoPontoUrlCanonica,
} from "@/modules/apuracao/presentation/components/espelho-ponto-carregamento-toast";
import {
  classeStatusHomologacao,
  rotuloStatusHomologacaoServidor,
} from "@/modules/homologacao/application/services/formatar-homologacao.service";
import {
  buscarEnvioEspelhoServidor,
  buscarHomologacaoServidorMes,
} from "@/modules/homologacao/infrastructure/repositories/homologacao.repository";
import { EnviarEspelhoHomologacaoModal } from "@/modules/homologacao/presentation/components/enviar-espelho-homologacao-modal";
import { RelatorioExportacaoButton } from "@/modules/relatorios/presentation/components/relatorio-exportacao-button";
import {
  bancoHorasAtivoNaCompetencia,
  buscarRegulamentacaoPontoOrgao,
} from "@/modules/regulamentacao-ponto/application/services/regulamentacao-ponto.service";
import { logger } from "@/lib/observability/logger";

type EspelhoPontoPageProps = {
  searchParams: Promise<{
    servidorId?: string;
    competencia?: string;
    anoReferencia?: string;
    mesReferencia?: string;
    destaqueData?: string;
    destaqueOcorrencia?: string;
    aba?: string;
  }>;
};

type ServidorEspelho = Awaited<
  ReturnType<typeof listarServidoresParaEspelhoPonto>
>[number];

type EtapaTempo = {
  etapa: string;
  durationMs: number;
};

function PageHeader({
  actions,
  descricao,
  icon: Icon,
  titulo,
}: {
  actions?: ReactNode;
  descricao?: string;
  icon: typeof CalendarDays;
  titulo: string;
  artigo?: string;
  regraTitulo?: string;
  regraDescricao?: string;
}) {
  return (
    <section className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <h1 className="min-w-0 text-xl font-black leading-none tracking-normal text-slate-950 dark:text-slate-50">
          {titulo}
        </h1>
        {descricao ? (
          <p className="col-start-2 mt-0.5 max-w-4xl text-[11px] leading-4 text-slate-500">
            {descricao}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-end gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </section>
  );
}

function limiteLogLentoEspelhoPonto() {
  const valor = Number(process.env.ESPELHO_PONTO_SLOW_LOG_MS);
  return Number.isFinite(valor) && valor >= 0 ? valor : 1000;
}

function criarMedidorEspelhoPonto() {
  const inicioTotal = performance.now();
  const etapas: EtapaTempo[] = [];

  return {
    async medir<T>(etapa: string, tarefa: () => Promise<T>): Promise<T> {
      const inicio = performance.now();

      try {
        return await tarefa();
      } finally {
        etapas.push({
          etapa,
          durationMs: Math.round(performance.now() - inicio),
        });
      }
    },
    finalizar() {
      return {
        totalMs: Math.round(performance.now() - inicioTotal),
        etapas,
      };
    },
  };
}

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

function deslocarCompetencia(
  anoReferencia: number,
  mesReferencia: number,
  deslocamento: number,
) {
  const data = new Date(
    Date.UTC(anoReferencia, mesReferencia - 1 + deslocamento, 1),
  );

  return competenciaParaInput(data.getUTCFullYear(), data.getUTCMonth() + 1);
}

function formatarPeriodoCompetencia(
  anoReferencia: number,
  mesReferencia: number,
) {
  const ultimoDia = new Date(
    Date.UTC(anoReferencia, mesReferencia, 0),
  ).getUTCDate();
  const mes = String(mesReferencia).padStart(2, "0");

  return `01/${mes}/${anoReferencia} a ${String(ultimoDia).padStart(2, "0")}/${mes}/${anoReferencia}`;
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

function inicioCompetencia(anoReferencia: number, mesReferencia: number) {
  return new Date(Date.UTC(anoReferencia, mesReferencia - 1, 1));
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

  return [servidor];
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

function montarHrefEspelho(params: {
  competencia: string;
  servidorId?: string | null;
  aba?: string | null;
}) {
  const query = new URLSearchParams({
    competencia: params.competencia,
  });

  if (params.servidorId) {
    query.set("servidorId", params.servidorId);
  }

  if (params.aba) {
    query.set("aba", params.aba);
  }

  return `/espelho-ponto?${query.toString()}`;
}

export default async function EspelhoPontoPage({
  searchParams,
}: EspelhoPontoPageProps) {
  const medidor = criarMedidorEspelhoPonto();
  const permissao = await medidor.medir("autenticacao_permissoes", () =>
    exigirUmaDasPermissoesOuRedirecionar([
      "espelho-ponto:visualizar:proprio",
      "apuracao:consultar:global",
    ]),
  );

  const params = await medidor.medir("search_params", () => searchParams);
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
  const podeRecalcularGlobal = usuarioPossuiPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    "apuracao:recalcular:global",
  );
  const podeRecalcularSeccional = usuarioPossuiPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    "apuracao:recalcular:seccional",
  );
  const podeRecalcularBancoHoras = usuarioPossuiPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    "banco-horas:gerenciar:global",
  );
  const podeRecalcularChefia =
    perfilChefiaAtivo &&
    (permissao.permissoes.includes("homologacao:gerenciar:chefia") ||
      permissao.permissoes.includes("minha-equipe:consultar:chefia"));
  const podeRecalcular =
    podeRecalcularGlobal ||
    podeRecalcularSeccional ||
    podeRecalcularBancoHoras ||
    podeRecalcularChefia;
  const workerEspelhoAtivo = recalculoEspelhoPontoDisponivel();
  const podeGerenciarBancoHorasNoEspelho =
    perfilChefiaAtivo ||
    usuarioPossuiPermissaoNoPerfil(
      permissao.perfilAtivoCodigo,
      permissao.permissoes,
      "homologacao:gerenciar:global",
    ) ||
    podeRecalcular;
  const perfilServidorAtivo =
    permissao.perfilAtivoCodigo?.toUpperCase() === "SERVIDOR";
  const perfilPessoaExternaAtivo = [
    "ESTAGIARIO",
    "PRESTADOR",
    "VOLUNTARIO",
  ].includes(permissao.perfilAtivoCodigo?.toUpperCase() ?? "");
  const perfilProprioAtivo = perfilServidorAtivo || perfilPessoaExternaAtivo;
  const escopoOrgao = await medidor.medir("escopo_orgao_sessao", () =>
    obterEscopoOrgaoDaSessao(),
  );
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds;

  const [servidoresEscopo, servidorProprio] = await medidor.medir(
    "servidores_escopo_proprio",
    () =>
      Promise.all([
        params.servidorId && podeConsultarTodosServidores
          ? listarServidoresParaEspelhoPonto({
              anoReferencia,
              mesReferencia,
              escopo: "global",
              orgaoIdsPermitidos,
              servidorId: params.servidorId,
              limite: 1,
            })
          : params.servidorId && perfilChefiaAtivo && permissao.usuarioId
            ? listarServidoresParaEspelhoPonto({
                usuarioId: permissao.usuarioId,
                anoReferencia,
                mesReferencia,
                escopo: "chefia",
                orgaoIdsPermitidos,
                servidorId: params.servidorId,
                limite: 1,
              })
            : Promise.resolve([]),
        permissao.usuarioId
          ? buscarServidorComUsuarioPorUsuarioId(permissao.usuarioId)
          : Promise.resolve(null),
      ]),
  );
  const servidores =
    perfilChefiaAtivo && servidorProprio
      ? [
          servidorProprio,
          ...servidoresEscopo.filter(
            (servidor) => servidor.id !== servidorProprio.id,
          ),
        ]
      : podeConsultarTodosServidores || perfilChefiaAtivo
        ? servidoresEscopo
        : servidorProprioParaLista(servidorProprio);
  const podeSelecionarServidor =
    !perfilProprioAtivo && (podeConsultarTodosServidores || perfilChefiaAtivo);

  const servidorSelecionado =
    servidores.find((servidor) => servidor.id === params.servidorId) ??
    (perfilProprioAtivo || perfilChefiaAtivo ? servidores[0] : null) ??
    null;

  let processamentoEspelho: Awaited<
    ReturnType<typeof obterProcessamentoEspelhoPonto>
  > = null;

  if (servidorSelecionado) {
    const fusoHorario = await medidor.medir("fuso_horario_servidor", () =>
      resolverFusoHorarioServidorNoBanco({
        servidorId: servidorSelecionado.id,
        dataReferencia: inicioCompetencia(anoReferencia, mesReferencia),
      }),
    );

    processamentoEspelho = await medidor.medir(
      "estado_processamento_espelho",
      () =>
        obterProcessamentoEspelhoPonto({
          servidorId: servidorSelecionado.id,
          anoReferencia,
          mesReferencia,
        }),
    );

    const competenciaSelecionada = competenciaParaInput(
      anoReferencia,
      mesReferencia,
    );
    const podeCalcularCompetencia =
      competenciaSelecionada <= obterCompetenciaAtual(fusoHorario);
    const processamentoEmAndamento = ["PENDENTE", "PROCESSANDO"].includes(
      processamentoEspelho?.status ?? "",
    );

    if (
      podeCalcularCompetencia &&
      workerEspelhoAtivo &&
      !processamentoEmAndamento &&
      !processamentoAtualizadoHoje(processamentoEspelho, fusoHorario)
    ) {
      await medidor
        .medir("enfileirar_espelho_desatualizado", () =>
          enfileirarRecalculoEspelhoPonto({
            servidorId: servidorSelecionado.id,
            anoReferencia,
            mesReferencia,
            motivo: "ACESSO_ESPELHO_DESATUALIZADO",
            solicitadoPorId: permissao.usuarioId,
            fusoHorario,
          }),
        )
        .catch((error: unknown) => {
          logger.warn("Falha ao enfileirar atualizacao do espelho", {
            servidorId: servidorSelecionado.id,
            anoReferencia,
            mesReferencia,
            erro: error instanceof Error ? error.message : String(error),
          });
        });
      processamentoEspelho = await obterProcessamentoEspelhoPonto({
        servidorId: servidorSelecionado.id,
        anoReferencia,
        mesReferencia,
      });
    }
  }

  const [apuracoes, marcacoes, solicitacoes, homologacaoServidor] =
    await medidor.medir("dados_espelho_mensal", () =>
      servidorSelecionado
        ? Promise.all([
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
            listarSolicitacoesDoServidorNoMes({
              servidorId: servidorSelecionado.id,
              ano: anoReferencia,
              mes: mesReferencia,
            }),
            perfilServidorAtivo
              ? buscarHomologacaoServidorMes({
                  servidorId: servidorSelecionado.id,
                  anoReferencia,
                  mesReferencia,
                })
              : Promise.resolve(null),
          ])
        : Promise.resolve([[], [], [], null]),
    );
  const envioHomologacao = await medidor.medir(
    "envio_espelho_homologacao",
    () =>
      homologacaoServidor
        ? buscarEnvioEspelhoServidor(homologacaoServidor.id)
        : Promise.resolve(null),
  );
  const espelhoEnviado = Boolean(
    envioHomologacao ||
    (homologacaoServidor &&
      ["HOMOLOGADO", "HOMOLOGADO_COM_RESSALVA"].includes(
        homologacaoServidor.status,
      )),
  );
  const competenciaInput = competenciaParaInput(anoReferencia, mesReferencia);
  const servidorOpcoes = servidores.map((servidor) => ({
    value: servidor.id,
    label: `${servidor.matricula} - ${nomeServidor(servidor)}`,
    searchText: `${servidor.matricula} ${nomeServidor(servidor)}`,
  }));
  const queryBuscaPessoa = new URLSearchParams({
    competencia: competenciaInput,
  });
  const regulamentacaoBancoHoras = await medidor.medir(
    "regulamentacao_banco_horas",
    () =>
      servidorSelecionado?.orgaoId
        ? buscarRegulamentacaoPontoOrgao(servidorSelecionado.orgaoId)
        : Promise.resolve(null),
  );
  const bancoHorasAtivoCompetencia = regulamentacaoBancoHoras
    ? bancoHorasAtivoNaCompetencia(regulamentacaoBancoHoras, competenciaInput)
    : true;
  const medicao = medidor.finalizar();

  if (medicao.totalMs >= limiteLogLentoEspelhoPonto()) {
    logger.info("Tempo de carregamento do espelho de ponto", {
      rota: "/espelho-ponto",
      totalMs: medicao.totalMs,
      etapas: medicao.etapas,
      anoReferencia,
      mesReferencia,
      servidorId: servidorSelecionado?.id ?? params.servidorId ?? null,
      perfilAtivoCodigo: permissao.perfilAtivoCodigo ?? null,
      escopo: perfilChefiaAtivo
        ? "chefia"
        : podeConsultarTodosServidores
          ? "global"
          : "proprio",
      servidoresEscopo: servidoresEscopo.length,
      servidoresRenderizados: servidores.length,
      apuracoes: apuracoes.length,
      marcacoes: marcacoes.length,
      processamentoEspelho: processamentoEspelho?.status ?? "AUSENTE",
    });
  }

  const hrefCompetenciaAnterior = montarHrefEspelho({
    competencia: deslocarCompetencia(anoReferencia, mesReferencia, -1),
    servidorId: servidorSelecionado?.id ?? params.servidorId ?? null,
    aba: params.aba ?? null,
  });
  const hrefCompetenciaProxima = montarHrefEspelho({
    competencia: deslocarCompetencia(anoReferencia, mesReferencia, 1),
    servidorId: servidorSelecionado?.id ?? params.servidorId ?? null,
    aba: params.aba ?? null,
  });
  const hrefExportacao = servidorSelecionado
    ? montarHrefExportacaoEspelho({
        servidorId: servidorSelecionado.id,
        anoReferencia,
        mesReferencia,
      })
    : null;
  const hrefCanonicoEspelho =
    !paramsPossuemCompetencia(params) ||
    (servidorSelecionado && params.servidorId !== servidorSelecionado.id)
      ? montarHrefEspelho({
          competencia: competenciaInput,
          servidorId: servidorSelecionado?.id ?? params.servidorId ?? null,
          aba: params.aba ?? null,
        })
      : null;

  return (
    <div className="-mt-4 space-y-1.5">
      <EspelhoPontoCarregamentoToast />
      <EspelhoPontoUrlCanonica href={hrefCanonicoEspelho} />
      <div className="relative flex min-h-9 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb items={[{ label: "Espelho de ponto" }]} />
        {servidorSelecionado ? (
          <div className="absolute left-1/2 top-1/2 w-fit max-w-[44rem] -translate-x-1/2 -translate-y-1/2">
            <RecalcularMesForm
              key={`${servidorSelecionado.id}-${competenciaInput}-${processamentoEspelho?.status}-${processamentoEspelho?.concluidoEm?.toISOString()}-breadcrumb`}
              servidorId={servidorSelecionado.id}
              anoReferencia={anoReferencia}
              mesReferencia={mesReferencia}
              podeRecalcular={podeRecalcular}
              workerAtivo={workerEspelhoAtivo}
              compacto
              estadoInicial={{
                status: processamentoEspelho?.status ?? "AUSENTE",
                atualizadoEm:
                  processamentoEspelho?.concluidoEm?.toISOString() ?? null,
                erro: processamentoEspelho?.erro ?? null,
              }}
            />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <EspelhoPontoNavLink
            href={hrefCompetenciaAnterior}
            className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            aria-label="Competencia anterior"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </EspelhoPontoNavLink>
          <EspelhoPontoFiltrosAuto
            competencia={competenciaInput}
            className="flex w-64 items-center gap-2"
            compacto
            labelInline
          />
          <EspelhoPontoNavLink
            href={hrefCompetenciaProxima}
            className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            aria-label="Proxima competencia"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </EspelhoPontoNavLink>
          {hrefExportacao ? (
            <RelatorioExportacaoButton
              href={hrefExportacao}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-md bg-blue-700 px-3 text-xs font-bold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
            />
          ) : null}
          <FavoritoPaginaButton />
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            aria-label="Mais opcoes"
          >
            <MoreVertical className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <PageHeader
        icon={CalendarDays}
        titulo="Espelho de ponto"
        artigo="Arts. 8, 16 e 17"
        regraTitulo="Conferência mensal da frequência"
        regraDescricao="O servidor pode consultar a própria frequência e o saldo; a chefia homologa mensalmente comparecimento, ausências, créditos, débitos e compensações."
      />

      {!perfilProprioAtivo && (
        <Card className="p-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <EspelhoPontoFiltrosAuto
              competencia={competenciaInput}
              servidorId={servidorSelecionado?.id ?? ""}
              servidores={servidorOpcoes}
              podeSelecionarServidor={podeSelecionarServidor}
              pessoasSearchUrl={`/api/espelho-ponto/pessoas?${queryBuscaPessoa.toString()}`}
              mostrarServidor
              className="grid gap-3 md:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)] md:items-end"
            />

            {servidorSelecionado && (
              <div className="xl:min-w-[28rem]">
                <RecalcularMesForm
                  key={`${servidorSelecionado.id}-${competenciaInput}-${processamentoEspelho?.status}-${processamentoEspelho?.concluidoEm?.toISOString()}-admin`}
                  servidorId={servidorSelecionado.id}
                  anoReferencia={anoReferencia}
                  mesReferencia={mesReferencia}
                  podeRecalcular={podeRecalcular}
                  workerAtivo={workerEspelhoAtivo}
                  compacto
                  mostrarCompactoQuandoDisponivel
                  estadoInicial={{
                    status: processamentoEspelho?.status ?? "AUSENTE",
                    atualizadoEm:
                      processamentoEspelho?.concluidoEm?.toISOString() ?? null,
                    erro: processamentoEspelho?.erro ?? null,
                  }}
                />
              </div>
            )}
          </div>
        </Card>
      )}

      {perfilPessoaExternaAtivo && servidorSelecionado && (
        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <EspelhoPontoFiltrosAuto
              competencia={competenciaInput}
              className="w-full sm:w-56"
            />
            <RelatorioExportacaoButton
              href={montarHrefExportacaoEspelho({
                servidorId: servidorSelecionado.id,
                anoReferencia,
                mesReferencia,
              })}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-[var(--muted)]"
            />
          </div>
        </Card>
      )}

      {servidorSelecionado ? (
        <EspelhoPontoMensal
          key={`${servidorSelecionado.id}-${competenciaInput}`}
          apuracoes={apuracoes}
          marcacoes={marcacoes}
          solicitacoes={solicitacoes}
          destaque={{
            dataReferencia: params.destaqueData,
            ocorrenciaId: params.destaqueOcorrencia,
          }}
          modoCompactoPessoaExterna={perfilPessoaExternaAtivo}
          acoesBancoHoras={{
            habilitadas:
              podeGerenciarBancoHorasNoEspelho && !perfilPessoaExternaAtivo,
            bancoHorasAtivo: bancoHorasAtivoCompetencia,
            servidorId: servidorSelecionado.id,
            anoReferencia,
            mesReferencia,
          }}
          periodoLabel={formatarPeriodoCompetencia(
            anoReferencia,
            mesReferencia,
          )}
          homologacaoCompetencia={
            homologacaoServidor
              ? {
                  status: homologacaoServidor.status,
                  enviadoEm: envioHomologacao?.criadoEm ?? null,
                  enviadoPor: envioHomologacao?.usuario?.nome ?? null,
                  homologadoEm: homologacaoServidor.homologadoEm,
                  homologadoPor: homologacaoServidor.homologadoPor?.nome ?? null,
                  unidadeSigla: homologacaoServidor.fechamento.unidade.sigla,
                  chefiaResponsavel:
                    nomeServidor(
                      homologacaoServidor.fechamento.gestorResponsavel
                        ?.servidor,
                    ) || null,
                }
              : null
          }
          acaoHomologacao={
            perfilServidorAtivo && !espelhoEnviado ? (
              <EnviarEspelhoHomologacaoModal
                anoReferencia={anoReferencia}
                mesReferencia={mesReferencia}
                assinatura={{
                  orgao: resolverSeccionalAssinatura(servidorSelecionado),
                  assinante:
                    nomeServidor(servidorSelecionado) ||
                    servidorSelecionado.matricula,
                  cargoFuncoes:
                    montarOpcoesCargoFuncaoAssinatura(servidorSelecionado),
                }}
              />
            ) : undefined
          }
          controles={
            perfilServidorAtivo ? (
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                <div
                  className={
                    homologacaoServidor && espelhoEnviado
                      ? "rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
                      : "rounded-md border border-border bg-muted/50 p-3 text-sm"
                  }
                >
                  <p className="flex items-center gap-2 font-semibold text-foreground">
                    {homologacaoServidor && espelhoEnviado ? (
                      <CheckCircle2
                        className="size-4 text-emerald-700 dark:text-emerald-300"
                        aria-hidden="true"
                      />
                    ) : (
                      <Send className="size-4" aria-hidden="true" />
                    )}
                    Envio para homologação
                  </p>
                  {homologacaoServidor && espelhoEnviado ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${classeStatusHomologacao(
                          homologacaoServidor.status,
                        )}`}
                      >
                        {rotuloStatusHomologacaoServidor(
                          homologacaoServidor.status,
                        )}
                      </span>
                      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-200 bg-white/70 px-2 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                        <ShieldCheck className="size-3.5" aria-hidden="true" />
                        {homologacaoServidor.fechamento.unidade.sigla}
                      </span>
                      <p className="basis-full text-xs leading-5 text-emerald-800 dark:text-emerald-200">
                        Enviado para{" "}
                        {nomeServidor(
                          homologacaoServidor.fechamento.gestorResponsavel
                            ?.servidor,
                        ) || "chefia responsável"}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 grid gap-2">
                      <p className="text-xs leading-5 text-muted-foreground">
                        Revise o espelho antes de enviar. Após o envio, não será
                        possível criar ajuste, justificativa ou compensação que
                        altere esta competência.
                      </p>
                      <EnviarEspelhoHomologacaoModal
                        anoReferencia={anoReferencia}
                        mesReferencia={mesReferencia}
                        assinatura={{
                          orgao:
                            resolverSeccionalAssinatura(servidorSelecionado),
                          assinante:
                            nomeServidor(servidorSelecionado) ||
                            servidorSelecionado.matricula,
                          cargoFuncoes:
                            montarOpcoesCargoFuncaoAssinatura(
                              servidorSelecionado,
                            ),
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
                  <EspelhoPontoFiltrosAuto
                    competencia={competenciaInput}
                    className="w-full sm:w-56"
                  />
                  <RelatorioExportacaoButton
                    href={montarHrefExportacaoEspelho({
                      servidorId: servidorSelecionado.id,
                      anoReferencia,
                      mesReferencia,
                    })}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-[var(--muted)]"
                  />
                </div>
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
