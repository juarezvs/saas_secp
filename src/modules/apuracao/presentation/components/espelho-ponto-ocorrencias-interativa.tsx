"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock3,
  MoreVertical,
  MinusCircle,
  Pencil,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import { minutosParaTexto } from "../../application/services/calcular-tempo.service";
import { excluirSolicitacaoAction } from "@/modules/solicitacoes/application/actions/excluir-solicitacao.action";
import { rotuloTipoSolicitacao } from "@/modules/solicitacoes/application/services/fluxo-solicitacao.service";

export type OcorrenciaVisualizacaoInterativa = {
  id: string;
  dataReferencia: Date | string;
  dia: string;
  tipo: "hora-extra" | "atraso" | "saida" | "falta" | "outra";
  tipoLabel: string;
  periodo: string;
  duracaoMinutos: number;
  situacao: string;
  justificativa: string;
  origem: string;
  observacoes: string;
  solicitacaoId?: string;
  solicitacaoNumero?: string;
  solicitacaoStatus?: string;
  hrefEditar?: string;
  hrefSolicitar?: string;
  podeExcluir?: boolean;
};

function tipoOcorrenciaNormalizado(tipo: string) {
  return tipo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function textoNormalizado(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function formatarDataCompletaReferenciaUtc(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);
}

function corTipoOcorrencia(tipo: OcorrenciaVisualizacaoInterativa["tipo"]) {
  if (tipo === "hora-extra") {
    return "bg-amber-50 text-orange-700";
  }

  if (tipo === "atraso") {
    return "bg-red-50 text-red-700";
  }

  if (tipo === "falta") {
    return "bg-blue-50 text-blue-700";
  }

  if (tipo === "saida") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-violet-50 text-violet-700";
}

function IconeTipoOcorrencia({
  tipo,
  className = "size-3.5",
}: {
  tipo: OcorrenciaVisualizacaoInterativa["tipo"];
  className?: string;
}) {
  if (tipo === "hora-extra") {
    return <Zap className={className} aria-hidden="true" />;
  }

  if (tipo === "atraso") {
    return <Clock3 className={className} aria-hidden="true" />;
  }

  if (tipo === "falta") {
    return <CalendarDays className={className} aria-hidden="true" />;
  }

  if (tipo === "saida") {
    return <MinusCircle className={className} aria-hidden="true" />;
  }

  return <AlertTriangle className={className} aria-hidden="true" />;
}

function BadgeSituacaoOcorrencia({ situacao }: { situacao: string }) {
  const normalizada = tipoOcorrenciaNormalizado(situacao);
  const classe =
    normalizada.includes("INDEFER")
      ? "bg-red-50 text-red-700"
      : normalizada.includes("NAO") || normalizada.includes("REPROV")
        ? "bg-red-50 text-red-700"
        : normalizada.includes("DEFER") || normalizada.includes("APROV")
          ? "bg-emerald-50 text-emerald-700"
          : normalizada.includes("JUST")
            ? "bg-blue-50 text-blue-700"
            : normalizada.includes("ANALISE")
              ? "bg-amber-50 text-amber-700"
              : normalizada.includes("CANCEL")
                ? "bg-slate-100 text-slate-600"
                : "bg-emerald-50 text-emerald-700";

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${classe}`}>
      {situacao}
    </span>
  );
}

export function EspelhoPontoOcorrenciasInterativa({
  ocorrencias,
}: {
  ocorrencias: OcorrenciaVisualizacaoInterativa[];
}) {
  const [selecionadaId, setSelecionadaId] = useState(ocorrencias[0]?.id ?? "");
  const selecionada =
    ocorrencias.find((ocorrencia) => ocorrencia.id === selecionadaId) ??
    ocorrencias[0] ??
    null;

  return (
    <div className="grid min-h-[22rem] gap-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 overflow-x-auto">
        <div className="px-3 py-2">
          <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">
            Lista de ocorrências{" "}
            <span className="font-medium text-slate-500">
              ({ocorrencias.length} registros)
            </span>
          </h3>
        </div>
        <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0 text-left text-[11px]">
          <colgroup>
            <col className="w-[6.5rem]" />
            <col className="w-[4rem]" />
            <col className="w-[8rem]" />
            <col className="w-[7rem]" />
            <col className="w-[5rem]" />
            <col className="w-[7rem]" />
            <col />
            <col className="w-[4rem]" />
          </colgroup>
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <tr>
              <th className="border-b px-3 py-2 font-bold">Data</th>
              <th className="border-b px-3 py-2 font-bold">Dia</th>
              <th className="border-b px-3 py-2 font-bold">Tipo</th>
              <th className="border-b px-3 py-2 font-bold">Período</th>
              <th className="border-b px-3 py-2 font-bold">Duração</th>
              <th className="border-b px-3 py-2 font-bold">Situação</th>
              <th className="border-b px-3 py-2 font-bold">
                Justificativa / observação
              </th>
              <th className="border-b px-3 py-2 text-right font-bold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {ocorrencias.map((ocorrencia) => {
              const selecionadaAtual = ocorrencia.id === selecionada?.id;

              return (
                <tr
                  key={ocorrencia.id}
                  data-espelho-row
                  data-search={textoNormalizado(
                    [
                      formatarDataCompletaReferenciaUtc(
                        ocorrencia.dataReferencia,
                      ),
                      ocorrencia.dia,
                      ocorrencia.tipoLabel,
                      ocorrencia.periodo,
                      ocorrencia.situacao,
                      ocorrencia.justificativa,
                    ].join(" "),
                  )}
                  onClick={() => setSelecionadaId(ocorrencia.id)}
                  className={`cursor-pointer border-b odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/70 dark:odd:bg-slate-950 dark:even:bg-slate-900/40 ${
                    selecionadaAtual ? "bg-blue-50/90 ring-1 ring-inset ring-blue-200" : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-1.5 font-medium">
                    {formatarDataCompletaReferenciaUtc(
                      ocorrencia.dataReferencia,
                    )}
                  </td>
                  <td className="px-3 py-1.5">{ocorrencia.dia.slice(0, 3)}</td>
                  <td className="px-3 py-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${corTipoOcorrencia(
                        ocorrencia.tipo,
                      )}`}
                    >
                      <IconeTipoOcorrencia tipo={ocorrencia.tipo} />
                      {ocorrencia.tipoLabel}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">{ocorrencia.periodo}</td>
                  <td className="px-3 py-1.5 font-mono font-bold text-orange-600">
                    {minutosParaTexto(ocorrencia.duracaoMinutos)}
                  </td>
                  <td className="px-3 py-1.5">
                    <BadgeSituacaoOcorrencia situacao={ocorrencia.situacao} />
                  </td>
                  <td className="truncate px-3 py-1.5">
                    {ocorrencia.justificativa}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelecionadaId(ocorrencia.id);
                      }}
                      className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                      aria-label="Ver detalhes da ocorrência"
                    >
                      <MoreVertical className="size-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {ocorrencias.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-8 text-center text-sm text-slate-500"
                >
                  Nenhuma ocorrência encontrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <aside className="border-l border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">
            Detalhes da ocorrência
          </h3>
          <div className="flex items-center gap-2">
            {selecionada ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${corTipoOcorrencia(
                  selecionada.tipo,
                )}`}
              >
                <IconeTipoOcorrencia tipo={selecionada.tipo} />
                {selecionada.tipoLabel}
              </span>
            ) : null}
            <button
              type="button"
              className="inline-flex size-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Fechar detalhes da ocorrência"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {selecionada ? (
          <div className="space-y-3 text-xs">
            <span
              className={`inline-flex size-11 items-center justify-center rounded-full ${corTipoOcorrencia(
                selecionada.tipo,
              )}`}
            >
              <IconeTipoOcorrencia tipo={selecionada.tipo} className="size-5" />
            </span>
            {[
              [
                "Data",
                `${formatarDataCompletaReferenciaUtc(selecionada.dataReferencia)} (${selecionada.dia})`,
              ],
              ["Período", selecionada.periodo],
              ["Duração", minutosParaTexto(selecionada.duracaoMinutos)],
              ["Situação", selecionada.situacao],
              ["Origem", selecionada.origem],
              ...(selecionada.solicitacaoNumero
                ? [["Solicitação", selecionada.solicitacaoNumero]]
                : []),
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-2 border-b border-slate-100 pb-2 dark:border-slate-800"
              >
                <span className="font-semibold text-slate-500">{label}</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {label === "Situação" ? (
                    <BadgeSituacaoOcorrencia situacao={value} />
                  ) : (
                    value
                  )}
                </span>
              </div>
            ))}
            <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <p className="mb-1 font-semibold text-slate-500">Justificativa</p>
              <p className="leading-4 text-slate-700 dark:text-slate-200">
                {selecionada.justificativa}
              </p>
            </div>
            <div>
              <p className="mb-1 font-semibold text-slate-500">Observações</p>
              <p className="leading-4 text-slate-700 dark:text-slate-200">
                {selecionada.observacoes}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-4">
              {selecionada.hrefEditar ? (
                <a
                  href={selecionada.hrefEditar}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-blue-300 px-3 text-xs font-bold text-blue-700 dark:border-blue-900 dark:text-blue-300"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  Editar
                </a>
              ) : null}
              {selecionada.hrefSolicitar ? (
                <a
                  href={selecionada.hrefSolicitar}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-blue-700 px-3 text-xs font-bold text-white"
                >
                  <Check className="size-4" aria-hidden="true" />
                  Solicitar autorização
                </a>
              ) : null}
              {selecionada.solicitacaoId && selecionada.podeExcluir ? (
                <form
                  action={excluirSolicitacaoAction.bind(
                    null,
                    selecionada.solicitacaoId,
                  )}
                  className="col-span-2"
                >
                  <button
                    type="submit"
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-xs font-bold text-red-700 dark:border-red-900 dark:text-red-300"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Excluir ocorrência
                  </button>
                </form>
              ) : null}
              {selecionada.solicitacaoId && !selecionada.podeExcluir ? (
                <p className="col-span-2 rounded-md bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
                  Exclusão indisponível após deliberação da chefia.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Selecione uma ocorrência para visualizar os detalhes.
          </p>
        )}
      </aside>
    </div>
  );
}

export type SolicitacaoHistoricoEspelho = {
  id: string;
  tipo: string;
  status: string;
  titulo: string;
  descricao: string;
  dataReferencia: Date | string | null;
  dataInicio: Date | string | null;
  dataFim: Date | string | null;
  criadoEm: Date | string;
  analisadaEm?: Date | string | null;
  justificativaAnalise?: string | null;
  usuarioSolicitante?: { nome?: string | null } | null;
  analisadaPor?: { nome?: string | null } | null;
  anexos?: {
    id: string;
    nomeOriginal: string;
    tamanhoBytes: number;
  }[];
  eventos?: {
    id: string;
    tipo: string;
    descricao: string;
    criadoEm: Date | string;
    usuario?: { nome?: string | null } | null;
  }[];
};

function numeroSolicitacao(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

function formatarDataHora(valor: Date | string | null | undefined) {
  if (!valor) {
    return "-";
  }

  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function dataAfetada(solicitacao: SolicitacaoHistoricoEspelho) {
  return (
    solicitacao.dataReferencia ??
    solicitacao.dataInicio ??
    solicitacao.dataFim ??
    solicitacao.criadoEm
  );
}

function statusHistorico(status: string) {
  const rotulos: Record<string, string> = {
    RASCUNHO: "Em análise",
    ENVIADA: "Em análise",
    EM_ANALISE: "Em análise",
    DEFERIDA: "Aprovado",
    INDEFERIDA: "Reprovado",
    CANCELADA: "Cancelado",
  };

  return rotulos[status] ?? status;
}

function tamanhoArquivo(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "-";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ResumoHistorico({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "green" | "amber" | "red" | "slate";
}) {
  const classes = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <div className={`rounded-md border border-slate-100 p-3 ${classes}`}>
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="mt-1 text-xs font-semibold">{label}</p>
    </div>
  );
}

export function EspelhoPontoHistoricoAjustesInterativo({
  solicitacoes,
}: {
  solicitacoes: SolicitacaoHistoricoEspelho[];
}) {
  const [selecionadaId, setSelecionadaId] = useState(solicitacoes[0]?.id ?? "");
  const selecionada =
    solicitacoes.find((solicitacao) => solicitacao.id === selecionadaId) ??
    solicitacoes[0] ??
    null;
  const aprovadas = solicitacoes.filter((item) => item.status === "DEFERIDA").length;
  const emAnalise = solicitacoes.filter((item) =>
    ["ENVIADA", "EM_ANALISE", "RASCUNHO"].includes(item.status),
  ).length;
  const reprovadas = solicitacoes.filter((item) => item.status === "INDEFERIDA").length;
  const canceladas = solicitacoes.filter((item) => item.status === "CANCELADA").length;

  return (
    <div>
      <div className="grid gap-2 border-b border-slate-100 p-3 md:grid-cols-5 dark:border-slate-800">
        <ResumoHistorico label="Ajustes realizados" value={solicitacoes.length} tone="blue" />
        <ResumoHistorico label="Aprovados" value={aprovadas} tone="green" />
        <ResumoHistorico label="Em análise" value={emAnalise} tone="amber" />
        <ResumoHistorico label="Reprovados" value={reprovadas} tone="red" />
        <ResumoHistorico label="Cancelado" value={canceladas} tone="slate" />
      </div>

      <div className="grid min-h-[24rem] lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[840px] table-fixed border-separate border-spacing-0 text-left text-[11px]">
            <colgroup>
              <col className="w-[8.5rem]" />
              <col className="w-[7rem]" />
              <col className="w-[9rem]" />
              <col className="w-[8rem]" />
              <col className="w-[7rem]" />
              <col className="w-[9rem]" />
              <col className="w-8" />
            </colgroup>
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <tr>
                <th className="border-b px-3 py-2 font-bold">Data solicitação</th>
                <th className="border-b px-3 py-2 font-bold">Período</th>
                <th className="border-b px-3 py-2 font-bold">Tipo de ajuste</th>
                <th className="border-b px-3 py-2 font-bold">Data afetada</th>
                <th className="border-b px-3 py-2 font-bold">Status</th>
                <th className="border-b px-3 py-2 font-bold">Aprovado por</th>
                <th className="border-b px-3 py-2 text-right font-bold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {solicitacoes.map((solicitacao) => {
                const selecionadaAtual = solicitacao.id === selecionada?.id;
                const textoBusca = textoNormalizado(
                  [
                    numeroSolicitacao(solicitacao.id),
                    solicitacao.titulo,
                    solicitacao.descricao,
                    rotuloTipoSolicitacao(solicitacao.tipo),
                    statusHistorico(solicitacao.status),
                    solicitacao.usuarioSolicitante?.nome,
                    solicitacao.analisadaPor?.nome,
                  ].join(" "),
                );

                return (
                  <tr
                    key={solicitacao.id}
                    data-espelho-row
                    data-search={textoBusca}
                    onClick={() => setSelecionadaId(solicitacao.id)}
                    className={`cursor-pointer odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/70 dark:odd:bg-slate-950 dark:even:bg-slate-900/40 ${
                      selecionadaAtual ? "bg-blue-50/90 ring-1 ring-inset ring-blue-200" : ""
                    }`}
                  >
                    <td className="px-3 py-1.5 font-medium">{formatarDataHora(solicitacao.criadoEm)}</td>
                    <td className="px-3 py-1.5">
                      {solicitacao.dataInicio && solicitacao.dataFim
                        ? "Intervalo"
                        : "Dia inteiro"}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        {rotuloTipoSolicitacao(solicitacao.tipo)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">{formatarDataCompletaReferenciaUtc(dataAfetada(solicitacao))}</td>
                    <td className="px-3 py-1.5">
                      <BadgeSituacaoOcorrencia situacao={statusHistorico(solicitacao.status)} />
                    </td>
                    <td className="truncate px-3 py-1.5">
                      {solicitacao.analisadaPor?.nome ?? "-"}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelecionadaId(solicitacao.id);
                        }}
                        className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                        aria-label="Ver detalhes do ajuste"
                      >
                        <MoreVertical className="size-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {solicitacoes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-500">
                    Nenhum ajuste encontrado nesta competência.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <aside className="border-l border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">
              Detalhes do ajuste
            </h3>
            <button
              type="button"
              className="inline-flex size-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Fechar detalhes do ajuste"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {selecionada ? (
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-slate-50">
                  {rotuloTipoSolicitacao(selecionada.tipo)}
                </p>
                <p className="font-semibold text-slate-500">
                  Solicitação {numeroSolicitacao(selecionada.id)}
                </p>
              </div>
              {[
                ["Data da solicitação", formatarDataHora(selecionada.criadoEm)],
                ["Solicitado por", selecionada.usuarioSolicitante?.nome ?? "-"],
                ["Data afetada", formatarDataCompletaReferenciaUtc(dataAfetada(selecionada))],
                ["Período", selecionada.dataInicio && selecionada.dataFim ? `${formatarDataHora(selecionada.dataInicio)} - ${formatarDataHora(selecionada.dataFim)}` : "Dia inteiro"],
                ["Status", statusHistorico(selecionada.status)],
                ["Aprovado por", selecionada.analisadaPor?.nome ?? "-"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2 border-b border-slate-100 pb-2 dark:border-slate-800"
                >
                  <span className="font-semibold text-slate-500">{label}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {label === "Status" ? (
                      <BadgeSituacaoOcorrencia situacao={value} />
                    ) : (
                      value
                    )}
                  </span>
                </div>
              ))}
              <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-900">
                <p className="mb-1 font-semibold text-slate-500">Justificativa</p>
                <p className="leading-4 text-slate-700 dark:text-slate-200">
                  {selecionada.descricao}
                </p>
              </div>
              {selecionada.anexos && selecionada.anexos.length > 0 ? (
                <div>
                  <p className="mb-1 font-semibold text-slate-500">Anexos</p>
                  <div className="space-y-1">
                    {selecionada.anexos.map((anexo) => (
                      <a
                        key={anexo.id}
                        href={`/api/solicitacoes/${selecionada.id}/anexos/${anexo.id}`}
                        className="block rounded-md border border-slate-100 px-2 py-1 font-semibold text-blue-700"
                      >
                        {anexo.nomeOriginal}
                        <span className="ml-1 text-slate-400">
                          {tamanhoArquivo(anexo.tamanhoBytes)}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2 pt-3">
                {!["DEFERIDA", "INDEFERIDA"].includes(selecionada.status) ? (
                  <a
                    href={`/solicitacoes/${selecionada.id}/editar`}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-blue-300 px-3 text-xs font-bold text-blue-700 dark:border-blue-900 dark:text-blue-300"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Editar solicitação
                  </a>
                ) : null}
                <a
                  href={`/solicitacoes/nova?tipo=${selecionada.tipo}&dataReferencia=${chaveDataReferenciaHistorico(dataAfetada(selecionada))}`}
                  className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-bold text-slate-700 dark:border-slate-800 dark:text-slate-200 ${
                    ["DEFERIDA", "INDEFERIDA"].includes(selecionada.status)
                      ? "col-span-2"
                      : ""
                  }`}
                >
                  Nova similar
                </a>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Selecione um ajuste para visualizar os detalhes.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function chaveDataReferenciaHistorico(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  return [
    data.getUTCFullYear(),
    String(data.getUTCMonth() + 1).padStart(2, "0"),
    String(data.getUTCDate()).padStart(2, "0"),
  ].join("-");
}
