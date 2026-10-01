"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Loader2,
  Paperclip,
  Send,
  Settings2,
  Trash2,
  UploadCloud,
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
import { gerarTituloSolicitacao } from "../../application/services/titulo-solicitacao.service";

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
    titulo: "Período",
    descricao: "Data e horários",
    icon: CalendarDays,
    campos: ["dataReferencia", "dataInicio", "dataFim"],
  },
  {
    id: "detalhes",
    titulo: "Detalhes",
    descricao: "Dados específicos",
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
    descricao: "Fundamento e anexos",
    icon: FileText,
    campos: ["descricao", "anexos"],
  },
] as const;

type EtapaIndice = 0 | 1 | 2 | 3;

type SolicitacaoPreview = {
  tipo: string;
  titulo: string;
  periodo: string;
  detalhe: string;
  justificativa: string;
  encaminhamento: string;
};

type TipoSolicitacao = (typeof tiposSolicitacao)[number];

type AnexoFormulario = {
  id: string;
  file: File;
  descricao: string;
  previewUrl: string;
};

type SolicitacaoFormProps = {
  tipoInicial?: TipoSolicitacao;
  valoresIniciais?: CriarSolicitacaoFormState["campos"];
  etapaInicial?: EtapaIndice;
  action?: (
    state: CriarSolicitacaoFormState,
    formData: FormData,
  ) => Promise<CriarSolicitacaoFormState>;
  submitLabel?: string;
  hiddenFields?: Record<string, string>;
};

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
      detalhes: "AJUSTE" | "BANCO_HORAS" | "REMOTO" | "CAPACITACAO" | "SIMPLES";
    }
  > = {
    AJUSTE_PONTO: {
      resumo:
        "Use para corrigir uma entrada, saída ou retorno que não foi capturado corretamente.",
      periodo: "DATA_REFERENCIA",
      detalhes: "AJUSTE",
    },
    COMPENSACAO: {
      resumo:
        "Use para solicitar autorização de compensação vinculada ao banco de horas.",
      periodo: "INTERVALO",
      detalhes: "BANCO_HORAS",
    },
    HORA_CREDITO_PREVIA: {
      resumo:
        "Use para solicitar autorização prévia de horas que poderão gerar crédito.",
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
        "Use para registrar dispensa de ponto, teletrabalho integral ou regime híbrido.",
      periodo: "INTERVALO",
      detalhes: "REMOTO",
    },
    CAPACITACAO: {
      resumo:
        "Use para registrar capacitação autorizada; capacitação interna exige registro biométrico no dia.",
      periodo: "INTERVALO",
      detalhes: "CAPACITACAO",
    },
  };

  return (
    configuracoes[tipo] ?? {
      resumo:
        "Use para registrar evento autorizado que impacta a frequência no período informado.",
      periodo: "INTERVALO",
      detalhes: "SIMPLES",
    }
  );
}

function validarEtapaFormulario(etapa: number, formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "AJUSTE_PONTO");
  const falhas: string[] = [];

  if (etapa === 0 && !tipo) {
    falhas.push("Selecione o tipo da solicitação.");
  }

  if (etapa === 1) {
    if (tipo === "AJUSTE_PONTO" && !formData.get("dataReferencia")) {
      falhas.push("Informe a data do ajuste.");
    }

    if (isTipoPeriodo(tipo)) {
      if (!formData.get("dataInicio")) {
        falhas.push("Informe o início do período.");
      }

      if (!formData.get("dataFim")) {
        falhas.push("Informe o fim do período.");
      }
    }
  }

  if (etapa === 2) {
    if (tipo === "AJUSTE_PONTO") {
      if (!formData.get("tipoMarcacao")) {
        falhas.push("Selecione a marcação a ajustar.");
      }

      if (!formData.get("horaAjuste")) {
        falhas.push("Informe o horário solicitado.");
      }
    }

    if (tipo === "HORA_CREDITO_PREVIA") {
      if (!formData.get("horasSolicitadas")) {
        falhas.push("Informe a quantidade de horas.");
      }
    }

    if (tipo === "COMPENSACAO" && !formData.get("tipoCompensacao")) {
      falhas.push("Informe a modalidade da compensação.");
    }

    if (tipo === "CAPACITACAO" && !formData.get("modalidadeCapacitacao")) {
      falhas.push("Informe se a capacitação é interna ou externa.");
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
    const descricao = String(formData.get("descricao") ?? "").trim();
    const anexos = formData
      .getAll("anexos")
      .filter(
        (valor): valor is File => valor instanceof File && valor.size > 0,
      );
    const descricoesAnexos = formData
      .getAll("anexoDescricoes")
      .map((valor) => String(valor ?? "").trim());

    if (descricao.length < 10) {
      falhas.push("Descreva a solicitação com mais detalhes.");
    }

    anexos.forEach((anexo, indice) => {
      const descricaoAnexo = descricoesAnexos[indice] ?? "";

      if (
        anexo.type !== "application/pdf" &&
        !anexo.name.toLocaleLowerCase("pt-BR").endsWith(".pdf")
      ) {
        falhas.push(`O anexo ${indice + 1} deve ser um arquivo PDF.`);
      }

      if (descricaoAnexo.length < 3) {
        falhas.push(`Informe a descrição do anexo ${indice + 1}.`);
      }
    });
  }

  return falhas;
}

function formatarValorAusente(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();
  return texto || "Não informado";
}

function horasDecimaisParaHoraMinuto(valor?: number | string | null) {
  const numero =
    typeof valor === "number"
      ? valor
      : Number(String(valor ?? "").replace(",", "."));

  if (!Number.isFinite(numero) || numero <= 0) {
    return "";
  }

  const minutosTotais = Math.round(numero * 60);
  const horas = Math.floor(minutosTotais / 60);
  const minutos = minutosTotais % 60;

  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function formatarHorasSolicitadasPreview(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();

  if (!texto) {
    return "Não informado";
  }

  if (/^\d{1,2}:[0-5]\d$/.test(texto)) {
    const [horas, minutos] = texto.split(":");
    return `${horas.padStart(2, "0")}:${minutos}`;
  }

  return horasDecimaisParaHoraMinuto(texto) || texto;
}

function formatarDataPreview(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();

  if (!texto) {
    return "Não informado";
  }

  const [data, hora] = texto.split("T");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);

  if (!match) {
    return texto;
  }

  const dataFormatada = `${match[3]}/${match[2]}/${match[1]}`;
  return hora ? `${dataFormatada} ${hora.slice(0, 5)}` : dataFormatada;
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

function montarPeriodoPreview(formData: FormData, tipo: string) {
  if (tipo === "AJUSTE_PONTO") {
    return `Data de referência: ${formatarDataPreview(
      formData.get("dataReferencia"),
    )}`;
  }

  const inicio = formatarDataPreview(formData.get("dataInicio"));
  const fim = formatarDataPreview(formData.get("dataFim"));
  return `${inicio} até ${fim}`;
}

function montarDetalhePreview(formData: FormData, tipo: string) {
  if (tipo === "AJUSTE_PONTO") {
    return `${rotuloMarcacao(
      String(formData.get("tipoMarcacao") ?? ""),
    )} às ${formatarValorAusente(formData.get("horaAjuste"))}`;
  }

  if (tipo === "COMPENSACAO") {
    return rotuloCompensacao(String(formData.get("tipoCompensacao") ?? ""));
  }

  if (tipo === "HORA_CREDITO_PREVIA") {
    return `${formatarHorasSolicitadasPreview(
      formData.get("horasSolicitadas"),
    )} solicitada(s)`;
  }

  if (tipo === "DISPENSA_PONTO") {
    const regime = String(formData.get("regimeTrabalhoRemotoTipo") ?? "");
    const dias = formData
      .getAll("diasRemotos")
      .map((dia) => rotuloDiaSemana(String(dia)));
    return dias.length > 0
      ? `${rotuloRegimeRemoto(regime)}: ${dias.join(", ")}`
      : rotuloRegimeRemoto(regime);
  }

  if (tipo === "CAPACITACAO") {
    return rotuloModalidadeCapacitacao(
      String(formData.get("modalidadeCapacitacao") ?? ""),
    );
  }

  return "Sem parametrização adicional.";
}

function criarPreviewInicial(
  campos?: CriarSolicitacaoFormState["campos"],
): SolicitacaoPreview {
  const tipo = campos?.tipo ?? "AJUSTE_PONTO";
  const formData = new FormData();

  Object.entries(campos ?? {}).forEach(([chave, valor]) => {
    if (Array.isArray(valor)) {
      valor.forEach((item) => formData.append(chave, String(item)));
      return;
    }

    if (valor !== undefined && valor !== null) {
      formData.set(chave, String(valor));
    }
  });

  formData.set("tipo", tipo);

  return {
    tipo: rotuloTipoSolicitacao(tipo),
    titulo: gerarTituloSolicitacao({
      tipo,
      dataReferencia: campos?.dataReferencia,
      dataInicio: campos?.dataInicio,
      dataFim: campos?.dataFim,
    }),
    periodo: montarPeriodoPreview(formData, tipo),
    detalhe: montarDetalhePreview(formData, tipo),
    justificativa: campos?.descricao || "A justificativa aparecerá aqui.",
    encaminhamento:
      "Após o envio, a solicitação seguirá para análise da chefia.",
  };
}

function classePainel(etapaAtual: number, etapa: number) {
  return [
    "rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm",
    etapaAtual === etapa ? "block" : "hidden",
  ].join(" ");
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
    <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-900 text-sm font-bold text-white">
        {numero}
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-bold">{titulo}</h2>
        <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
          {descricao}
        </p>
      </div>
    </div>
  );
}

function CampoAjuda({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs leading-5 text-[var(--muted-foreground)]">
      {children}
    </p>
  );
}

export function PreviewSolicitacao({
  preview,
  titulo = "Pré-visualização",
}: {
  preview: SolicitacaoPreview;
  titulo?: string;
}) {
  const itens = [
    ["Tipo", preview.tipo],
    ["Período", preview.periodo],
    ["Detalhes", preview.detalhe],
    ["Encaminhamento", preview.encaminhamento],
  ];

  return (
    <aside className="xl:sticky xl:top-24 xl:self-start">
      <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-blue-900" aria-hidden="true" />
          <h2 className="text-base font-bold">{titulo}</h2>
        </div>
        <div className="mt-4 rounded-lg border bg-[var(--muted)] p-4">
          <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
            Título
          </p>
          <p className="mt-1 text-sm font-bold">{preview.titulo}</p>
        </div>
        <dl className="mt-4 space-y-3">
          {itens.map(([label, valor]) => (
            <div key={label} className="rounded-lg border p-3">
              <dt className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
                {label}
              </dt>
              <dd className="mt-1 text-sm leading-6">{valor}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
          {preview.justificativa}
        </div>
      </div>
    </aside>
  );
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
      aria-label="Progresso da solicitação"
      className="rounded-xl border bg-[var(--card)] p-4 text-[var(--card-foreground)] shadow-sm"
    >
      <ol className="flex flex-col gap-3 lg:flex-row">
        {etapas.map((etapa, indice) => {
          const Icon = etapa.icon;
          const concluida = indice < etapaAtual;
          const ativa = indice === etapaAtual;
          const liberada = indice <= etapaMaxima;
          const comErro = etapaComErro === indice;

          return (
            <li key={etapa.id} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => liberada && setEtapaAtual(indice as EtapaIndice)}
                disabled={!liberada}
                className={[
                  "flex min-h-20 w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition",
                  ativa
                    ? "border-blue-800 bg-blue-50 text-blue-950 shadow-sm dark:border-blue-500 dark:bg-blue-950 dark:text-blue-100"
                    : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] hover:border-blue-300",
                  !liberada ? "cursor-not-allowed opacity-50" : "",
                  comErro ? "border-red-500 bg-red-50 text-red-700" : "",
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
                    comErro ? "border-red-500 bg-red-600 text-white" : "",
                  ].join(" ")}
                >
                  {concluida ? (
                    <CheckCircle2 className="size-5" aria-hidden="true" />
                  ) : (
                    <Icon className="size-5" aria-hidden="true" />
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
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SolicitacaoForm({
  tipoInicial,
  valoresIniciais,
  etapaInicial = 0,
  action = criarSolicitacaoAction,
  submitLabel = "Enviar solicitação",
  hiddenFields,
}: SolicitacaoFormProps = {}) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const anexosRef = useRef<AnexoFormulario[]>([]);
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const campos = estado.campos ?? valoresIniciais;
  const [etapaAtual, setEtapaAtual] = useState<EtapaIndice>(etapaInicial);
  const [etapaMaxima, setEtapaMaxima] = useState<number>(etapaInicial);
  const [falhasEtapa, setFalhasEtapa] = useState<string[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>(
    campos?.tipo ?? tipoInicial ?? "AJUSTE_PONTO",
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
  const [anexos, setAnexos] = useState<AnexoFormulario[]>([]);
  const [preview, setPreview] = useState<SolicitacaoPreview>(() =>
    criarPreviewInicial(campos ?? { tipo: tipoInicial ?? "AJUSTE_PONTO" }),
  );

  const configuracaoTipo = obterConfiguracaoTipo(tipoSelecionado);
  const exigePeriodo = configuracaoTipo.periodo === "INTERVALO";
  const etapaErroServidor = useMemo(
    () => primeiraEtapaComErro(estado),
    [estado],
  );

  /* eslint-disable react-hooks/set-state-in-effect -- Server action state restores the failed step and controlled fields after validation errors. */
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
    setPreview(criarPreviewInicial(campos));
  }, [campos]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    anexosRef.current = anexos;
  }, [anexos]);

  useEffect(() => {
    return () => {
      anexosRef.current.forEach((anexo) =>
        URL.revokeObjectURL(anexo.previewUrl),
      );
    };
  }, []);

  function sincronizarInputArquivos(proximosAnexos: AnexoFormulario[]) {
    if (!fileInputRef.current) {
      return;
    }

    const dataTransfer = new DataTransfer();
    proximosAnexos.forEach((anexo) => dataTransfer.items.add(anexo.file));
    fileInputRef.current.files = dataTransfer.files;
  }

  function atualizarAnexos(
    resolver: (atuais: AnexoFormulario[]) => AnexoFormulario[],
  ) {
    setAnexos((atuais) => {
      const proximos = resolver(atuais);
      anexosRef.current = proximos;
      sincronizarInputArquivos(proximos);
      return proximos;
    });
  }

  function adicionarArquivos(files: FileList | null) {
    const selecionados = Array.from(files ?? []);

    if (selecionados.length === 0) {
      return;
    }

    atualizarAnexos((atuais) => [
      ...atuais,
      ...selecionados.map((file) => {
        const id =
          globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        return {
          id: `${file.name}-${file.size}-${file.lastModified}-${id}`,
          file,
          descricao: "",
          previewUrl: URL.createObjectURL(file),
        };
      }),
    ]);
  }

  function removerAnexo(id: string) {
    atualizarAnexos((atuais) => {
      const removido = atuais.find((anexo) => anexo.id === id);
      if (removido) {
        URL.revokeObjectURL(removido.previewUrl);
      }
      return atuais.filter((anexo) => anexo.id !== id);
    });
  }

  function atualizarDescricaoAnexo(id: string, descricao: string) {
    atualizarAnexos((atuais) =>
      atuais.map((anexo) =>
        anexo.id === id ? { ...anexo, descricao } : anexo,
      ),
    );
  }

  function atualizarPreview(tipo = tipoSelecionado) {
    if (!formRef.current) {
      return;
    }

    const formData = new FormData(formRef.current);
    formData.set("tipo", tipo);

    setPreview({
      tipo: rotuloTipoSolicitacao(tipo),
      titulo: gerarTituloSolicitacao({
        tipo,
        dataReferencia: String(formData.get("dataReferencia") ?? ""),
        dataInicio: String(formData.get("dataInicio") ?? ""),
        dataFim: String(formData.get("dataFim") ?? ""),
      }),
      periodo: montarPeriodoPreview(formData, tipo),
      detalhe: montarDetalhePreview(formData, tipo),
      justificativa:
        String(formData.get("descricao") ?? "").trim() ||
        "A justificativa aparecerá aqui.",
      encaminhamento:
        "Após o envio, a solicitação seguirá para análise da chefia.",
    });
  }

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
    <form
      ref={formRef}
      action={formAction}
      encType="multipart/form-data"
      className="space-y-6"
      onChange={() => atualizarPreview()}
      onInput={() => atualizarPreview()}
    >
      {Object.entries(hiddenFields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section
            id="solicitacao-etapa-tipo"
            className={classePainel(etapaAtual, 0)}
          >
            <CabecalhoEtapa
              numero="1"
              titulo="Escolha o tipo da solicitação"
              descricao="Defina a natureza do pedido. Essa escolha orienta o período, os dados específicos e o fluxo de análise."
            />

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="tipo" className="text-sm font-semibold">
                  Tipo
                </label>
                <CampoAjuda>
                  Indica o efeito esperado na apuração: ajuste pontual, abono,
                  banco de horas, viagem, capacitação ou dispensa.
                </CampoAjuda>
                <select
                  id="tipo"
                  name="tipo"
                  defaultValue={tipoSelecionado}
                  onChange={(event) => {
                    const novoTipo = event.target.value;
                    setTipoSelecionado(novoTipo);
                    if (novoTipo !== "DISPENSA_PONTO") {
                      setRegimeRemoto("NAO_SE_APLICA");
                      setDiasRemotos([]);
                    }
                    window.requestAnimationFrame(() =>
                      atualizarPreview(novoTipo),
                    );
                  }}
                  className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
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
            id="solicitacao-etapa-periodo"
            className={classePainel(etapaAtual, 1)}
          >
            <CabecalhoEtapa
              numero="2"
              titulo="Informe o período de incidência"
              descricao="Para ajuste pontual, informe a data de referência. Para eventos por período, informe início e fim."
            />
            <div className="hidden">
              <h2 className="text-lg font-bold">Período de incidência</h2>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                Para ajuste pontual, informe a data de referência; para eventos
                por período, informe início e fim.
              </p>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {configuracaoTipo.periodo === "DATA_REFERENCIA" ? (
                <div className="space-y-2">
                  <label
                    htmlFor="dataReferencia"
                    className="text-sm font-semibold"
                  >
                    Data de referência
                  </label>
                  <CampoAjuda>
                    Dia em que a marcação deverá ser corrigida na frequência.
                  </CampoAjuda>
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
                    <label
                      htmlFor="dataInicio"
                      className="text-sm font-semibold"
                    >
                      {usaPeriodoPorData(tipoSelecionado)
                        ? "Data inicial"
                        : "Data/hora inicial"}
                    </label>
                    <CampoAjuda>
                      Início do evento que terá efeito na apuração da
                      frequência.
                    </CampoAjuda>
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
                    <CampoAjuda>
                      Fim do evento. Para intervalos, deve ser posterior ao
                      início.
                    </CampoAjuda>
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
                      <p className="text-sm text-red-600">
                        {erro(estado, "dataFim")}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          <section
            id="solicitacao-etapa-detalhes"
            className={classePainel(etapaAtual, 2)}
          >
            <CabecalhoEtapa
              numero="3"
              titulo="Configure os dados específicos"
              descricao="Complete apenas o bloco correspondente ao tipo selecionado. Os campos sem efeito prático ficam fora do caminho."
            />
            <div className="hidden">
              <h2 className="text-lg font-bold">Dados especificos</h2>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                Complete apenas o bloco correspondente ao tipo selecionado.
              </p>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {configuracaoTipo.detalhes === "AJUSTE" && (
                <>
                  <div className="space-y-2">
                    <label
                      htmlFor="tipoMarcacao"
                      className="text-sm font-semibold"
                    >
                      Tipo de marcação para ajuste
                    </label>
                    <CampoAjuda>
                      Escolha qual batida será criada ou corrigida no espelho.
                    </CampoAjuda>
                    <select
                      id="tipoMarcacao"
                      name="tipoMarcacao"
                      defaultValue={tipoMarcacao}
                      onChange={(event) => {
                        setTipoMarcacao(event.currentTarget.value);
                        window.requestAnimationFrame(() => atualizarPreview());
                      }}
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
                    <label
                      htmlFor="horaAjuste"
                      className="text-sm font-semibold"
                    >
                      Hora solicitada
                    </label>
                    <CampoAjuda>
                      Horário que deverá constar como marcação após aprovação.
                    </CampoAjuda>
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
                      <label
                        htmlFor="tipoCompensacao"
                        className="text-sm font-semibold"
                      >
                        Modalidade da compensação
                      </label>
                      <CampoAjuda>
                        Define se a compensação usa crédito existente ou
                        trabalho posterior para quitar débito.
                      </CampoAjuda>
                      <select
                        id="tipoCompensacao"
                        name="tipoCompensacao"
                        defaultValue={tipoCompensacao}
                        onChange={(event) => {
                          setTipoCompensacao(event.currentTarget.value);
                          window.requestAnimationFrame(() =>
                            atualizarPreview(),
                          );
                        }}
                        className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                      >
                        {tiposCompensacaoBancoHoras.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo === "UTILIZAR_CREDITO"
                              ? "Utilizar crédito para compensar débito"
                              : "Trabalhar horas para compensar débito"}
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
                      <CampoAjuda>
                        Total de horas que dependem de autorização prévia.
                      </CampoAjuda>
                      <input
                        id="horasSolicitadas"
                        name="horasSolicitadas"
                        type="time"
                        min="00:01"
                        max="16:00"
                        step={60}
                        inputMode="numeric"
                        pattern="[0-9]{2}:[0-9]{2}"
                        defaultValue={horasDecimaisParaHoraMinuto(
                          campos?.horasSolicitadas,
                        )}
                        className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                      />
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Informe no formato HH:MM.
                      </p>
                      {erro(estado, "horasSolicitadas") && (
                        <p className="text-sm text-red-600">
                          {erro(estado, "horasSolicitadas")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-[var(--muted)] p-4 text-sm leading-6 text-[var(--muted-foreground)] md:col-span-2">
                      O sistema calculará os minutos aplicáveis a partir do
                      período informado e das pendências/reflexos da apuração.
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
                      <CampoAjuda>
                        Indica se a dispensa terá efeito de teletrabalho total,
                        híbrido ou apenas afastamento do ponto.
                      </CampoAjuda>
                      <select
                        id="regimeTrabalhoRemotoTipo"
                        name="regimeTrabalhoRemotoTipo"
                        defaultValue={regimeRemoto}
                        onChange={(event) => {
                          const novoRegime = event.currentTarget.value;
                          setRegimeRemoto(novoRegime);
                          if (novoRegime !== "HIBRIDO") {
                            setDiasRemotos([]);
                          }
                          window.requestAnimationFrame(() =>
                            atualizarPreview(),
                          );
                        }}
                        className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                      >
                        <option value="NAO_SE_APLICA">
                          Dispensa sem teletrabalho
                        </option>
                        <option value="TOTAL">Teletrabalho 100%</option>
                        <option value="HIBRIDO">Regime híbrido</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Dias remotos</p>
                      <CampoAjuda>
                        No regime híbrido, informe em quais dias o trabalho será
                        remoto.
                      </CampoAjuda>
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
                        Modalidade da capacitação
                      </label>
                      <CampoAjuda>
                        Define como a capacitação será interpretada na apuração
                        do dia.
                      </CampoAjuda>
                      <select
                        id="modalidadeCapacitacao"
                        name="modalidadeCapacitacao"
                        defaultValue={modalidadeCapacitacao}
                        onChange={(event) => {
                          setModalidadeCapacitacao(event.currentTarget.value);
                          window.requestAnimationFrame(() =>
                            atualizarPreview(),
                          );
                        }}
                        className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
                      >
                        {modalidadesCapacitacao.map((modalidade) => (
                          <option key={modalidade} value={modalidade}>
                            {modalidade === "EXTERNA"
                              ? "Capacitação externa"
                              : "Capacitação interna"}
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
                        ? "A capacitação interna será considerada apenas quando houver registro biométrico no dia."
                        : "Capacitação externa com quatro horas ou mais cobre a jornada; abaixo disso exige complementação."}
                    </div>
                  </div>
                </div>
              )}

              {configuracaoTipo.detalhes === "SIMPLES" && (
                <div className="rounded-lg border bg-[var(--muted)] p-4 text-sm text-[var(--muted-foreground)] md:col-span-2">
                  Este tipo usa apenas período, título e justificativa.
                </div>
              )}
            </div>
          </section>

          <section
            id="solicitacao-etapa-justificativa"
            className={classePainel(etapaAtual, 3)}
          >
            <CabecalhoEtapa
              numero="4"
              titulo="Revise e envie"
              descricao="Registre a justificativa que será analisada pela chefia e, se necessário, anexe documentos em PDF."
            />
            <div className="hidden">
              <h2 className="text-lg font-bold">Justificativa e envio</h2>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                Registre a justificativa que será analisada pela chefia.
              </p>
            </div>

            <div className="mt-5 grid gap-5">
              <div className="space-y-2">
                <label htmlFor="descricao" className="text-sm font-semibold">
                  Justificativa
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

              <div className="space-y-3 rounded-lg border bg-[var(--muted)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Anexos em PDF</p>
                    <CampoAjuda>
                      Opcional. Inclua documentos que ajudem a chefia na análise
                      da solicitação.
                    </CampoAjuda>
                  </div>
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-[var(--card)] px-3 text-sm font-semibold transition hover:bg-[var(--accent)]">
                    <UploadCloud className="size-4" aria-hidden="true" />
                    Incluir PDF
                    <input
                      ref={fileInputRef}
                      type="file"
                      name="anexos"
                      accept="application/pdf,.pdf"
                      multiple
                      className="sr-only"
                      onChange={(event) =>
                        adicionarArquivos(event.currentTarget.files)
                      }
                    />
                  </label>
                </div>

                {erro(estado, "anexos") && (
                  <p className="text-sm text-red-600">
                    {erro(estado, "anexos")}
                  </p>
                )}

                {anexos.length > 0 ? (
                  <div className="space-y-3">
                    {anexos.map((anexo, indice) => (
                      <div
                        key={anexo.id}
                        className="grid gap-3 rounded-lg border bg-[var(--card)] p-3 md:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)_auto]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <Paperclip
                              className="size-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate">{anexo.file.name}</span>
                          </div>
                          <a
                            href={anexo.previewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex text-xs font-semibold text-[var(--primary)] hover:underline"
                          >
                            Visualizar PDF
                          </a>
                        </div>

                        <label className="space-y-1 text-sm">
                          <span className="font-semibold">
                            Descrição do anexo {indice + 1}
                          </span>
                          <input
                            name="anexoDescricoes"
                            value={anexo.descricao}
                            onChange={(event) =>
                              atualizarDescricaoAnexo(
                                anexo.id,
                                event.currentTarget.value,
                              )
                            }
                            placeholder="Ex.: Atestado médico"
                            className="h-10 w-full rounded-md border bg-[var(--background)] px-3 text-sm"
                            required
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => removerAnexo(anexo.id)}
                          className="inline-flex size-10 items-center justify-center rounded-md border text-red-600 transition hover:bg-red-50"
                          aria-label={`Remover anexo ${anexo.file.name}`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)]">
                    Nenhum documento anexado.
                  </div>
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
                Avançar
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
                {submitLabel}
              </button>
            )}
          </div>
        </div>

        <PreviewSolicitacao preview={preview} />
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
