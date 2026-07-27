"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgePercent,
  Building2,
  CheckCircle2,
  Clock3,
  FileCheck2,
  GitBranch,
  Loader2,
  Save,
} from "lucide-react";

import { configurarPoliticaHorasExtrasAction } from "../../application/actions/configurar-politica-horas-extras.action";
import type { ConfigurarPoliticaHorasExtrasFormState } from "../../application/schemas/horas-extras-politica.schema";

type OrgaoOption = {
  id: string;
  sigla: string;
  nome: string;
};

type UnidadeOption = {
  id: string;
  orgaoId: string;
  sigla: string;
  nome: string;
  orgao: {
    sigla: string;
  };
};

type EtapaHorasExtras = "escopo" | "limites" | "percentuais" | "fluxo";

type PoliticaPreview = {
  orgaoId: string;
  scopeUnitId: string;
  validFrom: string;
  maxDailyWeekdayMinutes: number;
  maxDailyWeekendHolidayMinutes: number;
  maxMonthlyMinutes: number;
  maxAnnualMinutes: number;
  divisorMinutes: number;
  rateDiaUtil: number;
  rateSabado: number;
  rateDomingo: number;
  rateFeriado: number;
};

type FluxoEtapa = {
  code: string;
  name: string;
  descricao: string;
  requiredPermission: string | null;
  obrigatoria?: boolean;
};

const estadoInicial: ConfigurarPoliticaHorasExtrasFormState = {
  sucesso: false,
};

const etapasHorasExtras: Array<{
  id: EtapaHorasExtras;
  titulo: string;
  descricao: string;
  Icone: typeof Building2;
}> = [
  {
    id: "escopo",
    titulo: "Escopo",
    descricao: "Órgão, seccional e vigência",
    Icone: Building2,
  },
  {
    id: "limites",
    titulo: "Limites",
    descricao: "Tetos diários e globais",
    Icone: Clock3,
  },
  {
    id: "percentuais",
    titulo: "Percentuais",
    descricao: "Adicionais por dia",
    Icone: BadgePercent,
  },
  {
    id: "fluxo",
    titulo: "Fluxo",
    descricao: "Revisão e publicação",
    Icone: GitBranch,
  },
];

const fluxoPadrao = [
  ["Servidor solicitante", "Registra o pedido de serviço extraordinário."],
  ["Análise da chefia", "Confere necessidade, período e justificativa."],
  ["Análise orçamentária", "Verifica disponibilidade orçamentária."],
  ["Deliberação final", "Autoriza, rejeita ou ajusta a execução."],
  ["Execução", "Acompanha horas autorizadas e realizadas."],
  ["Fechamento", "Consolida a competência para folha."],
  ["Pagamento", "Permite consulta e geração dos efeitos financeiros."],
] as const;
void fluxoPadrao;

const catalogoEtapasFluxo: FluxoEtapa[] = [
  {
    code: "SERVIDOR_SOLICITANTE",
    name: "Servidor solicitante",
    descricao: "Registra e envia o pedido de serviço extraordinário.",
    requiredPermission: "horas-extras:solicitar:proprio",
    obrigatoria: true,
  },
  {
    code: "ANALISE_CHEFIA",
    name: "Análise da chefia",
    descricao: "Confere necessidade, período e justificativa.",
    requiredPermission: "horas-extras:analisar:chefia",
  },
  {
    code: "ANALISE_ORCAMENTARIA",
    name: "Análise orçamentária",
    descricao: "Verifica disponibilidade orçamentária antes da decisão.",
    requiredPermission: "horas-extras:responder-orcamento:global",
  },
  {
    code: "DELIBERACAO_FINAL",
    name: "Deliberação final",
    descricao: "Autoriza, rejeita ou ajusta a execução das horas.",
    requiredPermission: "horas-extras:deliberar:global",
  },
  {
    code: "EXECUCAO",
    name: "Execução",
    descricao: "Acompanha horas autorizadas e realizadas.",
    requiredPermission: "horas-extras:visualizar-execucao:global",
  },
  {
    code: "FECHAMENTO",
    name: "Fechamento",
    descricao: "Consolida a competência para geração em folha.",
    requiredPermission: "horas-extras:gerar-lote:global",
  },
  {
    code: "PAGAMENTO",
    name: "Pagamento/Folha",
    descricao: "Permite consulta e geração dos efeitos financeiros.",
    requiredPermission: "horas-extras:visualizar-folha:global",
  },
];

const modelosFluxo = {
  completo: [
    "SERVIDOR_SOLICITANTE",
    "ANALISE_CHEFIA",
    "ANALISE_ORCAMENTARIA",
    "DELIBERACAO_FINAL",
    "EXECUCAO",
    "FECHAMENTO",
    "PAGAMENTO",
  ],
  simplificado: [
    "SERVIDOR_SOLICITANTE",
    "ANALISE_CHEFIA",
    "DELIBERACAO_FINAL",
    "EXECUCAO",
    "PAGAMENTO",
  ],
  duplaAprovacao: [
    "SERVIDOR_SOLICITANTE",
    "ANALISE_CHEFIA",
    "DELIBERACAO_FINAL",
    "EXECUCAO",
    "FECHAMENTO",
    "PAGAMENTO",
  ],
} as const;

const permissoesFluxo = [
  "horas-extras:solicitar:proprio",
  "horas-extras:analisar:chefia",
  "horas-extras:responder-orcamento:global",
  "horas-extras:deliberar:global",
  "horas-extras:visualizar-execucao:global",
  "horas-extras:gerar-lote:global",
  "horas-extras:visualizar-folha:global",
  "horas-extras:devolver:global",
  "horas-extras:rejeitar:global",
  "horas-extras:encaminhar-orcamento:chefia",
  "horas-extras:fechar-lote:global",
];

function erro(estado: ConfigurarPoliticaHorasExtrasFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

function formatarMinutos(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function minutosDeHoraMinuto(valor: string) {
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(valor);

  if (!match) {
    return 0;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function mascararHoraMinuto(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 5);

  if (digitos.length <= 2) {
    return digitos;
  }

  return `${digitos.slice(0, -2)}:${digitos.slice(-2)}`;
}

function normalizarHoraMinuto(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 5);

  if (!digitos) {
    return "00:00";
  }

  if (digitos.length <= 2) {
    return `${digitos.padStart(2, "0")}:00`;
  }

  return `${digitos.slice(0, -2).padStart(2, "0")}:${digitos.slice(-2)}`;
}

function etapasPorCodigos(codigos: readonly string[]) {
  return codigos
    .map((code) => catalogoEtapasFluxo.find((etapa) => etapa.code === code))
    .filter((etapa): etapa is FluxoEtapa => Boolean(etapa));
}

function acaoPrincipalEntre(origem: string, destino: string) {
  if (origem === "SERVIDOR_SOLICITANTE") return "SUBMIT";
  if (destino === "ANALISE_ORCAMENTARIA") return "FORWARD_BUDGET";
  if (origem === "ANALISE_ORCAMENTARIA") return "BUDGET_REVIEWED";
  if (destino === "EXECUCAO") return "APPROVE";
  if (destino === "FECHAMENTO") return "CLOSE_EXECUTION";
  if (destino === "PAGAMENTO") return "CLOSE_BATCH";
  return "APPROVE";
}

function permissaoPorAcao(actionCode: string) {
  if (actionCode === "SUBMIT") return "horas-extras:solicitar:proprio";
  if (actionCode === "RETURN") return "horas-extras:devolver:global";
  if (actionCode === "REJECT") return "horas-extras:rejeitar:global";
  if (actionCode === "FORWARD_BUDGET") {
    return "horas-extras:encaminhar-orcamento:chefia";
  }
  if (actionCode === "BUDGET_REVIEWED") {
    return "horas-extras:responder-orcamento:global";
  }
  if (actionCode === "APPROVE") return "horas-extras:deliberar:global";
  if (actionCode === "CLOSE_EXECUTION") {
    return "horas-extras:visualizar-execucao:global";
  }
  if (actionCode === "CLOSE_BATCH") return "horas-extras:fechar-lote:global";
  return null;
}

function montarWorkflowConfig(etapas: FluxoEtapa[]) {
  const transitions = etapas.slice(0, -1).map((etapa, index) => {
    const destino = etapas[index + 1];
    const actionCode = acaoPrincipalEntre(etapa.code, destino.code);

    return {
      fromStepCode: etapa.code,
      toStepCode: destino.code,
      actionCode,
      requiredPermission: permissaoPorAcao(actionCode),
    };
  });

  if (etapas.some((etapa) => etapa.code === "ANALISE_CHEFIA")) {
    transitions.push({
      fromStepCode: "ANALISE_CHEFIA",
      toStepCode: "SERVIDOR_SOLICITANTE",
      actionCode: "RETURN",
      requiredPermission: permissaoPorAcao("RETURN"),
    });
  }

  if (etapas.some((etapa) => etapa.code === "ANALISE_ORCAMENTARIA")) {
    transitions.push({
      fromStepCode: "ANALISE_ORCAMENTARIA",
      toStepCode: etapas.some((etapa) => etapa.code === "ANALISE_CHEFIA")
        ? "ANALISE_CHEFIA"
        : "SERVIDOR_SOLICITANTE",
      actionCode: "RETURN",
      requiredPermission: permissaoPorAcao("RETURN"),
    });
  }

  return {
    steps: etapas.map((etapa) => ({
      code: etapa.code,
      name: etapa.name,
      requiredPermission: etapa.requiredPermission,
      allowsPartialApproval: [
        "ANALISE_CHEFIA",
        "ANALISE_ORCAMENTARIA",
        "DELIBERACAO_FINAL",
      ].includes(etapa.code),
    })),
    transitions,
  };
}

function etapaDoCampoComErro(campo: string): EtapaHorasExtras {
  if (
    [
      "maxDailyWeekdayMinutes",
      "maxDailyWeekendHolidayMinutes",
      "maxMonthlyMinutes",
      "maxAnnualMinutes",
      "divisorMinutes",
    ].includes(campo)
  ) {
    return "limites";
  }

  if (
    ["rateDiaUtil", "rateSabado", "rateDomingo", "rateFeriado"].includes(campo)
  ) {
    return "percentuais";
  }

  return "escopo";
}

function criarPreviewInicial(
  campos: ConfigurarPoliticaHorasExtrasFormState["campos"],
  orgaoInicial: string,
): PoliticaPreview {
  return {
    orgaoId: campos?.orgaoId ?? orgaoInicial,
    scopeUnitId: campos?.scopeUnitId ?? "",
    validFrom: campos?.validFrom ?? new Date().toISOString().slice(0, 10),
    maxDailyWeekdayMinutes: campos?.maxDailyWeekdayMinutes ?? 120,
    maxDailyWeekendHolidayMinutes: campos?.maxDailyWeekendHolidayMinutes ?? 480,
    maxMonthlyMinutes: campos?.maxMonthlyMinutes ?? 2640,
    maxAnnualMinutes: campos?.maxAnnualMinutes ?? 8040,
    divisorMinutes: campos?.divisorMinutes ?? 12000,
    rateDiaUtil: campos?.rateDiaUtil ?? 50,
    rateSabado: campos?.rateSabado ?? 50,
    rateDomingo: campos?.rateDomingo ?? 100,
    rateFeriado: campos?.rateFeriado ?? 100,
  };
}

function classePainel(etapaAtual: EtapaHorasExtras, etapa: EtapaHorasExtras) {
  return [
    "rounded-xl border bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-sm",
    etapaAtual === etapa ? "block" : "hidden",
  ].join(" ");
}

export function HorasExtrasPoliticaForm({
  orgaos,
  unidades,
}: {
  orgaos: OrgaoOption[];
  unidades: UnidadeOption[];
}) {
  const [estado, formAction, pendente] = useActionState(
    configurarPoliticaHorasExtrasAction,
    estadoInicial,
  );
  const campos = estado.campos;
  const formRef = useRef<HTMLFormElement>(null);
  const [etapaAtual, setEtapaAtual] = useState<EtapaHorasExtras>("escopo");
  const [preview, setPreview] = useState<PoliticaPreview>(() =>
    criarPreviewInicial(campos, orgaos[0]?.id ?? ""),
  );
  const [fluxoEtapas, setFluxoEtapas] = useState<FluxoEtapa[]>(() =>
    etapasPorCodigos(modelosFluxo.completo),
  );

  const unidadesDoOrgao = useMemo(
    () => unidades.filter((unidade) => unidade.orgaoId === preview.orgaoId),
    [preview.orgaoId, unidades],
  );
  const orgaoSelecionado = orgaos.find((orgao) => orgao.id === preview.orgaoId);
  const unidadeSelecionada = unidades.find(
    (unidade) => unidade.id === preview.scopeUnitId,
  );
  const workflowConfig = useMemo(
    () => montarWorkflowConfig(fluxoEtapas),
    [fluxoEtapas],
  );
  const workflowConfigJson = useMemo(
    () => JSON.stringify(workflowConfig),
    [workflowConfig],
  );

  function atualizarPreview(
    campo: keyof PoliticaPreview,
    valor: string | number,
  ) {
    setPreview((atual) => {
      const proximo = { ...atual, [campo]: valor };

      if (
        campo === "orgaoId" &&
        !unidades.some(
          (unidade) =>
            unidade.orgaoId === String(valor) &&
            unidade.id === atual.scopeUnitId,
        )
      ) {
        proximo.scopeUnitId = "";
      }

      return proximo;
    });
  }

  function irParaEtapa(etapa: EtapaHorasExtras) {
    setEtapaAtual(etapa);
    window.requestAnimationFrame(() => {
      document.getElementById(`horas-extras-etapa-${etapa}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function moverEtapa(direcao: 1 | -1) {
    const indice = etapasHorasExtras.findIndex(
      (etapa) => etapa.id === etapaAtual,
    );
    const proximoIndice = Math.min(
      Math.max(indice + direcao, 0),
      etapasHorasExtras.length - 1,
    );
    irParaEtapa(etapasHorasExtras[proximoIndice].id);
  }

  function aplicarModeloFluxo(modelo: keyof typeof modelosFluxo) {
    setFluxoEtapas(etapasPorCodigos(modelosFluxo[modelo]));
  }

  function alternarEtapaFluxo(etapa: FluxoEtapa) {
    if (etapa.obrigatoria) return;
    setFluxoEtapas((atuais) => {
      if (atuais.some((item) => item.code === etapa.code)) {
        return atuais.filter((item) => item.code !== etapa.code);
      }

      const proximo = [...atuais, etapa];
      return catalogoEtapasFluxo.filter((item) =>
        proximo.some((selecionada) => selecionada.code === item.code),
      );
    });
  }

  function moverEtapaFluxo(code: string, direcao: -1 | 1) {
    setFluxoEtapas((atuais) => {
      const indice = atuais.findIndex((etapa) => etapa.code === code);
      const novoIndice = indice + direcao;
      if (indice <= 0 || novoIndice <= 0 || novoIndice >= atuais.length) {
        return atuais;
      }

      const proximo = [...atuais];
      const [item] = proximo.splice(indice, 1);
      proximo.splice(novoIndice, 0, item);
      return proximo;
    });
  }

  function atualizarPermissaoEtapa(code: string, requiredPermission: string) {
    setFluxoEtapas((atuais) =>
      atuais.map((etapa) =>
        etapa.code === code
          ? { ...etapa, requiredPermission: requiredPermission || null }
          : etapa,
      ),
    );
  }

  useEffect(() => {
    const primeiroCampoComErro = Object.keys(estado.erros ?? {})[0];
    if (!primeiroCampoComErro) return;
    const frame = window.requestAnimationFrame(() => {
      setEtapaAtual(etapaDoCampoComErro(primeiroCampoComErro));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [estado.erros]);

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      <input type="hidden" name="workflowConfig" value={workflowConfigJson} />

      {estado.mensagem && (
        <div
          role="alert"
          className={[
            "rounded-lg border p-4 text-sm font-medium",
            estado.sucesso
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-amber-200 bg-amber-50 text-amber-950",
          ].join(" ")}
        >
          {estado.mensagem}
        </div>
      )}

      <div className="rounded-xl border bg-[var(--card)] p-4 text-[var(--card-foreground)] shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          {etapasHorasExtras.map((etapa, indice) => {
            const ativa = etapaAtual === etapa.id;
            const concluida =
              etapasHorasExtras.findIndex((item) => item.id === etapaAtual) >
              indice;
            const Icone = etapa.Icone;

            return (
              <button
                key={etapa.id}
                type="button"
                onClick={() => irParaEtapa(etapa.id)}
                className={[
                  "flex min-h-20 flex-1 items-center gap-3 rounded-lg border px-4 py-3 text-left transition",
                  ativa
                    ? "border-blue-800 bg-blue-50 text-blue-950 shadow-sm dark:border-blue-500 dark:bg-blue-950 dark:text-blue-100"
                    : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] hover:border-blue-300",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex size-10 shrink-0 items-center justify-center rounded-full border",
                    ativa
                      ? "border-blue-800 bg-blue-900 text-white"
                      : concluida
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-[var(--border)] bg-[var(--card)]",
                  ].join(" ")}
                >
                  {concluida ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <Icone className="size-5" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">
                    {indice + 1}. {etapa.titulo}
                  </span>
                  <span className="block text-xs leading-5">
                    {etapa.descricao}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section
            id="horas-extras-etapa-escopo"
            className={classePainel(etapaAtual, "escopo")}
          >
            <CabecalhoEtapa
              numero="1"
              titulo="Defina o escopo da configuração"
              descricao="Escolha onde a política e o fluxo de horas extras serão aplicados. O escopo geral vale para todo o órgão; o escopo por seccional cria uma versão específica."
            />

            <div className="mt-5 grid gap-5 md:grid-cols-[1fr_1fr_12rem]">
              <CampoSelect
                id="orgaoId"
                label="Órgão"
                descricao="Órgão no qual a nova versão da política e do fluxo ficará disponível."
                value={preview.orgaoId}
                onChange={(valor) => atualizarPreview("orgaoId", valor)}
                erro={erro(estado, "orgaoId")}
                required
              >
                {orgaos.map((orgao) => (
                  <option key={orgao.id} value={orgao.id}>
                    {orgao.sigla} - {orgao.nome}
                  </option>
                ))}
              </CampoSelect>

              <CampoSelect
                id="scopeUnitId"
                label="Escopo"
                descricao="Use geral do órgão para uma regra ampla ou selecione uma seccional para exceção específica."
                value={preview.scopeUnitId}
                onChange={(valor) => atualizarPreview("scopeUnitId", valor)}
                erro={erro(estado, "scopeUnitId")}
              >
                <option value="">Geral do órgão</option>
                {unidadesDoOrgao.map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.orgao.sigla} / {unidade.sigla} - {unidade.nome}
                  </option>
                ))}
              </CampoSelect>

              <CampoData
                id="validFrom"
                label="Vigência inicial"
                descricao="Data a partir da qual a nova versão passa a valer."
                value={preview.validFrom}
                onChange={(valor) => atualizarPreview("validFrom", valor)}
                erro={erro(estado, "validFrom")}
              />
            </div>

            <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
              <p className="font-semibold">Efeito prático do escopo</p>
              <p className="mt-1">
                Ao publicar, o SECP versiona a política de limites e o fluxo de
                tramitação para o escopo escolhido. Solicitações de pessoas
                vinculadas a esse órgão ou seccional passam a usar a versão
                ativa correspondente.
              </p>
            </div>
          </section>

          <section
            id="horas-extras-etapa-limites"
            className={classePainel(etapaAtual, "limites")}
          >
            <CabecalhoEtapa
              numero="2"
              titulo="Configure limites de execução"
              descricao="Informe os tetos permitidos para cada solicitação e para os acumulados mensal e anual. Os campos usam o formato HH:mm."
            />

            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <TempoPoliticaInput
                id="maxDailyWeekdayTime"
                name="maxDailyWeekdayMinutes"
                label="Dia útil"
                descricao="Limite diário para serviço extraordinário em dias úteis."
                minutes={preview.maxDailyWeekdayMinutes}
                onMinutesChange={(valor) =>
                  atualizarPreview("maxDailyWeekdayMinutes", valor)
                }
                erro={erro(estado, "maxDailyWeekdayMinutes")}
              />
              <TempoPoliticaInput
                id="maxDailyWeekendHolidayTime"
                name="maxDailyWeekendHolidayMinutes"
                label="Fim de semana"
                descricao="Limite diário aplicado a sábado, domingo, feriado, recesso e ponto facultativo."
                minutes={preview.maxDailyWeekendHolidayMinutes}
                onMinutesChange={(valor) =>
                  atualizarPreview("maxDailyWeekendHolidayMinutes", valor)
                }
                erro={erro(estado, "maxDailyWeekendHolidayMinutes")}
              />
              <TempoPoliticaInput
                id="maxMonthlyTime"
                name="maxMonthlyMinutes"
                label="Mensal"
                descricao="Teto mensal usado para controlar o total autorizado na competência."
                minutes={preview.maxMonthlyMinutes}
                onMinutesChange={(valor) =>
                  atualizarPreview("maxMonthlyMinutes", valor)
                }
                erro={erro(estado, "maxMonthlyMinutes")}
              />
              <TempoPoliticaInput
                id="maxAnnualTime"
                name="maxAnnualMinutes"
                label="Anual"
                descricao="Teto anual para acompanhamento consolidado de serviço extraordinário."
                minutes={preview.maxAnnualMinutes}
                onMinutesChange={(valor) =>
                  atualizarPreview("maxAnnualMinutes", valor)
                }
                erro={erro(estado, "maxAnnualMinutes")}
              />
              <TempoPoliticaInput
                id="divisorTime"
                name="divisorMinutes"
                label="Divisor"
                descricao="Base de conversão usada nos cálculos do valor da hora extra."
                minutes={preview.divisorMinutes}
                onMinutesChange={(valor) =>
                  atualizarPreview("divisorMinutes", valor)
                }
                erro={erro(estado, "divisorMinutes")}
              />
            </div>
          </section>

          <section
            id="horas-extras-etapa-percentuais"
            className={classePainel(etapaAtual, "percentuais")}
          >
            <CabecalhoEtapa
              numero="3"
              titulo="Defina percentuais de adicional"
              descricao="Configure o percentual aplicado conforme o tipo de dia. Feriados regimentais, pontos facultativos e recessos usam o mesmo percentual de feriado."
            />

            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <PercentualPoliticaInput
                id="rateDiaUtil"
                name="rateDiaUtil"
                label="Adicional dia útil"
                descricao="Percentual aplicado às horas extras executadas em dia útil."
                value={preview.rateDiaUtil}
                onChange={(valor) => atualizarPreview("rateDiaUtil", valor)}
                erro={erro(estado, "rateDiaUtil")}
              />
              <PercentualPoliticaInput
                id="rateSabado"
                name="rateSabado"
                label="Adicional sábado"
                descricao="Percentual aplicado às horas extras executadas no sábado."
                value={preview.rateSabado}
                onChange={(valor) => atualizarPreview("rateSabado", valor)}
                erro={erro(estado, "rateSabado")}
              />
              <PercentualPoliticaInput
                id="rateDomingo"
                name="rateDomingo"
                label="Adicional domingo"
                descricao="Percentual aplicado às horas extras executadas no domingo."
                value={preview.rateDomingo}
                onChange={(valor) => atualizarPreview("rateDomingo", valor)}
                erro={erro(estado, "rateDomingo")}
              />
              <PercentualPoliticaInput
                id="rateFeriado"
                name="rateFeriado"
                label="Adicional feriado"
                descricao="Percentual aplicado a feriados, recesso e ponto facultativo."
                value={preview.rateFeriado}
                onChange={(valor) => atualizarPreview("rateFeriado", valor)}
                erro={erro(estado, "rateFeriado")}
              />
            </div>
          </section>

          <section
            id="horas-extras-etapa-fluxo"
            className={classePainel(etapaAtual, "fluxo")}
          >
            <CabecalhoEtapa
              numero="4"
              titulo="Revise o fluxo e publique"
              descricao="A publicação cria uma nova versão da política e ativa o fluxo padrão de tramitação para o mesmo escopo."
            />

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => aplicarModeloFluxo("simplificado")}
                className="rounded-lg border p-4 text-left text-sm transition hover:border-blue-400 hover:bg-blue-50"
              >
                <span className="font-semibold">SJAM simplificado</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">
                  Servidor, chefia, deliberação, execução e folha.
                </span>
              </button>
              <button
                type="button"
                onClick={() => aplicarModeloFluxo("completo")}
                className="rounded-lg border p-4 text-left text-sm transition hover:border-blue-400 hover:bg-blue-50"
              >
                <span className="font-semibold">SJRR completo</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">
                  Inclui orçamento, fechamento e pagamento.
                </span>
              </button>
              <button
                type="button"
                onClick={() => aplicarModeloFluxo("duplaAprovacao")}
                className="rounded-lg border p-4 text-left text-sm transition hover:border-blue-400 hover:bg-blue-50"
              >
                <span className="font-semibold">Dupla aprovação</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">
                  Chefia e deliberação final antes da execução.
                </span>
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {catalogoEtapasFluxo.map((etapa) => {
                const selecionada = fluxoEtapas.some(
                  (item) => item.code === etapa.code,
                );

                return (
                  <label
                    key={etapa.code}
                    className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selecionada}
                      disabled={etapa.obrigatoria}
                      onChange={() => alternarEtapaFluxo(etapa)}
                      className="mt-1 size-4"
                    />
                    <span>
                      <span className="block font-semibold">{etapa.name}</span>
                      <span className="text-xs leading-5 text-[var(--muted-foreground)]">
                        {etapa.requiredPermission ?? "sem permissão"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-5 space-y-3">
              {fluxoEtapas.map((etapa, indice) => (
                <div
                  key={etapa.code}
                  className="grid gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm md:grid-cols-[3rem_1fr_auto]"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-blue-900 font-bold text-white">
                    {indice + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{etapa.name}</p>
                    <p className="mt-1 leading-5 text-[var(--muted-foreground)]">
                      {etapa.descricao}
                    </p>
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      Permissão: {etapa.requiredPermission ?? "sem permissão"}
                    </p>
                    <select
                      value={etapa.requiredPermission ?? ""}
                      onChange={(event) =>
                        atualizarPermissaoEtapa(etapa.code, event.target.value)
                      }
                      className="mt-2 h-9 w-full rounded-md border bg-[var(--card)] px-2 text-xs"
                    >
                      <option value="">Sem permissão específica</option>
                      {permissoesFluxo.map((permissao) => (
                        <option key={permissao} value={permissao}>
                          {permissao}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moverEtapaFluxo(etapa.code, -1)}
                      disabled={indice <= 1}
                      className="size-9 rounded-md border bg-[var(--card)] text-sm font-bold disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moverEtapaFluxo(etapa.code, 1)}
                      disabled={
                        indice === 0 || indice === fluxoEtapas.length - 1
                      }
                      className="size-9 rounded-md border bg-[var(--card)] text-sm font-bold disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-lg border border-dashed p-4">
              <p className="text-sm font-semibold">Ações configuradas</p>
              <div className="mt-3 space-y-2">
                {workflowConfig.transitions.map((transition) => (
                  <div
                    key={`${transition.fromStepCode}-${transition.actionCode}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-[var(--muted)] px-3 py-2 text-xs"
                  >
                    <span>
                      {transition.fromStepCode} → {transition.toStepCode}
                    </span>
                    <span className="rounded-full bg-blue-900 px-2 py-1 font-semibold text-white">
                      {transition.actionCode}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p className="font-semibold">Compatibilidade operacional</p>
              <p className="mt-1">
                Ao remover a etapa orçamentária, a política publicada deixa de
                exigir parecer orçamentário antes da deliberação. As etapas usam
                os códigos reconhecidos pelas telas atuais do SECP.
              </p>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => moverEtapa(-1)}
              disabled={etapaAtual === "escopo"}
              className="inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-semibold transition hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Voltar
            </button>
            <div className="flex flex-col gap-3 sm:flex-row">
              {etapaAtual !== "fluxo" && (
                <button
                  type="button"
                  onClick={() => moverEtapa(1)}
                  className="inline-flex h-11 items-center justify-center rounded-md bg-blue-900 px-5 text-sm font-semibold text-white transition hover:bg-blue-950"
                >
                  Continuar
                </button>
              )}
              {etapaAtual === "fluxo" && (
                <button
                  type="submit"
                  disabled={pendente || orgaos.length === 0}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-900 px-5 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pendente ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Publicar versão
                </button>
              )}
            </div>
          </div>
        </div>

        <PreviewPolitica
          preview={preview}
          orgaoSelecionado={orgaoSelecionado}
          unidadeSelecionada={unidadeSelecionada}
          fluxoEtapas={fluxoEtapas}
        />
      </div>
    </form>
  );
}

function CabecalhoEtapa({
  numero,
  titulo,
  descricao,
}: {
  numero: string;
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-b pb-4">
      <p className="text-xs font-semibold uppercase text-blue-800">
        Etapa {numero} de 4
      </p>
      <h2 className="text-xl font-bold">{titulo}</h2>
      <p className="text-sm leading-6 text-[var(--muted-foreground)]">
        {descricao}
      </p>
    </div>
  );
}

function TextoAuxiliar({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs leading-5 text-[var(--muted-foreground)]">
      {children}
    </p>
  );
}

function CampoSelect({
  id,
  label,
  descricao,
  value,
  onChange,
  erro: mensagemErro,
  required,
  children,
}: {
  id: string;
  label: string;
  descricao: string;
  value: string;
  onChange: (valor: string) => void;
  erro?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <TextoAuxiliar>{descricao}</TextoAuxiliar>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
      >
        {children}
      </select>
      {mensagemErro && <p className="text-sm text-red-600">{mensagemErro}</p>}
    </div>
  );
}

function CampoData({
  id,
  label,
  descricao,
  value,
  onChange,
  erro: mensagemErro,
}: {
  id: string;
  label: string;
  descricao: string;
  value: string;
  onChange: (valor: string) => void;
  erro?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <TextoAuxiliar>{descricao}</TextoAuxiliar>
      <input
        id={id}
        name={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
      />
      {mensagemErro && <p className="text-sm text-red-600">{mensagemErro}</p>}
    </div>
  );
}

function TempoPoliticaInput({
  id,
  name,
  label,
  descricao,
  minutes,
  onMinutesChange,
  erro: mensagemErro,
}: {
  id: string;
  name: string;
  label: string;
  descricao: string;
  minutes: number;
  onMinutesChange: (valor: number) => void;
  erro?: string;
}) {
  const [valor, setValor] = useState(formatarMinutos(minutes));

  function aplicarValor(valorDigitado: string) {
    const normalizado = normalizarHoraMinuto(valorDigitado);
    setValor(normalizado);
    onMinutesChange(minutosDeHoraMinuto(normalizado));
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <TextoAuxiliar>{descricao}</TextoAuxiliar>
      <input type="hidden" name={name} value={minutes} />
      <input
        id={id}
        inputMode="numeric"
        maxLength={6}
        value={valor}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setValor(mascararHoraMinuto(event.target.value))}
        onBlur={(event) => aplicarValor(event.target.value)}
        placeholder="HH:mm"
        className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
      />
      {mensagemErro && <p className="text-sm text-red-600">{mensagemErro}</p>}
    </div>
  );
}

function PercentualPoliticaInput({
  id,
  name,
  label,
  descricao,
  value,
  onChange,
  erro: mensagemErro,
}: {
  id: string;
  name: string;
  label: string;
  descricao: string;
  value: number;
  onChange: (valor: number) => void;
  erro?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <TextoAuxiliar>{descricao}</TextoAuxiliar>
      <div className="relative">
        <input
          id={id}
          name={name}
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-11 w-full rounded-md border bg-[var(--card)] px-3 pr-9 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-[var(--muted-foreground)]">
          %
        </span>
      </div>
      {mensagemErro && <p className="text-sm text-red-600">{mensagemErro}</p>}
    </div>
  );
}

function PreviewPolitica({
  preview,
  orgaoSelecionado,
  unidadeSelecionada,
  fluxoEtapas,
}: {
  preview: PoliticaPreview;
  orgaoSelecionado?: OrgaoOption;
  unidadeSelecionada?: UnidadeOption;
  fluxoEtapas: FluxoEtapa[];
}) {
  const escopo = unidadeSelecionada
    ? `${unidadeSelecionada.orgao.sigla} / ${unidadeSelecionada.sigla}`
    : "Geral do órgão";

  return (
    <aside className="xl:sticky xl:top-6 xl:self-start">
      <div className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-800">
              Pré-visualização
            </p>
            <h3 className="mt-1 text-lg font-bold">
              Política de serviço extraordinário
            </h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {orgaoSelecionado
                ? `${orgaoSelecionado.sigla} - ${escopo}`
                : "Órgão ainda não informado"}
            </p>
          </div>
          <FileCheck2 className="size-5 text-blue-800" />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <ResumoItem label="Vigência" value={preview.validFrom || "-"} />
          <ResumoItem
            label="Dia útil"
            value={formatarMinutos(preview.maxDailyWeekdayMinutes)}
          />
          <ResumoItem
            label="Fim semana"
            value={formatarMinutos(preview.maxDailyWeekendHolidayMinutes)}
          />
          <ResumoItem
            label="Mensal"
            value={formatarMinutos(preview.maxMonthlyMinutes)}
          />
          <ResumoItem
            label="Anual"
            value={formatarMinutos(preview.maxAnnualMinutes)}
          />
          <ResumoItem
            label="Divisor"
            value={formatarMinutos(preview.divisorMinutes)}
          />
        </dl>

        <div className="mt-5 rounded-lg border bg-[var(--muted)] p-4 text-sm">
          <p className="font-semibold">Percentuais</p>
          <div className="mt-3 space-y-2">
            <LinhaResumo label="Dia útil" value={`${preview.rateDiaUtil}%`} />
            <LinhaResumo label="Sábado" value={`${preview.rateSabado}%`} />
            <LinhaResumo label="Domingo" value={`${preview.rateDomingo}%`} />
            <LinhaResumo label="Feriado" value={`${preview.rateFeriado}%`} />
          </div>
        </div>

        <div className="mt-5 rounded-lg border bg-[var(--muted)] p-4 text-sm">
          <p className="font-semibold">Fluxo publicado</p>
          <div className="mt-3 space-y-2">
            {fluxoEtapas.map((etapa, indice) => (
              <LinhaResumo
                key={etapa.code}
                label={`${indice + 1}. ${etapa.name}`}
                value={indice === 0 ? "início" : "ativo"}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-dashed p-3 text-xs leading-5 text-[var(--muted-foreground)]">
          <p className="font-semibold text-[var(--foreground)]">
            Efeito prático ao publicar
          </p>
          <p className="mt-1">
            A nova versão substitui a versão ativa anterior no mesmo escopo e
            passa a orientar solicitação, análise, orçamento, deliberação,
            execução, fechamento e pagamento das horas extras.
          </p>
        </div>
      </div>
    </aside>
  );
}

function LinhaResumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function ResumoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
