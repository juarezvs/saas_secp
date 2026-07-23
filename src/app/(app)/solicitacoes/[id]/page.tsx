import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { perfilEhAdministradorSistema } from "@/modules/auth/domain/constants/perfis-sistema";
import { recalcularPosSolicitacaoAction } from "@/modules/recalculo/application/actions/recalcular-pos-solicitacao.action";
import { analisarSolicitacaoAction } from "@/modules/solicitacoes/application/actions/analisar-solicitacao.action";
import { excluirSolicitacaoAction } from "@/modules/solicitacoes/application/actions/excluir-solicitacao.action";
import {
  classeStatusSolicitacao,
  rotuloStatusSolicitacao,
  rotuloTipoSolicitacao,
  solicitacaoPodeSerAnalisada,
} from "@/modules/solicitacoes/application/services/fluxo-solicitacao.service";
import {
  dataPeriodoSolicitacaoParaExibicao,
  solicitacaoUsaPeriodoDiaInteiro,
} from "@/modules/solicitacoes/application/services/periodo-solicitacao.service";
import {
  buscarSolicitacaoPorId,
  usuarioPodeAcessarSolicitacaoComoChefia,
} from "@/modules/solicitacoes/infrastructure/repositories/solicitacao.repository";
import { AnalisarSolicitacaoForm } from "@/modules/solicitacoes/presentation/components/analisar-solicitacao-form";
import { SolicitacaoStepper } from "@/modules/solicitacoes/presentation/components/solicitacao-stepper";
import { SolicitacaoTimeline } from "@/modules/solicitacoes/presentation/components/solicitacao-timeline";
import { resolverFusoHorarioUnidade } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

type SolicitacaoDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

function obterDadosBancoHoras(dados: unknown) {
  if (!dados || typeof dados !== "object") {
    return null;
  }

  const registro = dados as Record<string, unknown>;
  const minutosSolicitados = Number(registro.minutosSolicitados);

  if (!Number.isFinite(minutosSolicitados) || minutosSolicitados <= 0) {
    return null;
  }

  return {
    minutosSolicitados,
    tipoCompensacao: String(registro.tipoCompensacao ?? ""),
  };
}

function formatarHoras(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const restante = minutos % 60;

  return `${horas}h${String(restante).padStart(2, "0")}`;
}

function formatarDataReferencia(data: Date | null) {
  if (!data) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(data);
}

function formatarDataPeriodoSolicitacao(params: {
  tipo: string;
  data: Date | null;
  parte: "inicio" | "fim";
  fusoHorario?: string | null;
}) {
  const dataExibicao = dataPeriodoSolicitacaoParaExibicao(
    params.tipo,
    params.data,
    params.parte,
  );

  if (!dataExibicao) {
    return "-";
  }

  if (solicitacaoUsaPeriodoDiaInteiro(params.tipo)) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeZone: params.fusoHorario ?? "UTC",
    }).format(dataExibicao);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    ...(params.fusoHorario ? { timeZone: params.fusoHorario } : {}),
  }).format(dataExibicao);
}

export default async function SolicitacaoDetalhePage({
  params,
}: SolicitacaoDetalhePageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "solicitacoes:consultar:proprio",
    "solicitacoes:visualizar:proprio",
    "solicitacoes:analisar:chefia",
    "solicitacoes:consultar:global",
  ]);

  const session = await auth();
  const { id } = await params;
  const solicitacao = await buscarSolicitacaoPorId(id);

  if (!solicitacao) {
    notFound();
  }

  const permissoes = session?.user.perfilAtivo?.permissoes ?? [];
  const podeConsultarGlobal = permissoes.includes(
    "solicitacoes:consultar:global",
  );
  const podeAcessarComoChefia = session?.user.id
    ? permissoes.includes("solicitacoes:analisar:chefia") &&
      (await usuarioPodeAcessarSolicitacaoComoChefia({
        usuarioId: session.user.id,
        solicitacaoId: solicitacao.id,
      }))
    : false;
  const podeAcessarComoProprio =
    solicitacao.usuarioSolicitanteId === session?.user.id &&
    (permissoes.includes("solicitacoes:consultar:proprio") ||
      permissoes.includes("solicitacoes:visualizar:proprio"));

  if (!podeConsultarGlobal && !podeAcessarComoChefia && !podeAcessarComoProprio) {
    notFound();
  }

  const podeAnalisar =
    solicitacaoPodeSerAnalisada(solicitacao.status) &&
    (podeAcessarComoChefia || podeConsultarGlobal);
  const podeExcluir = perfilEhAdministradorSistema(session?.user.perfilAtivo);
  const action = analisarSolicitacaoAction.bind(null, solicitacao.id);
  const excluirAction = excluirSolicitacaoAction.bind(null, solicitacao.id);
  const dadosBancoHoras = obterDadosBancoHoras(solicitacao.dadosSolicitados);
  const fusoHorario = resolverFusoHorarioUnidade(solicitacao.unidade);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Solicitações", href: "/solicitacoes" },
          { label: solicitacao.titulo },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            {rotuloTipoSolicitacao(solicitacao.tipo)}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {solicitacao.titulo}
          </h1>
          <p className="mt-2 text-sm text-(--muted-foreground)">
            Servidor: {nomeServidor(solicitacao.servidor)} • Matrícula{" "}
            {solicitacao.servidor.matricula}
          </p>
        </div>

        <span
          className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${classeStatusSolicitacao(
            solicitacao.status,
          )}`}
        >
          {rotuloStatusSolicitacao(solicitacao.status)}
        </span>
      </section>

      <RegraPortariaCard
        artigo="Arts. 9º, 10, 14, 16 e 18"
        titulo="Autorização e análise pela chefia"
        descricao="Créditos e compensações dependem de autorização prévia. A decisão registra período, quantidade, responsável e justificativa na trilha de auditoria."
      />

      <SolicitacaoStepper status={solicitacao.status} />

      <section className="rounded-xl border bg-(--card) p-5 text-(--card-foreground) shadow-sm">
        <h2 className="text-lg font-bold">Detalhes da solicitação</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Info label="Tipo" value={rotuloTipoSolicitacao(solicitacao.tipo)} />
          <Info label="Unidade" value={solicitacao.unidade?.sigla ?? "-"} />
          <Info
            label="Data de referência"
            value={formatarDataReferencia(solicitacao.dataReferencia)}
          />
          <Info
            label="Chefia responsável"
            value={
              nomeServidor(solicitacao.chefiaResponsavel?.servidor) ||
              "Não identificada"
            }
          />
          {solicitacao.dataInicio && (
            <Info
              label="Início do período"
              value={formatarDataPeriodoSolicitacao({
                tipo: solicitacao.tipo,
                data: solicitacao.dataInicio,
                parte: "inicio",
                fusoHorario,
              })}
            />
          )}
          {solicitacao.dataFim && (
            <Info
              label="Fim do período"
              value={formatarDataPeriodoSolicitacao({
                tipo: solicitacao.tipo,
                data: solicitacao.dataFim,
                parte: "fim",
                fusoHorario,
              })}
            />
          )}
          {dadosBancoHoras && (
            <Info
              label="Quantidade solicitada"
              value={formatarHoras(dadosBancoHoras.minutosSolicitados)}
            />
          )}
          {dadosBancoHoras?.tipoCompensacao && (
            <Info
              label="Modalidade"
              value={
                dadosBancoHoras.tipoCompensacao === "COMPENSAR_DEBITO"
                  ? "Trabalhar horas para compensar débito"
                  : "Utilizar crédito para compensar débito"
              }
            />
          )}
        </div>

        <div className="mt-5 rounded-lg border bg-(--muted) p-4">
          <p className="text-sm font-semibold">Descrição</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-(--muted-foreground)">
            {solicitacao.descricao}
          </p>
        </div>

        {solicitacao.justificativaAnalise && (
          <div className="mt-5 rounded-lg border bg-(--muted) p-4">
            <p className="text-sm font-semibold">Justificativa da análise</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-(--muted-foreground)">
              {solicitacao.justificativaAnalise}
            </p>
          </div>
        )}

        {solicitacao.autorizacaoBancoHoras && (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
            <p className="text-sm font-bold">Autorização prévia registrada</p>
            <p className="mt-2 text-sm leading-6">
              {formatarHoras(
                solicitacao.autorizacaoBancoHoras.minutosAutorizados,
              )} autorizadas por{" "}
              {solicitacao.autorizacaoBancoHoras.autorizadoPor.nome} em{" "}
              {new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(solicitacao.autorizacaoBancoHoras.autorizadoEm)}
              . Status: {solicitacao.autorizacaoBancoHoras.status}.
            </p>
          </div>
        )}
      </section>

      {podeAnalisar && <AnalisarSolicitacaoForm action={action} />}

      {podeExcluir && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-950 shadow-sm dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <h2 className="text-lg font-bold">Excluir solicitação</h2>
          <p className="mt-1 text-sm leading-6">
            A exclusão remove a solicitação e seus efeitos automáticos. Depois
            disso, o sistema recalcula os dias afetados e regenera o banco de
            horas das competências correspondentes.
          </p>
          <form action={excluirAction} className="mt-4">
            <button
              type="submit"
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              Excluir solicitação e recalcular efeitos
            </button>
          </form>
        </section>
      )}

      {solicitacao.status === "DEFERIDA" &&
        ["AJUSTE_PONTO", "HORA_CREDITO_PREVIA", "COMPENSACAO"].includes(
          solicitacao.tipo,
        ) && (
          <section className="rounded-xl border bg-(--card) p-5 text-(--card-foreground) shadow-sm">
            <h2 className="text-lg font-bold">Recalcular efeitos</h2>
            <p className="mt-1 text-sm leading-6 text-(--muted-foreground)">
              Reprocesse a apuração e o banco de horas cobertos por esta
              solicitação deferida.
            </p>
            <form action={recalcularPosSolicitacaoAction} className="mt-4">
              <input type="hidden" name="solicitacaoId" value={solicitacao.id} />
              <button
                type="submit"
                className="rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-(--muted)"
              >
                Recalcular efeitos da solicitação
              </button>
            </form>
          </section>
        )}

      <SolicitacaoTimeline eventos={solicitacao.eventos} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-(--muted) p-4">
      <p className="text-xs font-semibold uppercase text-(--muted-foreground)">
        {label}
      </p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}
