"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Loader2,
  Send,
  Settings2,
} from "lucide-react";
import { criarSolicitacaoAction } from "../../application/actions/criar-solicitacao.action";
import {
  diasSemanaRegimeHibrido,
  modalidadesCapacitacao,
  tiposCompensacaoBancoHoras,
  tiposMarcacaoAjuste,
  tiposSolicitacao,
  type CriarSolicitacaoFormState,
} from "../../application/schemas/solicitacao.schema";
import { rotuloTipoSolicitacao } from "../../application/services/fluxo-solicitacao.service";

const estadoInicial: CriarSolicitacaoFormState = {
  sucesso: false,
  mensagem: null,
};

const etapas = [
  {
    id: "tipo",
    titulo: "Tipo",
    descricao: "Natureza do pedido",
    icon: ClipboardCheck,
    campos: ["tipo"],
  },
  {
    id: "periodo",
    titulo: "Periodo",
    descricao: "Data e horarios",
    icon: CalendarDays,
    campos: ["dataReferencia", "dataInicio", "dataFim"],
  },
  {
    id: "detalhes",
    titulo: "Detalhes",
    descricao: "Dados especificos",
    icon: Settings2,
    campos: [
      "tipoMarcacao",
      "horaAjuste",
      "tipoCompensacao",
      "horasSolicitadas",
      "regimeTrabalhoRemotoTipo",
      "diasRemotos",
      "modalidadeCapacitacao",
    ],
  },
  {
    id: "justificativa",
    titulo: "Justificativa",
    descricao: "Resumo e fundamento",
    icon: FileText,
    campos: ["titulo", "descricao"],
  },
] as const;

type EtapaIndice = 0 | 1 | 2 | 3;

function erro(estado: CriarSolicitacaoFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

function primeiraEtapaComErro(estado: CriarSolicitacaoFormState) {
  const camposComErro = Object.keys(estado.erros ?? {});

  if (camposComErro.length === 0) {
    return null;
  }

  const indice = etapas.findIndex((etapa) =>
    etapa.campos.some((campo) => camposComErro.includes(campo)),
  );

  return indice >= 0 ? (indice as EtapaIndice) : null;
}

function isTipoPeriodo(tipo: string) {
  return [
    "COMPENSACAO",
    "HORA_CREDITO_PREVIA",
    "ABONO_JUSTIFICATIVA",
    "ATIVIDADE_EXTERNA",
    "VIAGEM_SERVICO",
    "CAPACITACAO",
    "DISPENSA_PONTO",
    "FOLGA_BANCO_HORAS",
  ].includes(tipo);
}

function usaPeriodoPorData(tipo: string) {
  return [
    "COMPENSACAO",
    "ABONO_JUSTIFICATIVA",
    "VIAGEM_SERVICO",
    "FOLGA_BANCO_HORAS",
  ].includes(tipo);
}

function obterConfiguracaoTipo(tipo: string) {
  const configuracoes: Record<
    string,
    {
      resumo: string;
      periodo: "DATA_REFERENCIA" | "INTERVALO";
      detalhes:
        | "AJUSTE"
        | "BANCO_HORAS"
        | "REMOTO"
        | "CAPACITACAO"
        | "SIMPLES";
    }
  > = {
    AJUSTE_PONTO: {
      resumo:
        "Use para corrigir uma entrada, saida ou retorno que nao foi capturado corretamente.",
      periodo: "DATA_REFERENCIA",
      detalhes: "AJUSTE",
    },
    COMPENSACAO: {
      resumo:
        "Use para solicitar autorizacao de compensacao vinculada ao banco de horas.",
      periodo: "INTERVALO",
      detalhes: "BANCO_HORAS",
    },
    HORA_CREDITO_PREVIA: {
      resumo:
        "Use para solicitar autorizacao previa de horas que poderao gerar credito.",
      periodo: "INTERVALO",
      detalhes: "BANCO_HORAS",
    },
    FOLGA_BANCO_HORAS: {
      resumo:
        "Use para solicitar folga futura com base no saldo de banco de horas.",
      periodo: "INTERVALO",
      detalhes: "BANCO_HORAS",
    },
    DISPENSA_PONTO: {
      resumo:
        "Use para registrar dispensa de ponto, teletrabalho integral ou regime hibrido.",
      periodo: "INTERVALO",
      detalhes: "REMOTO",
    },
    CAPACITACAO: {
      resumo:
        "Use para registrar capacitacao autorizada; capacitacao interna exige registro biometrico no dia.",
      periodo: "INTERVALO",
      detalhes: "CAPACITACAO",
    },
  };

  return (
    configuracoes[tipo] ?? {
      resumo:
        "Use para registrar evento autorizado que impacta a frequencia no periodo informado.",
      periodo: "INTERVALO",
      detalhes: "SIMPLES",
    }
  );
}

function validarEtapaFormulario(etapa: number, formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "AJUSTE_PONTO");
  const falhas: string[] = [];

  if (etapa === 0 && !tipo) {
    falhas.push("Selecione o tipo da solicitacao.");
  }

  if (etapa === 1) {
    if (tipo === "AJUSTE_PONTO" && !formData.get("dataReferencia")) {
      falhas.push("Informe a data do ajuste.");
    }

    if (isTipoPeriodo(tipo)) {
      if (!formData.get("dataInicio")) {
        falhas.push("Informe o inicio do periodo.");
      }

      if (!formData.get("dataFim")) {
        falhas.push("Informe o fim do periodo.");
      }
    }
  }

  if (etapa === 2) {
    if (tipo === "AJUSTE_PONTO") {
      if (!formData.get("tipoMarcacao")) {
        falhas.push("Selecione a marcacao a ajustar.");
      }

      if (!formData.get("horaAjuste")) {
        falhas.push("Informe o horario solicitado.");
      }
    }

    if (tipo === "HORA_CREDITO_PREVIA") {
      if (!formData.get("horasSolicitadas")) {
        falhas.push("Informe a quantidade de horas.");
      }
    }

    if (tipo === "COMPENSACAO" && !formData.get("tipoCompensacao")) {
      falhas.push("Informe a modalidade da compensacao.");
    }

    if (tipo === "CAPACITACAO" && !formData.get("modalidadeCapacitacao")) {
      falhas.push("Informe se a capacitacao e interna ou externa.");
    }

    if (
      tipo === "DISPENSA_PONTO" &&
      formData.get("regimeTrabalhoRemotoTipo") === "HIBRIDO" &&
      formData.getAll("diasRemotos").length === 0
    ) {
      falhas.push("Informe ao menos um dia remoto.");
    }
  }

  if (etapa === 3) {
    const titulo = String(formData.get("titulo") ?? "").trim();
    const descricao = String(formData.get("descricao") ?? "").trim();

    if (titulo.length < 5) {
      falhas.push("Informe um titulo com pelo menos 5 caracteres.");
    }

    if (descricao.length < 10) {
      falhas.push("Descreva a solicitacao com mais detalhes.");
    }
  }

  return falhas;
}

function StepperSolicitacao({
  etapaAtual,
  setEtapaAtual,
  etapaMaxima,
  etapaComErro,
}: {
  etapaAtual: number;
  setEtapaAtual: (etapa: EtapaIndice) => void;
  etapaMaxima: number;
  etapaComErro: number | null;
}) {
  return (
    <nav
      aria-label="Progresso da solicitacao"
      className="rounded-lg border bg-[var(--card)] p-4 shadow-sm"
    >
      <ol className="grid gap-3 md:grid-cols-4">
        {etapas.map((etapa, indice) => {
          const Icon = etapa.icon;
          const concluida = indice < etapaAtual;
          const ativa = indice === etapaAtual;
          const liberada = indice <= etapaMaxima;
          const comErro = etapaComErro === indice;
          const linhaAnteriorAtiva = indice <= etapaAtual;
          const linhaProximaAtiva = indice < etapaAtual;

          return (
            <li key={etapa.id} className="min-w-0">
              <button
                type="button"
                onClick={() => liberada && setEtapaAtual(indice as EtapaIndice)}
                disabled={!liberada}
                className={`group flex w-full flex-col gap-3 rounded-md p-2 text-left transition ${
                  ativa
                    ? "bg-blue-50 text-blue-950 dark:bg-blue-950 dark:text-blue-100"
                    : "hover:bg-[var(--muted)]"
                } ${!liberada ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <span className="flex w-full items-center gap-2">
                  {indice > 0 && (
                    <span
                      aria-hidden="true"
                      className={`h-0.5 min-w-4 flex-1 rounded-full transition-colors ${
                        linhaAnteriorAtiva
                          ? "bg-blue-900 dark:bg-blue-300"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  )}

                  <span
                    className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold shadow-sm transition-colors ${
                      comErro
                        ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                        : concluida
                          ? "border-blue-900 bg-blue-900 text-white dark:border-blue-300 dark:bg-blue-300 dark:text-blue-950"
                          : ativa
                            ? "border-blue-900 bg-white text-blue-900 dark:border-blue-300 dark:bg-blue-950 dark:text-blue-200"
                            : "border-slate-300 bg-[var(--card)] text-[var(--muted-foreground)] group-hover:border-slate-400 dark:border-slate-700"
                    }`}
                  >
                    {concluida ? (
                      <Check className="size-5" aria-hidden="true" />
                    ) : (
                      <Icon className="size-5" aria-hidden="true" />
                    )}
                  </span>

                  {indice < etapas.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={`h-0.5 min-w-4 flex-1 rounded-full transition-colors ${
                        linhaProximaAtiva
                          ? "bg-blue-900 dark:bg-blue-300"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  )}
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-5">
                    {etapa.titulo}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">
                    {etapa.descricao}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SolicitacaoForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [estado, formAction, pendente] = useActionState(
    criarSolicitacaoAction,
    estadoInicial,
  );
  const campos = estado.campos;
  const [etapaAtual, setEtapaAtual] = useState<EtapaIndice>(0);
  const [etapaMaxima, setEtapaMaxima] = useState(0);
  const [falhasEtapa, setFalhasEtapa] = useState<string[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>(
    campos?.tipo ?? "AJUSTE_PONTO",
  );
  const [tipoMarcacao, setTipoMarcacao] = useState<string>(
    campos?.tipoMarcacao ?? "",
  );
  const [tipoCompensacao, setTipoCompensacao] = useState<string>(
    campos?.tipoCompensacao ?? "UTILIZAR_CREDITO",
  );
  const [regimeRemoto, setRegimeRemoto] = useState<string>(
    campos?.regimeTrabalhoRemotoTipo ?? "NAO_SE_APLICA",
  );
  const [diasRemotos, setDiasRemotos] = useState<string[]>(
    campos?.diasRemotos ?? [],
  );
  const [modalidadeCapacitacao, setModalidadeCapacitacao] = useState<string>(
    campos?.modalidadeCapacitacao ?? "EXTERNA",
  );

  const configuracaoTipo = obterConfiguracaoTipo(tipoSelecionado);
  const exigePeriodo = configuracaoTipo.periodo === "INTERVALO";
  const etapaErroServidor = useMemo(
    () => primeiraEtapaComErro(estado),
    [estado],
  );

  /* eslint-disable react-hooks/set-state-in-effect -- Server action state restores the failed step and controlled selects after validation errors. */
  useEffect(() => {
    if (etapaErroServidor !== null) {
      setEtapaAtual(etapaErroServidor);
      setEtapaMaxima((atual) => Math.max(atual, etapaErroServidor));
    }
  }, [etapaErroServidor]);

  useEffect(() => {
    if (!campos) {
      return;
    }

    if (campos.tipo) {
      setTipoSelecionado(campos.tipo);
    }

    setTipoMarcacao(campos.tipoMarcacao ?? "");
    setTipoCompensacao(campos.tipoCompensacao || "UTILIZAR_CREDITO");
    setRegimeRemoto(campos.regimeTrabalhoRemotoTipo ?? "NAO_SE_APLICA");
    setDiasRemotos(campos.diasRemotos ?? []);
    setModalidadeCapacitacao(campos.modalidadeCapacitacao || "EXTERNA");
  }, [campos]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function avancar() {
    const form = formRef.current;

    if (!form) {
      return;
    }

    const falhas = validarEtapaFormulario(etapaAtual, new FormData(form));
    setFalhasEtapa(falhas);

    if (falhas.length > 0) {
      return;
    }

    const proxima = Math.min(etapaAtual + 1, etapas.length - 1) as EtapaIndice;
    setEtapaAtual(proxima);
    setEtapaMaxima((atual) => Math.max(atual, proxima));
  }

  function voltar() {
    setFalhasEtapa([]);
    setEtapaAtual((atual) => Math.max(atual - 1, 0) as EtapaIndice);
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <StepperSolicitacao
        etapaAtual={etapaAtual}
        setEtapaAtual={setEtapaAtual}
        etapaMaxima={etapaMaxima}
        etapaComErro={etapaErroServidor}
      />

      {(estado.mensagem || falhasEtapa.length > 0) && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {estado.mensagem && <p>{estado.mensagem}</p>}
          {falhasEtapa.length > 0 && (
            <ul className="space-y-1">
              {falhasEtapa.map((falha) => (
                <li key={falha}>{falha}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <section
        className={`rounded-lg border bg-[var(--card)] p-5 shadow-sm ${
          etapaAtual === 0 ? "block" : "hidden"
        }`}
      >
        <div className="max-w-3xl space-y-2">
          <h2 className="text-lg font-bold">Tipo de solicitacao</h2>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Escolha a natureza do pedido para abrir apenas os campos aplicaveis.
          </p>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="tipo" className="text-sm font-semibold">
              Tipo
            </label>
            <select
              id="tipo"
              name="tipo"
              value={tipoSelecionado}
              onChange={(event) => {
                setTipoSelecionado(event.target.value);
                if (event.target.value !== "DISPENSA_PONTO") {
                  setRegimeRemoto("NAO_SE_APLICA");
                  setDiasRemotos([]);
                }
              }}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
              required
            >
              {tiposSolicitacao.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {rotuloTipoSolicitacao(tipo)}
                </option>
              ))}
            </select>
            {erro(estado, "tipo") && (
              <p className="text-sm text-red-600">{erro(estado, "tipo")}</p>
            )}
          </div>

          <div className="rounded-lg border bg-[var(--muted)] p-4 text-sm leading-6 text-[var(--muted-foreground)] md:col-span-2">
            {configuracaoTipo.resumo}
          </div>
        </div>
      </section>

      <section
        className={`rounded-lg border bg-[var(--card)] p-5 shadow-sm ${
          etapaAtual === 1 ? "block" : "hidden"
        }`}
      >
        <div className="max-w-3xl space-y-2">
          <h2 className="text-lg font-bold">Periodo de incidencia</h2>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Para ajuste pontual, informe a data de referencia; para eventos por
            periodo, informe inicio e fim.
          </p>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {configuracaoTipo.periodo === "DATA_REFERENCIA" ? (
            <div className="space-y-2">
              <label htmlFor="dataReferencia" className="text-sm font-semibold">
                Data de referencia
              </label>
              <input
                id="dataReferencia"
                name="dataReferencia"
                type="date"
                defaultValue={campos?.dataReferencia ?? ""}
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                aria-required
              />
              {erro(estado, "dataReferencia") && (
                <p className="text-sm text-red-600">
                  {erro(estado, "dataReferencia")}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="dataInicio" className="text-sm font-semibold">
                  {usaPeriodoPorData(tipoSelecionado)
                    ? "Data inicial"
                    : "Data/hora inicial"}
                </label>
                <input
                  id="dataInicio"
                  name="dataInicio"
                  type={
                    usaPeriodoPorData(tipoSelecionado)
                      ? "date"
                      : "datetime-local"
                  }
                  defaultValue={campos?.dataInicio ?? ""}
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                  aria-required={exigePeriodo}
                />
                {erro(estado, "dataInicio") && (
                  <p className="text-sm text-red-600">
                    {erro(estado, "dataInicio")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="dataFim" className="text-sm font-semibold">
                  {usaPeriodoPorData(tipoSelecionado)
                    ? "Data final"
                    : "Data/hora final"}
                </label>
                <input
                  id="dataFim"
                  name="dataFim"
                  type={
                    usaPeriodoPorData(tipoSelecionado)
                      ? "date"
                      : "datetime-local"
                  }
                  defaultValue={campos?.dataFim ?? ""}
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                  aria-required={exigePeriodo}
                />
                {erro(estado, "dataFim") && (
                  <p className="text-sm text-red-600">{erro(estado, "dataFim")}</p>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <section
        className={`rounded-lg border bg-[var(--card)] p-5 shadow-sm ${
          etapaAtual === 2 ? "block" : "hidden"
        }`}
      >
        <div className="max-w-3xl space-y-2">
          <h2 className="text-lg font-bold">Dados especificos</h2>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Complete apenas o bloco correspondente ao tipo selecionado.
          </p>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {configuracaoTipo.detalhes === "AJUSTE" && (
            <>
              <div className="space-y-2">
                <label htmlFor="tipoMarcacao" className="text-sm font-semibold">
                  Tipo de marcacao para ajuste
                </label>
                <select
                  id="tipoMarcacao"
                  name="tipoMarcacao"
                  value={tipoMarcacao}
                  onChange={(event) => setTipoMarcacao(event.target.value)}
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                >
                  <option value="">Selecione</option>
                  {tiposMarcacaoAjuste.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
                {erro(estado, "tipoMarcacao") && (
                  <p className="text-sm text-red-600">
                    {erro(estado, "tipoMarcacao")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="horaAjuste" className="text-sm font-semibold">
                  Hora solicitada
                </label>
                <input
                  id="horaAjuste"
                  name="horaAjuste"
                  type="time"
                  defaultValue={campos?.horaAjuste ?? ""}
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                />
                {erro(estado, "horaAjuste") && (
                  <p className="text-sm text-red-600">
                    {erro(estado, "horaAjuste")}
                  </p>
                )}
              </div>
            </>
          )}

          {configuracaoTipo.detalhes === "BANCO_HORAS" && (
            <>
              {tipoSelecionado === "COMPENSACAO" && (
                <div className="space-y-2">
                  <label htmlFor="tipoCompensacao" className="text-sm font-semibold">
                    Modalidade da compensacao
                  </label>
                  <select
                    id="tipoCompensacao"
                    name="tipoCompensacao"
                    value={tipoCompensacao}
                    onChange={(event) => setTipoCompensacao(event.target.value)}
                    className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                  >
                    {tiposCompensacaoBancoHoras.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo === "UTILIZAR_CREDITO"
                          ? "Utilizar credito para compensar debito"
                          : "Trabalhar horas para compensar debito"}
                      </option>
                    ))}
                  </select>
                  {erro(estado, "tipoCompensacao") && (
                    <p className="text-sm text-red-600">
                      {erro(estado, "tipoCompensacao")}
                    </p>
                  )}
                </div>
              )}

              {tipoSelecionado === "HORA_CREDITO_PREVIA" ? (
                <div className="space-y-2">
                  <label
                    htmlFor="horasSolicitadas"
                    className="text-sm font-semibold"
                  >
                    Quantidade de horas
                  </label>
                  <input
                    id="horasSolicitadas"
                    name="horasSolicitadas"
                    type="number"
                    min="0.25"
                    max="16"
                    step="0.25"
                    defaultValue={campos?.horasSolicitadas ?? ""}
                    className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                  />
                  {erro(estado, "horasSolicitadas") && (
                    <p className="text-sm text-red-600">
                      {erro(estado, "horasSolicitadas")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border bg-[var(--muted)] p-4 text-sm leading-6 text-[var(--muted-foreground)] md:col-span-2">
                  O sistema calculara os minutos aplicaveis a partir do periodo
                  informado e das pendencias/reflexos da apuracao.
                </div>
              )}
            </>
          )}

          {configuracaoTipo.detalhes === "REMOTO" && (
            <div className="space-y-4 rounded-lg border bg-[var(--muted)] p-4 md:col-span-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="regimeTrabalhoRemotoTipo"
                    className="text-sm font-semibold"
                  >
                    Regime remoto
                  </label>
                  <select
                    id="regimeTrabalhoRemotoTipo"
                    name="regimeTrabalhoRemotoTipo"
                    value={regimeRemoto}
                    onChange={(event) => {
                      setRegimeRemoto(event.target.value);
                      if (event.target.value !== "HIBRIDO") {
                        setDiasRemotos([]);
                      }
                    }}
                    className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                  >
                    <option value="NAO_SE_APLICA">Dispensa sem teletrabalho</option>
                    <option value="TOTAL">Teletrabalho 100%</option>
                    <option value="HIBRIDO">Regime hibrido</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Dias remotos</p>
                  <div className="flex flex-wrap gap-2">
                    {diasSemanaRegimeHibrido.map((dia) => (
                      <label
                        key={dia}
                        className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${
                          regimeRemoto === "HIBRIDO"
                            ? "bg-[var(--card)]"
                            : "cursor-not-allowed opacity-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="diasRemotos"
                          value={dia}
                          checked={diasRemotos.includes(dia)}
                          onChange={(event) => {
                            setDiasRemotos((atuais) =>
                              event.target.checked
                                ? [...atuais, dia]
                                : atuais.filter((item) => item !== dia),
                            );
                          }}
                          disabled={regimeRemoto !== "HIBRIDO"}
                          className="size-4 accent-blue-900"
                        />
                        {rotuloDiaSemana(dia)}
                      </label>
                    ))}
                  </div>
                  {erro(estado, "diasRemotos") && (
                    <p className="text-sm text-red-600">
                      {erro(estado, "diasRemotos")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {configuracaoTipo.detalhes === "CAPACITACAO" && (
            <div className="space-y-4 rounded-lg border bg-[var(--muted)] p-4 md:col-span-2">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="modalidadeCapacitacao"
                    className="text-sm font-semibold"
                  >
                    Modalidade da capacitacao
                  </label>
                  <select
                    id="modalidadeCapacitacao"
                    name="modalidadeCapacitacao"
                    value={modalidadeCapacitacao}
                    onChange={(event) =>
                      setModalidadeCapacitacao(event.target.value)
                    }
                    className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                  >
                    {modalidadesCapacitacao.map((modalidade) => (
                      <option key={modalidade} value={modalidade}>
                        {modalidade === "EXTERNA"
                          ? "Capacitacao externa"
                          : "Capacitacao interna"}
                      </option>
                    ))}
                  </select>
                  {erro(estado, "modalidadeCapacitacao") && (
                    <p className="text-sm text-red-600">
                      {erro(estado, "modalidadeCapacitacao")}
                    </p>
                  )}
                </div>

                <div className="rounded-md border bg-[var(--card)] p-3 text-sm leading-6 text-[var(--muted-foreground)]">
                  {modalidadeCapacitacao === "INTERNA"
                    ? "A capacitacao interna sera considerada apenas quando houver registro biometrico no dia."
                    : "Capacitacao externa com quatro horas ou mais cobre a jornada; abaixo disso exige complementacao."}
                </div>
              </div>
            </div>
          )}

          {configuracaoTipo.detalhes === "SIMPLES" && (
            <div className="rounded-lg border bg-[var(--muted)] p-4 text-sm text-[var(--muted-foreground)] md:col-span-2">
              Este tipo usa apenas periodo, titulo e justificativa.
            </div>
          )}
        </div>
      </section>

      <section
        className={`rounded-lg border bg-[var(--card)] p-5 shadow-sm ${
          etapaAtual === 3 ? "block" : "hidden"
        }`}
      >
        <div className="max-w-3xl space-y-2">
          <h2 className="text-lg font-bold">Justificativa e envio</h2>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Registre um titulo objetivo e a justificativa que sera analisada pela chefia.
          </p>
        </div>

        <div className="mt-5 grid gap-5">
          <div className="space-y-2">
            <label htmlFor="titulo" className="text-sm font-semibold">
              Titulo
            </label>
            <input
              id="titulo"
              name="titulo"
              defaultValue={campos?.titulo ?? ""}
              placeholder="Ex.: Ajuste de ponto de entrada"
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
              required
            />
            {erro(estado, "titulo") && (
              <p className="text-sm text-red-600">{erro(estado, "titulo")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="descricao" className="text-sm font-semibold">
              Justificativa / descricao
            </label>
            <textarea
              id="descricao"
              name="descricao"
              rows={6}
              defaultValue={campos?.descricao ?? ""}
              placeholder="Explique o ocorrido de forma objetiva."
              className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
              required
            />
            {erro(estado, "descricao") && (
              <p className="text-sm text-red-600">
                {erro(estado, "descricao")}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
        <button
          type="button"
          onClick={voltar}
          disabled={etapaAtual === 0 || pendente}
          className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Voltar
        </button>

        {etapaAtual < etapas.length - 1 ? (
          <button
            type="button"
            onClick={avancar}
            disabled={pendente}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Avancar
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={pendente}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pendente ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            Enviar solicitacao
          </button>
        )}
      </div>
    </form>
  );
}

function rotuloDiaSemana(dia: string) {
  const rotulos: Record<string, string> = {
    SEGUNDA: "Seg",
    TERCA: "Ter",
    QUARTA: "Qua",
    QUINTA: "Qui",
    SEXTA: "Sex",
  };

  return rotulos[dia] ?? dia;
}
