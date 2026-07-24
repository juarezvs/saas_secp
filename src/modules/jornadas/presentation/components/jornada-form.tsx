"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  Rows3,
  Save,
  Settings2,
} from "lucide-react";

import {
  diasSemana,
  tiposDiaJornada,
  tiposJornada,
  type JornadaFormState,
} from "../../application/schemas/jornada.schema";

type JornadaFormProps = {
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
      tipoDia?: string;
      cargaPrevistaMinutos?: number;
      faixas?: Array<{
        tipo?: string;
        horaInicio?: string;
        horaFim?: string;
        cruzaMeiaNoite?: boolean;
      }>;
    }>;
  };
  modo: "criar" | "editar";
  somenteLeitura?: boolean;
};

type EtapaJornada = "tipo" | "regras" | "previsao" | "revisao";

type JornadaPreview = {
  codigo: string;
  nome: string;
  tipo: string;
  cargaDiariaMinutos: string;
  cargaSemanalMinutos: string;
  cargaMensalMinutos: string;
  horarioEntradaPadrao: string;
  horarioSaidaPadrao: string;
  exigeIntervalo: boolean;
  controlaHorario: boolean;
  permiteFlexibilidade: boolean;
  permiteBancoHoras: boolean;
  permiteHoraExtra: boolean;
  cruzaMeiaNoite: boolean;
  horarioDiferenciadoPermitido: boolean;
  diasTrabalho: number;
  diasFolga: number;
};

const estadoInicial: JornadaFormState = {
  sucesso: false,
  mensagem: null,
};

const rotulosTipo: Record<string, string> = {
  SETE_HORAS: "7 horas",
  OITO_HORAS: "8 horas",
  ESPECIAL: "Especial",
  FIXA_SEMANAL: "Fixa semanal",
  FLEXIVEL: "Flexível",
  CARGA_DIARIA: "Carga diária",
  CARGA_SEMANAL: "Carga semanal",
  CARGA_MENSAL: "Carga mensal",
  ESCALA_CICLICA: "Escala cíclica",
  ESCALA_VARIAVEL: "Escala variável",
  TURNO_FIXO: "Turno fixo",
  TURNO_REVEZAMENTO: "Turno de revezamento",
  NOTURNA: "Noturna",
  PARCIAL: "Parcial/reduzida",
  PLANTAO_EVENTUAL: "Plantão eventual",
  SEM_CONTROLE_CONVENCIONAL: "Sem controle convencional",
};

const descricoesTipo: Record<string, string> = {
  SETE_HORAS:
    "Jornada diária ordinária de 7 horas. Normalmente não exige intervalo e pode movimentar banco de horas conforme a regulamentação local.",
  OITO_HORAS:
    "Jornada diária de 8 horas em dois turnos, com intervalo obrigatório para repouso e alimentação.",
  ESPECIAL:
    "Use para profissão regulamentada ou hipótese excepcional. Informe o fundamento normativo que autoriza o regime.",
  FIXA_SEMANAL:
    "Use quando a previsão se repete por dia da semana. A grade semanal define carga, faixa e folgas.",
  FLEXIVEL:
    "Use quando há carga diária prevista, mas com janela de entrada/saída mais ampla ou núcleo obrigatório.",
  CARGA_DIARIA:
    "Use quando a apuração compara principalmente a carga diária, com ou sem faixa rígida de horário.",
  CARGA_SEMANAL:
    "Use quando o controle principal é a carga semanal. Informe a carga semanal e configure os dias esperados quando houver.",
  CARGA_MENSAL:
    "Use quando o controle principal é a carga mensal. Informe a carga mensal e mantenha a previsão diária como referência.",
  ESCALA_CICLICA:
    "Use para ciclos como 12x36, 24x72 ou outros regimes por posição. Depois de salvar, cadastre a escala cíclica no detalhe da jornada.",
  ESCALA_VARIAVEL:
    "Use quando a escala muda por planejamento. A jornada guarda as regras gerais e a escala atribuída define o dia esperado.",
  TURNO_FIXO:
    "Use quando a pessoa trabalha sempre em um turno específico, inclusive com possibilidade de turno noturno.",
  TURNO_REVEZAMENTO:
    "Use quando a pessoa alterna turnos por ciclo. Depois de salvar, cadastre a escala de revezamento com data de ancoragem.",
  NOTURNA:
    "Use quando a jornada pode atravessar a meia-noite. Marque virada de dia e informe o limite de virada quando aplicável.",
  PARCIAL:
    "Use para carga reduzida ou regime parcial. Ajuste a carga diária e a grade semanal conforme o ato autorizativo.",
  PLANTAO_EVENTUAL:
    "Use para plantões não ordinários. Configure os dias de plantão esperados ou cadastre escala específica depois.",
  SEM_CONTROLE_CONVENCIONAL:
    "Use quando não há controle convencional de horário. A apuração não gera falta ordinária por ausência de marcações.",
};

const rotulosDia: Record<string, string> = {
  DOMINGO: "Domingo",
  SEGUNDA: "Segunda",
  TERCA: "Terça",
  QUARTA: "Quarta",
  QUINTA: "Quinta",
  SEXTA: "Sexta",
  SABADO: "Sábado",
};

const rotulosTipoDia: Record<string, string> = {
  TRABALHO: "Trabalho",
  FOLGA: "Folga",
  PLANTAO: "Plantão",
  COMPENSADO: "Compensado",
  SEM_EXPEDIENTE: "Sem expediente",
};

const descricoesParametros: Record<string, { label: string; descricao: string }> = {
  controlaHorario: {
    label: "Controla horário",
    descricao: "Espera marcações e compara entrada, saída, carga e janela.",
  },
  permiteFlexibilidade: {
    label: "Permite flexibilidade",
    descricao: "Permite cumprir a carga dentro de uma janela mais ampla.",
  },
  permiteBancoHoras: {
    label: "Permite banco de horas",
    descricao: "Créditos e débitos apurados podem movimentar banco de horas.",
  },
  permiteHoraExtra: {
    label: "Permite hora extra",
    descricao: "Excedentes podem seguir fluxo de serviço extraordinário.",
  },
  cruzaMeiaNoite: {
    label: "Permite virada de dia",
    descricao: "Use quando a faixa inicia em um dia e termina no seguinte.",
  },
};

const etapasJornada: Array<{
  id: EtapaJornada;
  titulo: string;
  descricao: string;
  Icone: typeof Settings2;
}> = [
  {
    id: "tipo",
    titulo: "Tipo",
    descricao: "Identificação e regime",
    Icone: Settings2,
  },
  {
    id: "regras",
    titulo: "Regras",
    descricao: "Carga e permissões",
    Icone: Clock3,
  },
  {
    id: "previsao",
    titulo: "Previsão",
    descricao: "Dias e faixas",
    Icone: Rows3,
  },
  {
    id: "revisao",
    titulo: "Revisão",
    descricao: "Vigência e salvamento",
    Icone: FileCheck2,
  },
];

function erro(estado: JornadaFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

function formatarDataInput(valor?: Date | string | null) {
  if (!valor) return "";
  if (typeof valor === "string") return valor.slice(0, 10);
  return valor.toISOString().slice(0, 10);
}

function diaPadrao(diaSemana: string) {
  return diaSemana !== "DOMINGO" && diaSemana !== "SABADO";
}

function obterDia(
  campos: JornadaFormProps["valoresIniciais"] | JornadaFormState["campos"],
  diaSemana: string,
) {
  return campos?.dias?.find((dia) => dia.diaSemana === diaSemana);
}

function obterFaixa(
  campos: JornadaFormProps["valoresIniciais"] | JornadaFormState["campos"],
  diaSemana: string,
  tipo: string,
) {
  return obterDia(campos, diaSemana)?.faixas?.find(
    (faixa) => faixa.tipo === tipo,
  );
}

function textoDoCampo(form: HTMLFormElement, nome: string) {
  const elemento = form.elements.namedItem(nome);
  if (
    elemento instanceof HTMLInputElement ||
    elemento instanceof HTMLSelectElement ||
    elemento instanceof HTMLTextAreaElement
  ) {
    return elemento.value;
  }

  return "";
}

function checkboxDoCampo(form: HTMLFormElement, nome: string) {
  const elemento = form.elements.namedItem(nome);
  return elemento instanceof HTMLInputElement ? elemento.checked : false;
}

function contarDias(
  campos: JornadaFormProps["valoresIniciais"] | JornadaFormState["campos"],
) {
  return diasSemana.reduce(
    (total, diaSemana) => {
      const tipoDia =
        obterDia(campos, diaSemana)?.tipoDia ??
        (diaPadrao(diaSemana) ? "TRABALHO" : "FOLGA");

      if (tipoDia === "FOLGA" || tipoDia === "SEM_EXPEDIENTE") {
        total.folga += 1;
      } else {
        total.trabalho += 1;
      }

      return total;
    },
    { trabalho: 0, folga: 0 },
  );
}

function criarPreviewInicial(
  campos: JornadaFormProps["valoresIniciais"] | JornadaFormState["campos"],
  tipo: string,
): JornadaPreview {
  const dias = contarDias(campos);

  return {
    codigo: campos?.codigo ?? "",
    nome: campos?.nome ?? "",
    tipo,
    cargaDiariaMinutos: String(campos?.cargaDiariaMinutos ?? 420),
    cargaSemanalMinutos: String(campos?.cargaSemanalMinutos ?? ""),
    cargaMensalMinutos: String(campos?.cargaMensalMinutos ?? ""),
    horarioEntradaPadrao: campos?.horarioEntradaPadrao ?? "",
    horarioSaidaPadrao: campos?.horarioSaidaPadrao ?? "",
    exigeIntervalo: campos?.exigeIntervalo ?? false,
    controlaHorario: campos?.controlaHorario ?? tipo !== "SEM_CONTROLE_CONVENCIONAL",
    permiteFlexibilidade: campos?.permiteFlexibilidade ?? false,
    permiteBancoHoras: campos?.permiteBancoHoras ?? true,
    permiteHoraExtra: campos?.permiteHoraExtra ?? false,
    cruzaMeiaNoite: campos?.cruzaMeiaNoite ?? tipo === "NOTURNA",
    horarioDiferenciadoPermitido:
      campos?.horarioDiferenciadoPermitido ?? false,
    diasTrabalho: dias.trabalho,
    diasFolga: dias.folga,
  };
}

function lerPreviewFormulario(form: HTMLFormElement, tipo: string): JornadaPreview {
  const dias = diasSemana.reduce(
    (total, diaSemana) => {
      const tipoDia =
        textoDoCampo(form, `dias.${diaSemana}.tipoDia`) ||
        (diaPadrao(diaSemana) ? "TRABALHO" : "FOLGA");

      if (tipoDia === "FOLGA" || tipoDia === "SEM_EXPEDIENTE") {
        total.folga += 1;
      } else {
        total.trabalho += 1;
      }

      return total;
    },
    { trabalho: 0, folga: 0 },
  );

  return {
    codigo: textoDoCampo(form, "codigo"),
    nome: textoDoCampo(form, "nome"),
    tipo,
    cargaDiariaMinutos: textoDoCampo(form, "cargaDiariaMinutos"),
    cargaSemanalMinutos: textoDoCampo(form, "cargaSemanalMinutos"),
    cargaMensalMinutos: textoDoCampo(form, "cargaMensalMinutos"),
    horarioEntradaPadrao: textoDoCampo(form, "horarioEntradaPadrao"),
    horarioSaidaPadrao: textoDoCampo(form, "horarioSaidaPadrao"),
    exigeIntervalo: checkboxDoCampo(form, "exigeIntervalo"),
    controlaHorario: checkboxDoCampo(form, "controlaHorario"),
    permiteFlexibilidade: checkboxDoCampo(form, "permiteFlexibilidade"),
    permiteBancoHoras: checkboxDoCampo(form, "permiteBancoHoras"),
    permiteHoraExtra: checkboxDoCampo(form, "permiteHoraExtra"),
    cruzaMeiaNoite: checkboxDoCampo(form, "cruzaMeiaNoite"),
    horarioDiferenciadoPermitido: checkboxDoCampo(
      form,
      "horarioDiferenciadoPermitido",
    ),
    diasTrabalho: dias.trabalho,
    diasFolga: dias.folga,
  };
}

function minutosParaHoraLegivel(valor?: string | number | null) {
  const minutos = Number(valor);
  if (!Number.isFinite(minutos) || minutos <= 0) return "-";
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, "0")}`;
}

function valorOuTraco(valor?: string | null) {
  return valor && valor.trim() ? valor : "-";
}

function horaParaMinutosInput(valor: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(valor)) return null;
  const [horas, minutos] = valor.split(":").map(Number);
  return horas * 60 + minutos;
}

function minutosParaHoraInput(valor: number) {
  const minutosDoDia = ((valor % 1440) + 1440) % 1440;
  const horas = Math.floor(minutosDoDia / 60);
  const minutos = minutosDoDia % 60;
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function classePainel(etapaAtual: EtapaJornada, etapa: EtapaJornada) {
  return [
    "rounded-xl border bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-sm",
    etapaAtual === etapa ? "block" : "hidden",
  ].join(" ");
}

function etapaDoCampoComErro(campo: string): EtapaJornada {
  if (campo === "dias" || campo.startsWith("dias.")) return "previsao";

  if (
    [
      "fundamentoNormativo",
      "vigenciaInicio",
      "vigenciaFim",
      "ativo",
      "situacao",
    ].includes(campo)
  ) {
    return "revisao";
  }

  if (
    [
      "cargaDiariaMinutos",
      "cargaSemanalMinutos",
      "cargaMensalMinutos",
      "cargaMinimaDiariaMinutos",
      "cargaMaximaDiariaMinutos",
      "horarioEntradaPadrao",
      "horarioSaidaPadrao",
      "exigeIntervalo",
      "intervaloMinimoMinutos",
      "intervaloMaximoMinutos",
      "horarioDiferenciadoPermitido",
      "entradaMinimaDiferenciada",
      "saidaMaximaDiferenciada",
      "nucleoObrigatorioInicio",
      "nucleoObrigatorioFim",
      "permanenciaMaximaMinutos",
      "horarioLimiteVirada",
      "controlaHorario",
      "permiteFlexibilidade",
      "permiteBancoHoras",
      "permiteHoraExtra",
      "cruzaMeiaNoite",
    ].includes(campo)
  ) {
    return "regras";
  }

  return "tipo";
}

function CampoErro({
  estado,
  campo,
}: {
  estado: JornadaFormState;
  campo: string;
}) {
  const mensagem = erro(estado, campo);
  if (!mensagem) return null;
  return <p className="text-sm text-red-600">{mensagem}</p>;
}

export function JornadaForm({
  action,
  valoresIniciais,
  modo,
  somenteLeitura = false,
}: JornadaFormProps) {
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
  const tipoInicial = String(campos?.tipo ?? "SETE_HORAS");
  const formRef = useRef<HTMLFormElement>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState(tipoInicial);
  const [etapaAtual, setEtapaAtual] = useState<EtapaJornada>("tipo");
  const [preview, setPreview] = useState<JornadaPreview>(() =>
    criarPreviewInicial(campos, tipoInicial),
  );

  const contextoTipo = useMemo(() => {
    const usaCiclo = [
      "ESCALA_CICLICA",
      "ESCALA_VARIAVEL",
      "TURNO_REVEZAMENTO",
      "PLANTAO_EVENTUAL",
    ].includes(tipoSelecionado);

    return {
      usaCiclo,
      semControle: tipoSelecionado === "SEM_CONTROLE_CONVENCIONAL",
      exigeCargaSemanal: tipoSelecionado === "CARGA_SEMANAL",
      exigeCargaMensal: tipoSelecionado === "CARGA_MENSAL",
      jornadaNoturna: tipoSelecionado === "NOTURNA",
      descricao: descricoesTipo[tipoSelecionado] ?? "",
    };
  }, [tipoSelecionado]);

  function atualizarPreview(tipo = tipoSelecionado) {
    if (!formRef.current) return;
    setPreview(lerPreviewFormulario(formRef.current, tipo));
  }

  function irParaEtapa(etapa: EtapaJornada) {
    setEtapaAtual(etapa);
    window.requestAnimationFrame(() => {
      document.getElementById(`jornada-etapa-${etapa}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function moverEtapa(direcao: 1 | -1) {
    const indice = etapasJornada.findIndex((etapa) => etapa.id === etapaAtual);
    const proximoIndice = Math.min(
      Math.max(indice + direcao, 0),
      etapasJornada.length - 1,
    );
    irParaEtapa(etapasJornada[proximoIndice].id);
  }

  function campoInput(nome: string) {
    const elemento = formRef.current?.elements.namedItem(nome);
    return elemento instanceof HTMLInputElement ? elemento : null;
  }

  function sincronizarPrevisao(
    prefixo: string,
    origem: "carga" | "inicio" | "fim",
  ) {
    const carga = campoInput(`${prefixo}.cargaPrevistaMinutos`);
    const inicio = campoInput(`${prefixo}.faixaTrabalhoInicio`);
    const fim = campoInput(`${prefixo}.faixaTrabalhoFim`);
    const viraDia = campoInput(`${prefixo}.cruzaMeiaNoite`);

    if (!carga || !inicio || !fim) return;

    const inicioMinutos = horaParaMinutosInput(inicio.value);
    const fimMinutos = horaParaMinutosInput(fim.value);
    const cargaMinutos = Number(carga.value);

    if (
      (origem === "carga" || origem === "inicio") &&
      inicioMinutos !== null &&
      Number.isFinite(cargaMinutos) &&
      cargaMinutos >= 0
    ) {
      const fimCalculado = inicioMinutos + cargaMinutos;
      fim.value = minutosParaHoraInput(fimCalculado);
      if (viraDia) viraDia.checked = fimCalculado >= 1440;
      atualizarPreview();
      return;
    }

    if (origem === "fim" && inicioMinutos !== null && fimMinutos !== null) {
      const cruzaMeiaNoite = fimMinutos < inicioMinutos;
      carga.value = String(
        cruzaMeiaNoite
          ? 1440 - inicioMinutos + fimMinutos
          : fimMinutos - inicioMinutos,
      );
      if (viraDia) viraDia.checked = cruzaMeiaNoite;
      atualizarPreview();
    }
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
    <form
      ref={formRef}
      action={formAction}
      className="space-y-6"
      onChange={() => atualizarPreview()}
      onInput={() => atualizarPreview()}
    >
      <input type="hidden" name="orgaoId" defaultValue={campos?.orgaoId ?? ""} />
      <input type="hidden" name="versao" defaultValue={campos?.versao ?? 1} />
      <input
        type="hidden"
        name="situacao"
        defaultValue={campos?.situacao ?? "ATIVA"}
      />

      {estado.mensagem && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {estado.mensagem}
        </div>
      )}

      <div className="rounded-xl border bg-[var(--card)] p-4 text-[var(--card-foreground)] shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          {etapasJornada.map((etapa, indice) => {
            const ativa = etapaAtual === etapa.id;
            const concluida =
              etapasJornada.findIndex((item) => item.id === etapaAtual) > indice;
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
          <fieldset
            disabled={somenteLeitura}
            className={somenteLeitura ? "contents" : "contents"}
          >
          <section id="jornada-etapa-tipo" className={classePainel(etapaAtual, "tipo")}>
            <CabecalhoEtapa
              numero="1"
              titulo="Escolha o tipo da jornada"
              descricao="Defina a identidade da jornada e o regime. A escolha do tipo orienta as regras das próximas etapas."
            />

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <CampoTexto
                id="codigo"
                label="Código"
                descricao="Identificador curto usado em listagens, integrações e auditoria."
                defaultValue={campos?.codigo ?? ""}
                placeholder="JORNADA_7H"
                required
                uppercase
              />
              <CampoErro estado={estado} campo="codigo" />
              <CampoTexto
                id="nome"
                label="Nome"
                descricao="Nome que o usuário verá ao escolher ou atribuir a jornada."
                defaultValue={campos?.nome ?? ""}
                required
              />
              <CampoErro estado={estado} campo="nome" />

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="tipo" className="text-sm font-semibold">
                  Tipo
                </label>
                <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                  Define quais regras de carga, horário, escala e apuração serão
                  aplicadas à pessoa.
                </p>
                <select
                  id="tipo"
                  name="tipo"
                  defaultValue={tipoSelecionado}
                  onChange={(evento) => {
                    const novoTipo = evento.target.value;
                    setTipoSelecionado(novoTipo);
                    window.requestAnimationFrame(() => atualizarPreview(novoTipo));
                  }}
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                  required
                >
                  {tiposJornada.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {rotulosTipo[tipo] ?? tipo}
                    </option>
                  ))}
                </select>
                <CampoErro estado={estado} campo="tipo" />
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100 md:col-span-2">
                <p className="font-semibold">{rotulosTipo[tipoSelecionado]}</p>
                <p className="mt-1 leading-6">{contextoTipo.descricao}</p>
                {contextoTipo.usaCiclo && (
                  <p className="mt-2 leading-6">
                    A jornada guarda as regras gerais. O ciclo real, com
                    posições e data de ancoragem, é cadastrado no detalhe da
                    jornada em &quot;Cadastrar escala&quot;.
                  </p>
                )}
                {contextoTipo.semControle && (
                  <p className="mt-2 leading-6">
                    Para esse tipo, deixe &quot;Controla horário&quot; desmarcado quando
                    a pessoa não deve gerar falta por ausência de marcações
                    ordinárias.
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="descricao" className="text-sm font-semibold">
                  Descrição
                </label>
                <textarea
                  id="descricao"
                  name="descricao"
                  defaultValue={campos?.descricao ?? ""}
                  rows={4}
                  className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                />
                <CampoErro estado={estado} campo="descricao" />
              </div>
            </div>
          </section>

          <section
            id="jornada-etapa-regras"
            className={classePainel(etapaAtual, "regras")}
          >
            <CabecalhoEtapa
              numero="2"
              titulo="Configure carga e regras"
              descricao="Informe horários, intervalos, flexibilidade e parâmetros exigidos pelo tipo selecionado."
            />

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <CampoNumero
                id="cargaDiariaMinutos"
                label="Carga diária em minutos"
                descricao="Quantidade esperada de trabalho por dia; 420 representa 7 horas."
                defaultValue={campos?.cargaDiariaMinutos ?? 420}
                min={0}
                max={720}
                required
              />
              <CampoErro estado={estado} campo="cargaDiariaMinutos" />
              <CampoHora
                id="horarioEntradaPadrao"
                label="Entrada padrão"
                descricao="Horário previsto de início quando a jornada controla marcações."
                defaultValue={campos?.horarioEntradaPadrao ?? ""}
              />
              <CampoErro estado={estado} campo="horarioEntradaPadrao" />
              <CampoHora
                id="horarioSaidaPadrao"
                label="Saída padrão"
                descricao="Horário previsto de término, usado para apuração e comparação."
                defaultValue={campos?.horarioSaidaPadrao ?? ""}
              />
              <CampoErro estado={estado} campo="horarioSaidaPadrao" />
              <CampoHora
                id="horarioLimiteVirada"
                label="Limite da virada"
                descricao="Hora máxima para considerar uma marcação como continuação do dia anterior."
                defaultValue={campos?.horarioLimiteVirada ?? ""}
              />
              <CampoErro estado={estado} campo="horarioLimiteVirada" />
              <CampoNumero
                id="intervaloMinimoMinutos"
                label="Intervalo mínimo"
                descricao="Menor intervalo aceito para repouso ou alimentação."
                defaultValue={campos?.intervaloMinimoMinutos ?? ""}
                placeholder="60"
              />
              <CampoErro estado={estado} campo="intervaloMinimoMinutos" />
              <CampoNumero
                id="intervaloMaximoMinutos"
                label="Intervalo máximo"
                descricao="Maior intervalo aceito antes de gerar inconsistência."
                defaultValue={campos?.intervaloMaximoMinutos ?? ""}
                placeholder="180"
              />
              <CampoErro estado={estado} campo="intervaloMaximoMinutos" />
              <CampoHora
                id="entradaMinimaDiferenciada"
                label="Entrada minima diferenciada"
                descricao="Primeiro horário permitido para autorizações individuais diferenciadas."
                defaultValue={campos?.entradaMinimaDiferenciada ?? ""}
              />
              <CampoErro estado={estado} campo="entradaMinimaDiferenciada" />
              <CampoHora
                id="saidaMaximaDiferenciada"
                label="Saída máxima diferenciada"
                descricao="Último horário permitido para autorizações individuais diferenciadas."
                defaultValue={campos?.saidaMaximaDiferenciada ?? ""}
              />
              <CampoErro estado={estado} campo="saidaMaximaDiferenciada" />
              <CampoHora
                id="nucleoObrigatorioInicio"
                label="Núcleo obrigatório - início"
                descricao="Início do período em que a presença é obrigatória nas jornadas flexíveis."
                defaultValue={campos?.nucleoObrigatorioInicio ?? ""}
              />
              <CampoErro estado={estado} campo="nucleoObrigatorioInicio" />
              <CampoHora
                id="nucleoObrigatorioFim"
                label="Núcleo obrigatório - fim"
                descricao="Fim do período em que a presença é obrigatória nas jornadas flexíveis."
                defaultValue={campos?.nucleoObrigatorioFim ?? ""}
              />
              <CampoErro estado={estado} campo="nucleoObrigatorioFim" />
              <CampoNumero
                id="permanenciaMaximaMinutos"
                label="Permanencia maxima em minutos"
                descricao="Tempo máximo de permanência diária admitido para essa jornada."
                defaultValue={campos?.permanenciaMaximaMinutos ?? ""}
                placeholder="720"
              />
              <CampoErro estado={estado} campo="permanenciaMaximaMinutos" />
              <CampoNumero
                id="cargaMinimaDiariaMinutos"
                label="Carga mínima diária em minutos"
                descricao="Carga mínima aceita no dia antes de gerar débito ou pendência."
                defaultValue={campos?.cargaMinimaDiariaMinutos ?? ""}
              />
              <CampoErro estado={estado} campo="cargaMinimaDiariaMinutos" />
              <CampoNumero
                id="cargaMaximaDiariaMinutos"
                label="Carga máxima diária em minutos"
                descricao="Limite diário usado para alertas, banco de horas ou hora extra."
                defaultValue={campos?.cargaMaximaDiariaMinutos ?? ""}
              />
              <CampoErro estado={estado} campo="cargaMaximaDiariaMinutos" />
              <CampoNumero
                id="cargaSemanalMinutos"
                label="Carga semanal em minutos"
                descricao="Carga esperada na semana para jornadas controladas por total semanal."
                defaultValue={campos?.cargaSemanalMinutos ?? ""}
                placeholder="2100"
              />
              <CampoErro estado={estado} campo="cargaSemanalMinutos" />
              <CampoNumero
                id="cargaMensalMinutos"
                label="Carga mensal em minutos"
                descricao="Carga esperada na competência para jornadas controladas por total mensal."
                defaultValue={campos?.cargaMensalMinutos ?? ""}
                placeholder="9000"
              />
              <CampoErro estado={estado} campo="cargaMensalMinutos" />

              <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
                <ParametroCheckbox
                  name="exigeIntervalo"
                  label="Exige intervalo"
                  descricao="Obriga marcações de saída e retorno do intervalo e valida os limites informados."
                  defaultChecked={campos?.exigeIntervalo ?? false}
                />
                <CampoErro estado={estado} campo="exigeIntervalo" />
                <ParametroCheckbox
                  name="horarioDiferenciadoPermitido"
                  label="Permite horário diferenciado"
                  descricao="Habilita autorização individual para trabalhar dentro da janela diferenciada cadastrada."
                  defaultChecked={campos?.horarioDiferenciadoPermitido ?? false}
                />
                <CampoErro estado={estado} campo="horarioDiferenciadoPermitido" />
                {[
                  [
                    "controlaHorario",
                    campos?.controlaHorario ?? !contextoTipo.semControle,
                  ],
                  [
                    "permiteFlexibilidade",
                    campos?.permiteFlexibilidade ?? contextoTipo.usaCiclo,
                  ],
                  ["permiteBancoHoras", campos?.permiteBancoHoras ?? true],
                  ["permiteHoraExtra", campos?.permiteHoraExtra ?? false],
                  [
                    "cruzaMeiaNoite",
                    campos?.cruzaMeiaNoite ?? contextoTipo.jornadaNoturna,
                  ],
                ].map(([name, checked]) => (
                  <ParametroCheckbox
                    key={String(name)}
                    name={String(name)}
                    label={descricoesParametros[String(name)].label}
                    descricao={descricoesParametros[String(name)].descricao}
                    defaultChecked={Boolean(checked)}
                  />
                ))}
              </div>
            </div>
          </section>

          <section
            id="jornada-etapa-previsao"
            className={classePainel(etapaAtual, "previsao")}
          >
            <CabecalhoEtapa
              numero="3"
              titulo="Monte a previsão semanal"
              descricao="Configure dias, carga prevista, faixa principal e nucleo obrigatorio. Em jornadas ciclicas, esta grade serve como referencia geral."
            />

            <div className="mt-5 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
                  <tr>
                    <CabecalhoTabela titulo="Dia" descricao="Dia da semana previsto." />
                    <CabecalhoTabela titulo="Tipo" descricao="Trabalho, folga, plantão ou compensação." />
                    <CabecalhoTabela titulo="Carga" descricao="Minutos esperados no dia." />
                    <CabecalhoTabela titulo="Início" descricao="Hora inicial da faixa principal." />
                    <CabecalhoTabela titulo="Fim" descricao="Hora final; recalcula a carga." />
                    <CabecalhoTabela titulo="Núcleo início" descricao="Começo da presença obrigatória." />
                    <CabecalhoTabela titulo="Núcleo fim" descricao="Fim da presença obrigatória." />
                    <CabecalhoTabela titulo="Vira dia" descricao="Marca faixas que terminam no dia seguinte." />
                  </tr>
                </thead>
                <tbody>
                  {diasSemana.map((diaSemana) => {
                    const prefixo = `dias.${diaSemana}`;
                    const dia = obterDia(campos, diaSemana);
                    const faixaTrabalho = obterFaixa(
                      campos,
                      diaSemana,
                      "TRABALHO",
                    );
                    const faixaNucleo = obterFaixa(
                      campos,
                      diaSemana,
                      "NUCLEO_OBRIGATORIO",
                    );
                    const trabalhaPadrao = diaPadrao(diaSemana);

                    return (
                      <tr key={diaSemana} className="border-b last:border-b-0">
                        <td className="px-3 py-3 font-semibold">
                          {rotulosDia[diaSemana]}
                        </td>
                        <td className="px-3 py-3">
                          <select
                            name={`${prefixo}.tipoDia`}
                            defaultValue={
                              dia?.tipoDia ??
                              (trabalhaPadrao ? "TRABALHO" : "FOLGA")
                            }
                            className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm"
                          >
                            {tiposDiaJornada.map((tipoDia) => (
                              <option key={tipoDia} value={tipoDia}>
                                {rotulosTipoDia[tipoDia]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min={0}
                            max={1440}
                            name={`${prefixo}.cargaPrevistaMinutos`}
                            onChange={() => sincronizarPrevisao(prefixo, "carga")}
                            defaultValue={
                              dia?.cargaPrevistaMinutos ??
                              (trabalhaPadrao
                                ? (campos?.cargaDiariaMinutos ?? 420)
                                : 0)
                            }
                            className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="time"
                            name={`${prefixo}.faixaTrabalhoInicio`}
                            onChange={() => sincronizarPrevisao(prefixo, "inicio")}
                            defaultValue={
                              faixaTrabalho?.horaInicio ??
                              (trabalhaPadrao
                                ? (campos?.horarioEntradaPadrao ?? "")
                                : "")
                            }
                            className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="time"
                            name={`${prefixo}.faixaTrabalhoFim`}
                            onChange={() => sincronizarPrevisao(prefixo, "fim")}
                            defaultValue={
                              faixaTrabalho?.horaFim ??
                              (trabalhaPadrao
                                ? (campos?.horarioSaidaPadrao ?? "")
                                : "")
                            }
                            className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="time"
                            name={`${prefixo}.faixaNucleoInicio`}
                            defaultValue={
                              faixaNucleo?.horaInicio ??
                              (trabalhaPadrao
                                ? (campos?.nucleoObrigatorioInicio ?? "")
                                : "")
                            }
                            className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="time"
                            name={`${prefixo}.faixaNucleoFim`}
                            defaultValue={
                              faixaNucleo?.horaFim ??
                              (trabalhaPadrao
                                ? (campos?.nucleoObrigatorioFim ?? "")
                                : "")
                            }
                            className="h-10 w-full rounded-md border bg-[var(--card)] px-2 text-sm"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            name={`${prefixo}.cruzaMeiaNoite`}
                            defaultChecked={Boolean(
                              faixaTrabalho?.cruzaMeiaNoite ??
                                campos?.cruzaMeiaNoite,
                            )}
                            className="size-4 rounded border-slate-300"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <CampoErro estado={estado} campo="dias" />
          </section>

          <section
            id="jornada-etapa-revisao"
            className={classePainel(etapaAtual, "revisao")}
          >
            <CabecalhoEtapa
              numero="4"
              titulo="Revise e salve"
              descricao="Confirme fundamento, vigência e situação antes de disponibilizar a jornada para atribuição."
            />

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor="fundamentoNormativo"
                  className="text-sm font-semibold"
                >
                  Fundamento normativo
                </label>
                <input
                  id="fundamentoNormativo"
                  name="fundamentoNormativo"
                  defaultValue={campos?.fundamentoNormativo ?? ""}
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                  placeholder="Portaria, resolução, ato ou regulamento"
                />
                <CampoErro estado={estado} campo="fundamentoNormativo" />
              </div>
              <CampoData
                id="vigenciaInicio"
                label="Vigencia inicial"
                descricao="Data a partir da qual a jornada pode ser atribuída e apurada."
                defaultValue={formatarDataInput(campos?.vigenciaInicio)}
              />
              <CampoErro estado={estado} campo="vigenciaInicio" />
              <CampoData
                id="vigenciaFim"
                label="Vigencia final"
                descricao="Data final de validade; deixe em branco para vigência indeterminada."
                defaultValue={formatarDataInput(campos?.vigenciaFim)}
              />
              <CampoErro estado={estado} campo="vigenciaFim" />
              <ParametroCheckbox
                name="ativo"
                label="Jornada ativa"
                descricao="Jornadas inativas não devem ser atribuídas a novos servidores."
                defaultChecked={campos?.ativo ?? true}
                className="md:col-span-2"
              />
            </div>
          </section>
          </fieldset>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => moverEtapa(-1)}
              disabled={etapaAtual === "tipo"}
              className="inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-semibold transition hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Voltar
            </button>
            <div className="flex flex-col gap-3 sm:flex-row">
              {etapaAtual !== "revisao" && (
                <button
                  type="button"
                  onClick={() => moverEtapa(1)}
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
                  {modo === "criar" ? "Criar jornada" : "Salvar alterações"}
                </button>
              )}
              {etapaAtual === "revisao" && somenteLeitura && (
                <span className="inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-semibold text-[var(--muted-foreground)]">
                  Modo consulta
                </span>
              )}
            </div>
          </div>
        </div>

        <PreviewJornada preview={preview} />
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

function CabecalhoTabela({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <th className="px-3 py-3 align-top">
      <span className="block font-semibold text-[var(--foreground)]">
        {titulo}
      </span>
      <span className="mt-1 block normal-case leading-4 text-[var(--muted-foreground)]">
        {descricao}
      </span>
    </th>
  );
}

function CampoTexto({
  id,
  label,
  descricao,
  defaultValue,
  placeholder,
  required,
  uppercase,
}: {
  id: string;
  label: string;
  descricao?: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
  uppercase?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {descricao && (
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">
          {descricao}
        </p>
      )}
      <input
        id={id}
        name={id}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className={[
          "h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20",
          uppercase ? "uppercase" : "",
        ].join(" ")}
      />
    </div>
  );
}

function CampoNumero({
  id,
  label,
  descricao,
  defaultValue,
  placeholder,
  min,
  max,
  required,
}: {
  id: string;
  label: string;
  descricao?: string;
  defaultValue: string | number;
  placeholder?: string;
  min?: number;
  max?: number;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {descricao && (
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">
          {descricao}
        </p>
      )}
      <input
        id={id}
        name={id}
        type="number"
        min={min}
        max={max}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
      />
    </div>
  );
}

function CampoHora({
  id,
  label,
  descricao,
  defaultValue,
}: {
  id: string;
  label: string;
  descricao?: string;
  defaultValue: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {descricao && (
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">
          {descricao}
        </p>
      )}
      <input
        id={id}
        name={id}
        type="time"
        defaultValue={defaultValue}
        className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
      />
    </div>
  );
}

function CampoData({
  id,
  label,
  descricao,
  defaultValue,
}: {
  id: string;
  label: string;
  descricao?: string;
  defaultValue: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {descricao && (
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">
          {descricao}
        </p>
      )}
      <input
        id={id}
        name={id}
        type="date"
        defaultValue={defaultValue}
        className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
      />
    </div>
  );
}

function ParametroCheckbox({
  name,
  label,
  descricao,
  defaultChecked,
  className,
}: {
  name: string;
  label: string;
  descricao: string;
  defaultChecked: boolean;
  className?: string;
}) {
  return (
    <label
      className={[
        "flex items-start gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm",
        className ?? "",
      ].join(" ")}
    >
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 rounded border-slate-300"
      />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="text-xs leading-5 text-[var(--muted-foreground)]">
          {descricao}
        </span>
      </span>
    </label>
  );
}

function PreviewJornada({ preview }: { preview: JornadaPreview }) {
  return (
    <aside className="xl:sticky xl:top-6 xl:self-start">
      <div className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-800">
              Pré-visualização
            </p>
            <h3 className="mt-1 text-lg font-bold">
              {preview.nome || "Nova jornada"}
            </h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {preview.codigo || "Código ainda não informado"}
            </p>
          </div>
          <CalendarDays className="size-5 text-blue-800" />
        </div>

        <div className="mt-5 rounded-lg border bg-[var(--muted)] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">
              {rotulosTipo[preview.tipo] ?? preview.tipo}
            </span>
            <span className="rounded-full bg-blue-900 px-2.5 py-1 text-xs font-semibold text-white">
              {minutosParaHoraLegivel(preview.cargaDiariaMinutos)}/dia
            </span>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">
            {descricoesTipo[preview.tipo] ?? ""}
          </p>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <ResumoItem label="Entrada" value={valorOuTraco(preview.horarioEntradaPadrao)} />
          <ResumoItem label="Saída" value={valorOuTraco(preview.horarioSaidaPadrao)} />
          <ResumoItem label="Trabalho" value={`${preview.diasTrabalho} dias`} />
          <ResumoItem label="Folga" value={`${preview.diasFolga} dias`} />
          <ResumoItem
            label="Semanal"
            value={minutosParaHoraLegivel(preview.cargaSemanalMinutos)}
          />
          <ResumoItem
            label="Mensal"
            value={minutosParaHoraLegivel(preview.cargaMensalMinutos)}
          />
        </dl>

        <div className="mt-5 space-y-2 text-sm">
          {[
            ["Controla horário", preview.controlaHorario],
            ["Exige intervalo", preview.exigeIntervalo],
            ["Flexivel", preview.permiteFlexibilidade],
            ["Banco de horas", preview.permiteBancoHoras],
            ["Hora extra", preview.permiteHoraExtra],
            ["Vira dia", preview.cruzaMeiaNoite],
            ["Horário diferenciado", preview.horarioDiferenciadoPermitido],
          ].map(([label, ativo]) => (
            <div key={String(label)} className="flex items-center justify-between gap-3">
              <span className="text-[var(--muted-foreground)]">
                {String(label)}
              </span>
              <span
                className={[
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  ativo
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300",
                ].join(" ")}
              >
                {ativo ? "Sim" : "Não"}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg border border-dashed p-3 text-xs leading-5 text-[var(--muted-foreground)]">
          <p className="font-semibold text-[var(--foreground)]">
            Efeito prático ao associar à pessoa
          </p>
          <p className="mt-1">
            A jornada ativa define a carga esperada, a comparação das marcações,
            a movimentação de banco de horas e a regra de homologação no período
            de vigência.
          </p>
        </div>
      </div>
    </aside>
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
