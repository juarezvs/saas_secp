"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  Loader2,
  Minus,
  Plus,
  Save,
} from "lucide-react";

import type { JornadaFormState } from "../../application/schemas/jornada.schema";

type HorarioFormProps = {
  action?: (
    state: JornadaFormState,
    formData: FormData,
  ) => Promise<JornadaFormState>;
  valoresIniciais?: {
    orgaoId?: string | null;
    codigo?: string;
    nome?: string;
    descricao?: string | null;
    tipo?: string;
    cargaDiariaMinutos?: number;
    cargaSemanalMinutos?: number | null;
    cargaMensalMinutos?: number | null;
    cargaMinimaDiariaMinutos?: number | null;
    cargaMaximaDiariaMinutos?: number | null;
    controlaHorario?: boolean;
    permiteFlexibilidade?: boolean;
    permiteBancoHoras?: boolean;
    permiteHoraExtra?: boolean;
    exigeIntervalo?: boolean;
    intervaloMinimoMinutos?: number | null;
    intervaloMaximoMinutos?: number | null;
    horarioEntradaPadrao?: string | null;
    horarioSaidaPadrao?: string | null;
    horarioDiferenciadoPermitido?: boolean;
    entradaMinimaDiferenciada?: string | null;
    saidaMaximaDiferenciada?: string | null;
    nucleoObrigatorioInicio?: string | null;
    nucleoObrigatorioFim?: string | null;
    permanenciaMaximaMinutos?: number | null;
    horarioLimiteVirada?: string | null;
    cruzaMeiaNoite?: boolean;
    fundamentoNormativo?: string | null;
    versao?: number;
    vigenciaInicio?: Date | string | null;
    vigenciaFim?: Date | string | null;
    situacao?: string;
    ativo?: boolean;
    dias?: Array<{
      diaSemana?: string | null;
      ordemNoCiclo?: number | null;
      tipoDia?: string;
      fechamentoCiclo?: string | null;
      intervaloLivre?: boolean;
      cargaPrevistaMinutos?: number;
      faixas?: Array<{
        tipo?: string;
        horaInicio?: string;
        horaFim?: string;
        ordem?: number;
        cruzaMeiaNoite?: boolean;
      }>;
    }>;
  };
  modo: "criar" | "editar";
  somenteLeitura?: boolean;
};

type LinhaHorario = {
  chave: string;
  rotulo: string;
  tipoDia: string;
  entrada1: string;
  saida1: string;
  entrada2: string;
  saida2: string;
  entrada3: string;
  saida3: string;
  duracaoDias?: number;
  fechamento?: string;
  intervaloLivre?: boolean;
};

const estadoInicial: JornadaFormState = {
  sucesso: false,
  mensagem: null,
};

const diasSemanaCadastro = [
  { chave: "SEGUNDA", rotulo: "Segunda-feira" },
  { chave: "TERCA", rotulo: "Terça-feira" },
  { chave: "QUARTA", rotulo: "Quarta-feira" },
  { chave: "QUINTA", rotulo: "Quinta-feira" },
  { chave: "SEXTA", rotulo: "Sexta-feira" },
  { chave: "SABADO", rotulo: "Sábado" },
  { chave: "DOMINGO", rotulo: "Domingo" },
];

const tiposHorario = [
  {
    value: "FIXA_SEMANAL",
    label: "Semanal",
    descricao: "Use quando o mesmo quadro semanal se repete toda semana.",
  },
  {
    value: "ESCALA_CICLICA",
    label: "Escala Cíclica",
    descricao:
      "Use quando o horário segue ciclos de expediente, extra ou folga a partir de uma data inicial.",
  },
  {
    value: "CARGA_MENSAL",
    label: "Escala Mensal - Horário Padrão",
    descricao:
      "Use quando a escala mensal parte de um horário padrão para cada dia.",
  },
  {
    value: "HIBRIDO",
    label: "Híbrido",
    descricao:
      "Use quando alguns dias são presenciais e outros são em home office.",
  },
  {
    value: "TELETRABALHO",
    label: "Teletrabalho",
    descricao:
      "Use quando a rotina é de teletrabalho, com horários previstos para os dias com marcação.",
  },
];

const etapas = [
  { id: "identificacao", label: "Identificação" },
  { id: "grade", label: "Grade" },
  { id: "revisao", label: "Revisão" },
] as const;

function erro(estado: JornadaFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

function formatarDataInput(valor?: Date | string | null) {
  if (!valor) return "";
  if (typeof valor === "string") return valor.slice(0, 10);
  return valor.toISOString().slice(0, 10);
}

function normalizarTipoHorario(tipo?: string | null) {
  if (
    tipo === "ESCALA_CICLICA" ||
    tipo === "CARGA_MENSAL" ||
    tipo === "HIBRIDO" ||
    tipo === "TELETRABALHO"
  ) {
    return tipo;
  }

  return "FIXA_SEMANAL";
}

function codigoAutomatico(valor?: string) {
  return valor || "Gerado automaticamente ao salvar";
}

function horaParaMinutos(valor: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(valor)) return null;
  const [horas, minutos] = valor.split(":").map(Number);
  return horas * 60 + minutos;
}

function minutosParaHHMM(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function minutosIntervalo(inicio: string, fim: string) {
  const inicioMinutos = horaParaMinutos(inicio);
  const fimMinutos = horaParaMinutos(fim);
  if (inicioMinutos === null || fimMinutos === null) return 0;
  return fimMinutos >= inicioMinutos
    ? fimMinutos - inicioMinutos
    : 1440 - inicioMinutos + fimMinutos;
}

function cargaLinha(linha: LinhaHorario) {
  if (["FOLGA", "HOME_OFFICE"].includes(linha.tipoDia)) return 0;

  return (
    minutosIntervalo(linha.entrada1, linha.saida1) +
    minutosIntervalo(linha.entrada2, linha.saida2) +
    minutosIntervalo(linha.entrada3, linha.saida3)
  );
}

function linhaCruzaMeiaNoite(linha: LinhaHorario) {
  return (
    (minutosIntervalo(linha.entrada1, linha.saida1) > 0 &&
      linha.saida1 < linha.entrada1) ||
    (minutosIntervalo(linha.entrada2, linha.saida2) > 0 &&
      linha.saida2 < linha.entrada2) ||
    (minutosIntervalo(linha.entrada3, linha.saida3) > 0 &&
      linha.saida3 < linha.entrada3)
  );
}

function faixaTrabalho(
  valoresIniciais: HorarioFormProps["valoresIniciais"],
  diaSemana: string,
  ordem: number,
) {
  const dia = valoresIniciais?.dias?.find(
    (item) => item.diaSemana === diaSemana,
  );
  return dia?.faixas
    ?.filter((faixa) => faixa.tipo === "TRABALHO")
    .sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0))[ordem - 1];
}

function criarLinhasSemana(
  valoresIniciais: HorarioFormProps["valoresIniciais"],
): LinhaHorario[] {
  return diasSemanaCadastro.map((diaSemana) => {
    const dia = valoresIniciais?.dias?.find(
      (item) => item.diaSemana === diaSemana.chave,
    );
    const trabalha =
      diaSemana.chave !== "SABADO" && diaSemana.chave !== "DOMINGO";
    const faixa1 = faixaTrabalho(valoresIniciais, diaSemana.chave, 1);
    const faixa2 = faixaTrabalho(valoresIniciais, diaSemana.chave, 2);
    const faixa3 = faixaTrabalho(valoresIniciais, diaSemana.chave, 3);

    return {
      chave: diaSemana.chave,
      rotulo: diaSemana.rotulo,
      tipoDia: dia?.tipoDia ?? (trabalha ? "TRABALHO" : "FOLGA"),
      entrada1:
        faixa1?.horaInicio ??
        (trabalha ? valoresIniciais?.horarioEntradaPadrao ?? "" : ""),
      saida1:
        faixa1?.horaFim ??
        (trabalha ? valoresIniciais?.horarioSaidaPadrao ?? "" : ""),
      entrada2: faixa2?.horaInicio ?? "",
      saida2: faixa2?.horaFim ?? "",
      entrada3: faixa3?.horaInicio ?? "",
      saida3: faixa3?.horaFim ?? "",
    };
  });
}

function criarCiclos(
  valoresIniciais: HorarioFormProps["valoresIniciais"],
): LinhaHorario[] {
  const diasCiclo = (valoresIniciais?.dias ?? [])
    .filter((dia) => dia.ordemNoCiclo)
    .sort((a, b) => Number(a.ordemNoCiclo ?? 0) - Number(b.ordemNoCiclo ?? 0));

  if (diasCiclo.length === 0) {
    return [
      {
        chave: "0",
        rotulo: "1º Ciclo",
        tipoDia: "TRABALHO",
        duracaoDias: 1,
        fechamento: "",
        intervaloLivre: false,
        entrada1: "",
        saida1: "",
        entrada2: "",
        saida2: "",
        entrada3: "",
        saida3: "",
      },
    ];
  }

  return diasCiclo.map((dia, index) => {
    const faixas = [...(dia.faixas ?? [])].sort(
      (a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0),
    );

    return {
      chave: String(index),
      rotulo: `${index + 1}º Ciclo`,
      tipoDia: dia.tipoDia ?? "TRABALHO",
      duracaoDias: 1,
      fechamento: dia.fechamentoCiclo ?? "",
      intervaloLivre: Boolean(dia.intervaloLivre),
      entrada1: faixas[0]?.horaInicio ?? "",
      saida1: faixas[0]?.horaFim ?? "",
      entrada2: faixas[1]?.horaInicio ?? "",
      saida2: faixas[1]?.horaFim ?? "",
      entrada3: faixas[2]?.horaInicio ?? "",
      saida3: faixas[2]?.horaFim ?? "",
    };
  });
}

function rotuloTipoDia(tipoDia: string) {
  if (tipoDia === "FOLGA") return "Folga";
  if (tipoDia === "EXTRA") return "Extra";
  if (tipoDia === "PRESENCIAL") return "Presencial";
  if (tipoDia === "HOME_OFFICE") return "Home office";
  if (tipoDia === "TELETRABALHO") return "Teletrabalho";
  return "Expediente";
}

export function HorarioForm({
  action,
  valoresIniciais,
  modo,
  somenteLeitura = false,
}: HorarioFormProps) {
  const actionFormulario =
    action ??
    (async () => ({
      sucesso: false,
      mensagem: null,
    }));
  const [estado, formAction, pendente] = useActionState(
    actionFormulario,
    estadoInicial,
  );
  const campos = estado.campos ?? valoresIniciais;
  const [nomeHorario, setNomeHorario] = useState(campos?.nome ?? "");
  const [descricaoHorario, setDescricaoHorario] = useState(
    campos?.descricao ?? "",
  );
  const [fundamentoNormativo, setFundamentoNormativo] = useState(
    campos?.fundamentoNormativo ?? "",
  );
  const [inicioCiclo, setInicioCiclo] = useState(
    formatarDataInput(campos?.vigenciaInicio),
  );
  const [vigenciaFim, setVigenciaFim] = useState(
    formatarDataInput(campos?.vigenciaFim),
  );
  const [tipo, setTipo] = useState(normalizarTipoHorario(campos?.tipo));
  const [etapaAtual, setEtapaAtual] =
    useState<(typeof etapas)[number]["id"]>("identificacao");
  const [linhas, setLinhas] = useState<LinhaHorario[]>(() =>
    criarLinhasSemana(campos),
  );
  const [ciclos, setCiclos] = useState<LinhaHorario[]>(() =>
    criarCiclos(campos),
  );
  const [cicloAtivo, setCicloAtivo] = useState(0);
  const tipoSelecionado = tiposHorario.find((item) => item.value === tipo);
  const linhasAtivas = tipo === "ESCALA_CICLICA" ? ciclos : linhas;
  const cargaDiariaPadrao = Math.max(...linhasAtivas.map(cargaLinha), 0);
  const cargaSemanal = linhas.reduce((total, linha) => total + cargaLinha(linha), 0);
  const cargaCiclo = ciclos.reduce(
    (total, ciclo) =>
      total + cargaLinha(ciclo) * Math.max(1, ciclo.duracaoDias ?? 1),
    0,
  );
  const cargaMensal =
    tipo === "ESCALA_CICLICA"
      ? Math.round((cargaCiclo / Math.max(1, ciclos.length)) * 30)
      : Math.round((cargaSemanal / 7) * 30);
  const linhaReferenciaHorario =
    linhasAtivas.find(
      (linha) =>
        cargaLinha(linha) > 0 &&
        linha.entrada1 &&
        (linha.saida3 || linha.saida2 || linha.saida1),
    ) ?? linhasAtivas[0];
  const horarioCruzaMeiaNoite = linhasAtivas.some(linhaCruzaMeiaNoite);
  const indiceEtapa = useMemo(
    () => etapas.findIndex((etapa) => etapa.id === etapaAtual),
    [etapaAtual],
  );

  function atualizarLinha(
    chave: string,
    campo: keyof LinhaHorario,
    valor: string | number | boolean,
  ) {
    setLinhas((atuais) =>
      atuais.map((linha) =>
        linha.chave === chave
          ? campo === "tipoDia" &&
            (valor === "HOME_OFFICE" || valor === "FOLGA")
            ? {
                ...linha,
                tipoDia: valor,
                entrada1: "",
                saida1: "",
                entrada2: "",
                saida2: "",
                entrada3: "",
                saida3: "",
              }
            : { ...linha, [campo]: valor }
          : linha,
      ),
    );
  }

  function atualizarCiclo(
    index: number,
    campo: keyof LinhaHorario,
    valor: string | number | boolean,
  ) {
    setCiclos((atuais) =>
      atuais.map((ciclo, indice) =>
        indice === index ? { ...ciclo, [campo]: valor } : ciclo,
      ),
    );
  }

  function replicarPrimeiraLinha() {
    const primeiraLinha = linhas[0];
    setLinhas((atuais) =>
      atuais.map((linha, index) =>
        index === 0
          ? linha
          : {
              ...linha,
              tipoDia: primeiraLinha.tipoDia,
              entrada1: primeiraLinha.entrada1,
              saida1: primeiraLinha.saida1,
              entrada2: primeiraLinha.entrada2,
              saida2: primeiraLinha.saida2,
              entrada3: primeiraLinha.entrada3,
              saida3: primeiraLinha.saida3,
            },
      ),
    );
  }

  function adicionarCiclo() {
    setCiclos((atuais) => [
      ...atuais,
      {
        chave: String(atuais.length),
        rotulo: `${atuais.length + 1}º Ciclo`,
        tipoDia: "TRABALHO",
        duracaoDias: 1,
        fechamento: "",
        intervaloLivre: false,
        entrada1: "",
        saida1: "",
        entrada2: "",
        saida2: "",
        entrada3: "",
        saida3: "",
      },
    ]);
    setCicloAtivo(ciclos.length);
  }

  function removerCicloAtivo() {
    if (ciclos.length <= 1) return;
    setCiclos((atuais) =>
      atuais
        .filter((_, index) => index !== cicloAtivo)
        .map((ciclo, index) => ({
          ...ciclo,
          chave: String(index),
          rotulo: `${index + 1}º Ciclo`,
        })),
    );
    setCicloAtivo((atual) => Math.max(0, atual - 1));
  }

  function alternarTipoCiclo(index: number) {
    setCiclos((atuais) =>
      atuais.map((ciclo, indice) => {
        if (indice !== index) return ciclo;
        if (ciclo.tipoDia === "TRABALHO") {
          return {
            ...ciclo,
            tipoDia: "FOLGA",
            entrada1: "",
            saida1: "",
            entrada2: "",
            saida2: "",
            entrada3: "",
            saida3: "",
          };
        }
        if (ciclo.tipoDia === "FOLGA") {
          return { ...ciclo, tipoDia: "EXTRA" };
        }
        return {
          ...ciclo,
          tipoDia: "TRABALHO",
          entrada1: "",
          saida1: "",
          entrada2: "",
          saida2: "",
          entrada3: "",
          saida3: "",
        };
      }),
    );
  }

  function renderCamposOcultos(prefixo: string, linha: LinhaHorario) {
    const tipoDiaEfetivo =
      tipo === "TELETRABALHO"
        ? linha.tipoDia === "FOLGA"
          ? "FOLGA"
          : "TELETRABALHO"
        : tipo === "HIBRIDO" && linha.tipoDia === "TRABALHO"
          ? "PRESENCIAL"
          : linha.tipoDia;

    return (
      <div key={prefixo} className="hidden">
        <input name={`${prefixo}.tipoDia`} value={tipoDiaEfetivo} readOnly />
        <input
          name={`${prefixo}.cargaPrevistaMinutos`}
          value={cargaLinha(linha)}
          readOnly
        />
        <input name={`${prefixo}.entrada1`} value={linha.entrada1} readOnly />
        <input name={`${prefixo}.saida1`} value={linha.saida1} readOnly />
        <input name={`${prefixo}.entrada2`} value={linha.entrada2} readOnly />
        <input name={`${prefixo}.saida2`} value={linha.saida2} readOnly />
        <input name={`${prefixo}.entrada3`} value={linha.entrada3} readOnly />
        <input name={`${prefixo}.saida3`} value={linha.saida3} readOnly />
        {"duracaoDias" in linha && (
          <>
            <input
              name={`${prefixo}.duracaoDias`}
              value={linha.duracaoDias ?? 1}
              readOnly
            />
            <input
              name={`${prefixo}.fechamento`}
              value={linha.fechamento ?? ""}
              readOnly
            />
            <input
              name={`${prefixo}.intervaloLivre`}
              value={String(linha.intervaloLivre ?? false)}
              readOnly
            />
          </>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="orgaoId" defaultValue={campos?.orgaoId ?? ""} />
      <input type="hidden" name="codigo" defaultValue={campos?.codigo ?? ""} />
      <input type="hidden" name="nome" value={nomeHorario} readOnly />
      <input type="hidden" name="descricao" value={descricaoHorario} readOnly />
      <input
        type="hidden"
        name="fundamentoNormativo"
        value={fundamentoNormativo}
        readOnly
      />
      <input type="hidden" name="vigenciaInicio" value={inicioCiclo} readOnly />
      <input type="hidden" name="vigenciaFim" value={vigenciaFim} readOnly />
      <input type="hidden" name="tipo" value={tipo} readOnly />
      <input type="hidden" name="versao" defaultValue="1" />
      <input type="hidden" name="situacao" defaultValue="ATIVA" />
      <input type="hidden" name="controlaHorario" value="true" readOnly />
      <input type="hidden" name="permiteBancoHoras" value="true" readOnly />
      <input type="hidden" name="permiteFlexibilidade" value="false" readOnly />
      <input type="hidden" name="permiteHoraExtra" value="true" readOnly />
      <input type="hidden" name="exigeIntervalo" value="false" readOnly />
      <input
        type="hidden"
        name="horarioDiferenciadoPermitido"
        value={String(campos?.horarioDiferenciadoPermitido ?? true)}
        readOnly
      />
      <input type="hidden" name="entradaMinimaDiferenciada" value="06:00" readOnly />
      <input type="hidden" name="saidaMaximaDiferenciada" value="19:00" readOnly />
      <input
        type="hidden"
        name="horarioEntradaPadrao"
        value={linhaReferenciaHorario?.entrada1 ?? ""}
        readOnly
      />
      <input
        type="hidden"
        name="horarioSaidaPadrao"
        value={
          linhaReferenciaHorario?.saida3 ||
          linhaReferenciaHorario?.saida2 ||
          linhaReferenciaHorario?.saida1 ||
          ""
        }
        readOnly
      />
      <input type="hidden" name="cargaDiariaMinutos" value={cargaDiariaPadrao} readOnly />
      <input
        type="hidden"
        name="cargaSemanalMinutos"
        value={tipo === "ESCALA_CICLICA" ? cargaCiclo : cargaSemanal}
        readOnly
      />
      <input type="hidden" name="cargaMensalMinutos" value={cargaMensal} readOnly />
      <input
        type="hidden"
        name="cruzaMeiaNoite"
        value={String(horarioCruzaMeiaNoite)}
        readOnly
      />
      <input type="hidden" name="ativo" value="true" readOnly />
      <input type="hidden" name="ciclos.quantidade" value={ciclos.length} readOnly />

      {linhas.map((linha) => renderCamposOcultos(`dias.${linha.chave}`, linha))}
      {ciclos.map((linha, index) =>
        renderCamposOcultos(`ciclos.${index}`, linha),
      )}

      {estado.mensagem && (
        <div
          role="alert"
          className={`rounded-lg border p-4 text-sm ${
            estado.sucesso
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {estado.mensagem}
        </div>
      )}

      <div className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
        <div className="flex items-center gap-0">
          {etapas.map((etapa, index) => {
            const ativa = etapa.id === etapaAtual;
            const concluida = index < indiceEtapa;
            return (
              <div key={etapa.id} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() => setEtapaAtual(etapa.id)}
                  className="flex items-center gap-3 text-left"
                >
                  <span
                    className={`flex size-9 items-center justify-center rounded-full border text-sm font-bold ${
                      ativa || concluida
                        ? "border-blue-900 bg-blue-900 text-white"
                        : "border-[var(--border)] bg-[var(--background)]"
                    }`}
                  >
                    {concluida ? <Check className="size-4" /> : index + 1}
                  </span>
                  <span className="hidden text-sm font-semibold sm:block">
                    {etapa.label}
                  </span>
                </button>
                {index < etapas.length - 1 && (
                  <span className="mx-3 h-px flex-1 bg-[var(--border)]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <section className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)]">
        {etapaAtual === "identificacao" && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Código</label>
              <div className="flex h-11 items-center rounded-md border bg-[var(--muted)] px-3 text-sm font-semibold text-[var(--muted-foreground)]">
                {codigoAutomatico(campos?.codigo)}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="nome" className="text-sm font-semibold">
                Descrição do horário
              </label>
              <input
                id="nome"
                value={nomeHorario}
                onChange={(event) => setNomeHorario(event.target.value)}
                required
                maxLength={150}
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                placeholder="Ex.: Expediente padrão 08h às 17h"
              />
              {erro(estado, "nome") && (
                <p className="text-sm text-red-600">{erro(estado, "nome")}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="tipoHorario" className="text-sm font-semibold">
                Tipo de horário
              </label>
              <select
                id="tipoHorario"
                value={tipo}
                onChange={(event) => setTipo(event.target.value)}
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              >
                {tiposHorario.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-[var(--muted-foreground)]">
                {tipoSelecionado?.descricao}
              </p>
            </div>

            {tipo === "ESCALA_CICLICA" && (
              <div className="space-y-2">
                <label htmlFor="inicioCiclo" className="text-sm font-semibold">
                  Início do Ciclo
                </label>
                <input
                  id="inicioCiclo"
                  type="date"
                  value={inicioCiclo}
                  onChange={(event) => setInicioCiclo(event.target.value)}
                  required
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                />
              </div>
            )}
          </div>
        )}

        {etapaAtual === "grade" && tipo !== "ESCALA_CICLICA" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Grade semanal do horário</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Informe até três períodos por dia. A carga é calculada pela
                  soma dos intervalos preenchidos.
                </p>
              </div>
              <button
                type="button"
                onClick={replicarPrimeiraLinha}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition hover:bg-[var(--muted)]"
                title="Replicar a primeira linha para os demais dias"
              >
                <ChevronDown className="size-4" />
                Replicar primeira linha
              </button>
            </div>

            <TabelaLinhas
              linhas={linhas}
              tipoHorario={tipo}
              somenteLeitura={somenteLeitura}
              onChange={atualizarLinha}
            />
          </div>
        )}

        {etapaAtual === "grade" && tipo === "ESCALA_CICLICA" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Ciclos do horário</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Cada ciclo começa a contar a partir do Início do Ciclo.
                  Duração indica quantos dias seguidos usam aquele horário.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={adicionarCiclo}
                  className="inline-flex size-10 items-center justify-center rounded-md border transition hover:bg-[var(--muted)]"
                  title="Adicionar ciclo"
                >
                  <Plus className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={removerCicloAtivo}
                  disabled={ciclos.length <= 1}
                  className="inline-flex size-10 items-center justify-center rounded-md border transition hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
                  title="Excluir ciclo ativo"
                >
                  <Minus className="size-4" />
                </button>
              </div>
            </div>

            <TabelaCiclos
              ciclos={ciclos}
              cicloAtivo={cicloAtivo}
              somenteLeitura={somenteLeitura}
              onAtivar={setCicloAtivo}
              onAlternarTipo={alternarTipoCiclo}
              onChange={atualizarCiclo}
            />
          </div>
        )}

        {etapaAtual === "revisao" && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-lg border bg-[var(--muted)] p-4 md:col-span-2">
              <div className="flex items-center gap-3">
                <CalendarClock className="size-5 text-blue-900" />
                <div>
                  <h2 className="font-bold">Resumo do horário</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Carga prevista:{" "}
                    {minutosParaHHMM(
                      tipo === "ESCALA_CICLICA" ? cargaCiclo : cargaSemanal,
                    )}{" "}
                    · Carga mensal estimada: {minutosParaHHMM(cargaMensal)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="descricao" className="text-sm font-semibold">
                Observações
              </label>
              <textarea
                id="descricao"
                value={descricaoHorario}
                onChange={(event) => setDescricaoHorario(event.target.value)}
                rows={3}
                className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="fundamentoNormativo"
                className="text-sm font-semibold"
              >
                Fundamento normativo
              </label>
              <input
                id="fundamentoNormativo"
                value={fundamentoNormativo}
                onChange={(event) => setFundamentoNormativo(event.target.value)}
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="horarioLimiteVirada" className="text-sm font-semibold">
                Limite de virada
              </label>
              <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                Horário máximo, na madrugada seguinte, para fechar a jornada do
                dia anterior quando o horário atravessa a meia-noite.
              </p>
              <input
                id="horarioLimiteVirada"
                name="horarioLimiteVirada"
                type="time"
                defaultValue={campos?.horarioLimiteVirada ?? ""}
                disabled={somenteLeitura}
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 font-mono text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20 disabled:opacity-50"
              />
            </div>

            {tipo !== "ESCALA_CICLICA" && (
              <div className="space-y-2">
                <label htmlFor="inicioCicloRevisao" className="text-sm font-semibold">
                  Vigência inicial
                </label>
                <input
                  id="inicioCicloRevisao"
                  type="date"
                  value={inicioCiclo}
                  onChange={(event) => setInicioCiclo(event.target.value)}
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="vigenciaFim" className="text-sm font-semibold">
                Vigência final
              </label>
              <input
                id="vigenciaFim"
                type="date"
                value={vigenciaFim}
                onChange={(event) => setVigenciaFim(event.target.value)}
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              />
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          disabled={indiceEtapa === 0}
          onClick={() => setEtapaAtual(etapas[Math.max(indiceEtapa - 1, 0)].id)}
          className="inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-semibold transition hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Voltar
        </button>
        <div className="flex flex-col gap-3 sm:flex-row">
          {etapaAtual !== "revisao" && (
            <button
              type="button"
              onClick={() =>
                setEtapaAtual(etapas[Math.min(indiceEtapa + 1, etapas.length - 1)].id)
              }
              className="inline-flex h-11 items-center justify-center rounded-md bg-blue-900 px-5 text-sm font-semibold text-white transition hover:bg-blue-950"
            >
              Continuar
            </button>
          )}
          {etapaAtual === "revisao" && !somenteLeitura && (
            <button
              type="submit"
              disabled={pendente}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-900 px-5 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pendente ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {modo === "criar" ? "Cadastrar horário" : "Salvar horário"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function TabelaLinhas({
  linhas,
  tipoHorario,
  somenteLeitura,
  onChange,
}: {
  linhas: LinhaHorario[];
  tipoHorario: string;
  somenteLeitura: boolean;
  onChange: (
    chave: string,
    campo: keyof LinhaHorario,
    valor: string | number | boolean,
  ) => void;
}) {
  const opcoesTipoDia =
    tipoHorario === "HIBRIDO"
      ? [
          { value: "PRESENCIAL", label: "Presencial" },
          { value: "HOME_OFFICE", label: "Home office" },
          { value: "FOLGA", label: "Folga" },
        ]
      : tipoHorario === "TELETRABALHO"
        ? [
            { value: "TELETRABALHO", label: "Teletrabalho" },
            { value: "FOLGA", label: "Folga" },
          ]
        : [
            { value: "FOLGA", label: "Folga" },
            { value: "TRABALHO", label: "Expediente" },
            { value: "EXTRA", label: "Extra" },
          ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px] text-left text-sm">
        <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
          <tr>
            <th className="px-3 py-3">Dia</th>
            <th className="px-3 py-3">1ª Entrada</th>
            <th className="px-3 py-3">1ª Saída</th>
            <th className="px-3 py-3">2ª Entrada</th>
            <th className="px-3 py-3">2ª Saída</th>
            <th className="px-3 py-3">3ª Entrada</th>
            <th className="px-3 py-3">3ª Saída</th>
            <th className="px-3 py-3">Total de Extra</th>
            <th className="px-3 py-3">Total de Falta</th>
            <th className="px-3 py-3">Carga</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.chave} className="border-b last:border-b-0">
              {(() => {
                const tipoDiaVisivel =
                  tipoHorario === "TELETRABALHO"
                    ? linha.tipoDia === "FOLGA"
                      ? "FOLGA"
                      : "TELETRABALHO"
                    : tipoHorario === "HIBRIDO" && linha.tipoDia === "TRABALHO"
                      ? "PRESENCIAL"
                      : linha.tipoDia;
                const horariosDesabilitados =
                  somenteLeitura ||
                  ["FOLGA", "HOME_OFFICE"].includes(tipoDiaVisivel);

                return (
                  <>
              <td className="px-3 py-3">
                <div className="font-semibold">{linha.rotulo}</div>
                <select
                  value={tipoDiaVisivel}
                  onChange={(event) =>
                    onChange(linha.chave, "tipoDia", event.target.value)
                  }
                  disabled={somenteLeitura}
                  className="mt-2 h-9 w-36 rounded-md border bg-[var(--card)] px-2 text-xs"
                >
                  {opcoesTipoDia.map((opcao) => (
                    <option key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </option>
                  ))}
                </select>
              </td>
              {(["entrada1", "saida1", "entrada2", "saida2", "entrada3", "saida3"] as const).map(
                (campo) => (
                  <td key={campo} className="px-3 py-3">
                    <input
                      type="time"
                      value={linha[campo]}
                      disabled={horariosDesabilitados}
                      required={
                        !horariosDesabilitados &&
                        (campo === "entrada1" || campo === "saida1")
                      }
                      onChange={(event) =>
                        onChange(linha.chave, campo, event.target.value)
                      }
                      className="h-10 w-28 rounded-md border bg-[var(--card)] px-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20 disabled:opacity-50"
                    />
                  </td>
                ),
              )}
              <td className="px-3 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                00:00
              </td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                00:00
              </td>
              <td className="px-3 py-3 font-mono font-semibold">
                {minutosParaHHMM(cargaLinha(linha))}
              </td>
                  </>
                );
              })()}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaCiclos({
  ciclos,
  cicloAtivo,
  somenteLeitura,
  onAtivar,
  onAlternarTipo,
  onChange,
}: {
  ciclos: LinhaHorario[];
  cicloAtivo: number;
  somenteLeitura: boolean;
  onAtivar: (index: number) => void;
  onAlternarTipo: (index: number) => void;
  onChange: (
    index: number,
    campo: keyof LinhaHorario,
    valor: string | number | boolean,
  ) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1280px] text-left text-sm">
        <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
          <tr>
            <th className="px-3 py-3">Ciclos</th>
            <th className="px-3 py-3">Duração</th>
            <th className="px-3 py-3">1ª Entrada</th>
            <th className="px-3 py-3">1ª Saída</th>
            <th className="px-3 py-3">2ª Entrada</th>
            <th className="px-3 py-3">2ª Saída</th>
            <th className="px-3 py-3">3ª Entrada</th>
            <th className="px-3 py-3">3ª Saída</th>
            <th className="px-3 py-3">Fechamento</th>
            <th className="px-3 py-3">Intervalo livre</th>
            <th className="px-3 py-3">Total de Extra</th>
            <th className="px-3 py-3">Total de Falta</th>
            <th className="px-3 py-3">Carga</th>
          </tr>
        </thead>
        <tbody>
          {ciclos.map((ciclo, index) => (
            <tr
              key={ciclo.chave}
              className={`border-b last:border-b-0 ${
                cicloAtivo === index ? "bg-[var(--muted)]/60" : ""
              }`}
            >
              <td className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => {
                    onAtivar(index);
                    onAlternarTipo(index);
                  }}
                  className="text-left font-semibold text-blue-900 underline-offset-4 hover:underline dark:text-blue-300"
                  title="Alternar entre Folga, Extra e Expediente"
                >
                  {ciclo.rotulo}
                </button>
                <div className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
                  {rotuloTipoDia(ciclo.tipoDia)}
                </div>
              </td>
              <td className="px-3 py-3">
                <input
                  type="number"
                  min={1}
                  value={ciclo.duracaoDias ?? 1}
                  onFocus={() => onAtivar(index)}
                  onChange={(event) =>
                    onChange(index, "duracaoDias", Number(event.target.value))
                  }
                  className="h-10 w-24 rounded-md border bg-[var(--card)] px-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                />
              </td>
              {(["entrada1", "saida1", "entrada2", "saida2", "entrada3", "saida3"] as const).map(
                (campo) => (
                  <td key={campo} className="px-3 py-3">
                    <input
                      type="time"
                      value={ciclo[campo]}
                      disabled={somenteLeitura || ciclo.tipoDia === "FOLGA"}
                      required={
                        ciclo.tipoDia !== "FOLGA" &&
                        (campo === "entrada1" || campo === "saida1")
                      }
                      onFocus={() => onAtivar(index)}
                      onChange={(event) =>
                        onChange(index, campo, event.target.value)
                      }
                      className="h-10 w-28 rounded-md border bg-[var(--card)] px-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20 disabled:opacity-50"
                    />
                  </td>
                ),
              )}
              <td className="px-3 py-3">
                <input
                  value={ciclo.fechamento ?? ""}
                  placeholder="36:00"
                  pattern="^[0-9]{1,3}:[0-5][0-9]$"
                  onFocus={() => onAtivar(index)}
                  onChange={(event) =>
                    onChange(index, "fechamento", event.target.value)
                  }
                  className="h-10 w-24 rounded-md border bg-[var(--card)] px-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                />
              </td>
              <td className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={Boolean(ciclo.intervaloLivre)}
                  onFocus={() => onAtivar(index)}
                  onChange={(event) =>
                    onChange(index, "intervaloLivre", event.target.checked)
                  }
                  className="size-4 rounded border-slate-300 accent-blue-900"
                />
              </td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                00:00
              </td>
              <td className="px-3 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                00:00
              </td>
              <td className="px-3 py-3 font-mono font-semibold">
                {minutosParaHHMM(cargaLinha(ciclo))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
