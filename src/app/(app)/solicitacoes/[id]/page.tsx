import Link from "next/link";
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
import { PreviewSolicitacao } from "@/modules/solicitacoes/presentation/components/solicitacao-form";
import { SolicitacaoStepper } from "@/modules/solicitacoes/presentation/components/solicitacao-stepper";
import { SolicitacaoTimeline } from "@/modules/solicitacoes/presentation/components/solicitacao-timeline";
import { resolverFusoHorarioUnidade } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { Pencil, RefreshCw, Trash2 } from "lucide-react";

type SolicitacaoDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

function dadosComoRegistro(dados: unknown) {
  return dados && typeof dados === "object"
    ? (dados as Record<string, unknown>)
    : {};
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

function rotuloMarcacao(tipo: string) {
  const rotulos: Record<string, string> = {
    ENTRADA: "Entrada",
    SAIDA_INTERVALO: "Saída para intervalo",
    RETORNO_INTERVALO: "Retorno do intervalo",
    SAIDA: "Saída",
  };

  return (rotulos[tipo] ?? tipo) || "Não informado";
}

function rotuloCompensacao(tipo: string) {
  const rotulos: Record<string, string> = {
    UTILIZAR_CREDITO: "Utilizar crédito para compensar débito",
    COMPENSAR_DEBITO: "Trabalhar horas para compensar débito",
  };

  return (rotulos[tipo] ?? tipo) || "Não informado";
}

function rotuloRegimeRemoto(tipo: string) {
  const rotulos: Record<string, string> = {
    NAO_SE_APLICA: "Dispensa sem teletrabalho",
    TOTAL: "Teletrabalho 100%",
    HIBRIDO: "Regime híbrido",
  };

  return (rotulos[tipo] ?? tipo) || "Não informado";
}

function rotuloModalidadeCapacitacao(modalidade: string) {
  const rotulos: Record<string, string> = {
    EXTERNA: "Capacitação externa",
    INTERNA: "Capacitação interna",
  };

  return (rotulos[modalidade] ?? modalidade) || "Não informado";
}

function montarDetalhePreview(solicitacao: {
  tipo: string;
  dadosSolicitados: unknown;
}) {
  const dados = dadosComoRegistro(solicitacao.dadosSolicitados);

  if (solicitacao.tipo === "AJUSTE_PONTO") {
    return `${rotuloMarcacao(String(dados.tipoMarcacao ?? ""))} às ${
      String(dados.horaAjuste ?? "").trim() || "Não informado"
    }`;
  }

  if (solicitacao.tipo === "COMPENSACAO") {
    return rotuloCompensacao(String(dados.tipoCompensacao ?? ""));
  }

  if (solicitacao.tipo === "HORA_CREDITO_PREVIA") {
    const horas = Number(dados.horasSolicitadas);
    return Number.isFinite(horas)
      ? `${horas.toLocaleString("pt-BR")} hora(s) solicitada(s)`
      : "Quantidade não informada";
  }

  if (solicitacao.tipo === "DISPENSA_PONTO") {
    const regime = dadosComoRegistro(dados.regimeTrabalhoRemoto);
    return rotuloRegimeRemoto(String(regime.tipo ?? "NAO_SE_APLICA"));
  }

  if (solicitacao.tipo === "CAPACITACAO") {
    return rotuloModalidadeCapacitacao(
      String(dados.modalidadeCapacitacao ?? ""),
    );
  }

  return "Sem parametrização adicional.";
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

  if (
    !podeConsultarGlobal &&
    !podeAcessarComoChefia &&
    !podeAcessarComoProprio
  ) {
    notFound();
  }

  const podeAnalisar =
    solicitacaoPodeSerAnalisada(solicitacao.status) &&
    (podeAcessarComoChefia || podeConsultarGlobal);
  const podeEditar =
    !podeAcessarComoChefia &&
    solicitacao.usuarioSolicitanteId === session?.user.id &&
    ["ENVIADA", "EM_ANALISE"].includes(solicitacao.status);
  const podeExcluir = perfilEhAdministradorSistema(session?.user.perfilAtivo);
  const action = analisarSolicitacaoAction.bind(null, solicitacao.id);
  const excluirAction = excluirSolicitacaoAction.bind(null, solicitacao.id);
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

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${classeStatusSolicitacao(
              solicitacao.status,
            )}`}
          >
            {rotuloStatusSolicitacao(solicitacao.status)}
          </span>
          {podeEditar && (
            <Link
              href={`/solicitacoes/${solicitacao.id}/editar`}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-(--muted)"
            >
              <Pencil className="size-4" aria-hidden="true" />
              Editar solicitação
            </Link>
          )}
        </div>
      </section>

      <RegraPortariaCard
        artigo="Arts. 9º, 10, 14, 16 e 18"
        titulo="Autorização e análise pela chefia"
        descricao="Créditos e compensações dependem de autorização prévia. A decisão registra período, quantidade, responsável e justificativa na trilha de auditoria."
      />

      <SolicitacaoStepper status={solicitacao.status} />

      <div
        className={
          podeAnalisar ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]" : ""
        }
      >
        <div className="space-y-5">
          <PreviewSolicitacao
            titulo="Solicitação a ser analisada"
            preview={{
              tipo: rotuloTipoSolicitacao(solicitacao.tipo),
              titulo: solicitacao.titulo,
              periodo: solicitacao.dataReferencia
                ? `Data de referência: ${formatarDataReferencia(
                    solicitacao.dataReferencia,
                  )}`
                : `${formatarDataPeriodoSolicitacao({
                    tipo: solicitacao.tipo,
                    data: solicitacao.dataInicio,
                    parte: "inicio",
                    fusoHorario,
                  })} até ${formatarDataPeriodoSolicitacao({
                    tipo: solicitacao.tipo,
                    data: solicitacao.dataFim,
                    parte: "fim",
                    fusoHorario,
                  })}`,
              detalhe: montarDetalhePreview(solicitacao),
              justificativa: solicitacao.descricao,
              encaminhamento:
                "A chefia deve registrar a decisão ou devolver para ajustes.",
            }}
          />

          {solicitacao.justificativaAnalise && (
            <div className="rounded-xl border bg-(--card) p-5 text-(--card-foreground) shadow-sm">
              <p className="text-sm font-semibold">Justificativa da análise</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-(--muted-foreground)">
                {solicitacao.justificativaAnalise}
              </p>
            </div>
          )}

          {solicitacao.autorizacaoBancoHoras && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-green-900 shadow-sm dark:border-green-900 dark:bg-green-950 dark:text-green-100">
              <p className="text-sm font-bold">Autorização prévia registrada</p>
              <p className="mt-2 text-sm leading-6">
                {formatarHoras(
                  solicitacao.autorizacaoBancoHoras.minutosAutorizados,
                )}{" "}
                autorizadas por{" "}
                {solicitacao.autorizacaoBancoHoras.autorizadoPor.nome} em{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(solicitacao.autorizacaoBancoHoras.autorizadoEm)}
                . Status: {solicitacao.autorizacaoBancoHoras.status}.
              </p>
            </div>
          )}
        </div>

        {podeAnalisar && (
          <aside className="xl:sticky xl:top-24 xl:self-start">
            <AnalisarSolicitacaoForm action={action} />
          </aside>
        )}
      </div>

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
              className="inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              <Trash2 className="size-4" aria-hidden="true" />
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
              <input
                type="hidden"
                name="solicitacaoId"
                value={solicitacao.id}
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-(--muted)"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Recalcular efeitos da solicitação
              </button>
            </form>
          </section>
        )}

      <SolicitacaoTimeline eventos={solicitacao.eventos} />
    </div>
  );
}
