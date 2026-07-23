"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  diasSemana,
  tiposDiaJornada,
  tiposJornada,
  type JornadaFormState,
} from "../../application/schemas/jornada.schema";

type JornadaFormProps = {
  action: (
    state: JornadaFormState,
    formData: FormData,
  ) => Promise<JornadaFormState>;
  valoresIniciais?: {
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
    "Use quando a previsão se repete por dia da semana. A grade semanal abaixo define carga, faixa e folgas.",
  FLEXIVEL:
    "Use quando há carga diária prevista, mas com janela de entrada/saída mais ampla ou núcleo obrigatório.",
  CARGA_DIARIA:
    "Use quando a apuração compara principalmente a carga diária, com ou sem faixa rígida de horário.",
  CARGA_SEMANAL:
    "Use quando o controle principal é a carga semanal. Informe a carga semanal e configure os dias esperados quando houver.",
  CARGA_MENSAL:
    "Use quando o controle principal é a carga mensal. Informe a carga mensal e mantenha a previsão diária apenas como referência.",
  ESCALA_CICLICA:
    "Use para ciclos como 12x36, 24x72 ou outros regimes por posição. Depois de salvar a jornada, cadastre a escala cíclica no detalhe da jornada.",
  ESCALA_VARIAVEL:
    "Use quando a escala muda por planejamento. A jornada guarda as regras gerais e a escala atribuída define o dia esperado.",
  TURNO_FIXO:
    "Use quando o servidor trabalha sempre em um turno específico, inclusive com possibilidade de turno noturno.",
  TURNO_REVEZAMENTO:
    "Use quando o servidor alterna turnos por ciclo. Depois de salvar, cadastre a escala de revezamento com data de ancoragem.",
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
    descricao:
      "Quando marcado, o sistema espera marcações e compara entrada, saída, carga e janela do dia.",
  },
  permiteFlexibilidade: {
    label: "Permite flexibilidade",
    descricao:
      "Permite apurar a carga dentro de uma janela mais ampla ou com núcleo obrigatório, sem prender a um único horário fixo.",
  },
  permiteBancoHoras: {
    label: "Permite banco de horas",
    descricao:
      "Autoriza que créditos e débitos apurados nessa jornada movimentem o banco de horas.",
  },
  permiteHoraExtra: {
    label: "Permite hora extra",
    descricao:
      "Permite tratar excedentes como serviço extraordinário quando houver autorização e fluxo próprio.",
  },
  cruzaMeiaNoite: {
    label: "Permite virada de dia",
    descricao:
      "Use quando a faixa de trabalho pode começar em um dia e terminar após a meia-noite.",
  },
};

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

export function JornadaForm({
  action,
  valoresIniciais,
  modo,
}: JornadaFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const campos = estado.campos ?? valoresIniciais;
  const [tipoSelecionado, setTipoSelecionado] = useState(
    String(campos?.tipo ?? "SETE_HORAS"),
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

  return (
    <form action={formAction} className="space-y-6">
      {estado.mensagem && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {estado.mensagem}
        </div>
      )}

      <section className="rounded-xl border bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">Dados da jornada</h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="codigo" className="text-sm font-semibold">
              Código
            </label>
            <input
              id="codigo"
              name="codigo"
              defaultValue={campos?.codigo ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm uppercase outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              placeholder="JORNADA_7H"
              required
            />
            {erro(estado, "codigo") && (
              <p className="text-sm text-red-600">{erro(estado, "codigo")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="nome" className="text-sm font-semibold">
              Nome
            </label>
            <input
              id="nome"
              name="nome"
              defaultValue={campos?.nome ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />
            {erro(estado, "nome") && (
              <p className="text-sm text-red-600">{erro(estado, "nome")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="tipo" className="text-sm font-semibold">
              Tipo
            </label>
            <select
              id="tipo"
              name="tipo"
              value={tipoSelecionado}
              onChange={(evento) => setTipoSelecionado(evento.target.value)}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            >
              {tiposJornada.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {rotulosTipo[tipo] ?? tipo}
                </option>
              ))}
            </select>
            {erro(estado, "tipo") && (
              <p className="text-sm text-red-600">{erro(estado, "tipo")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="cargaDiariaMinutos" className="text-sm font-semibold">
              Carga diária em minutos
            </label>
            <input
              id="cargaDiariaMinutos"
              name="cargaDiariaMinutos"
              type="number"
              min={0}
              max={720}
              defaultValue={campos?.cargaDiariaMinutos ?? 420}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />
            {erro(estado, "cargaDiariaMinutos") && (
              <p className="text-sm text-red-600">
                {erro(estado, "cargaDiariaMinutos")}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100 md:col-span-2">
            <p className="font-semibold">{rotulosTipo[tipoSelecionado]}</p>
            <p className="mt-1 leading-6">{contextoTipo.descricao}</p>
            {contextoTipo.usaCiclo && (
              <p className="mt-2 leading-6">
                Ao escolher esse tipo, a jornada guarda as regras gerais. O
                ciclo real, com posições e data de ancoragem, é cadastrado no
                detalhe da jornada em &quot;Cadastrar escala&quot;.
              </p>
            )}
            {contextoTipo.semControle && (
              <p className="mt-2 leading-6">
                Para esse tipo, deixe &quot;Controla horário&quot; desmarcado se a pessoa
                não deve gerar falta por ausência de marcações ordinárias.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="horarioEntradaPadrao" className="text-sm font-semibold">
              Entrada padrão
            </label>
            <input
              id="horarioEntradaPadrao"
              name="horarioEntradaPadrao"
              type="time"
              defaultValue={campos?.horarioEntradaPadrao ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            {erro(estado, "horarioEntradaPadrao") && (
              <p className="text-sm text-red-600">
                {erro(estado, "horarioEntradaPadrao")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="horarioSaidaPadrao" className="text-sm font-semibold">
              Saída padrão
            </label>
            <input
              id="horarioSaidaPadrao"
              name="horarioSaidaPadrao"
              type="time"
              defaultValue={campos?.horarioSaidaPadrao ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            {erro(estado, "horarioSaidaPadrao") && (
              <p className="text-sm text-red-600">
                {erro(estado, "horarioSaidaPadrao")}
              </p>
            )}
          </div>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
            <input
              type="checkbox"
              name="exigeIntervalo"
              defaultChecked={campos?.exigeIntervalo ?? false}
              className="size-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold">Exige intervalo</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Obriga marcações de saída e retorno do intervalo e valida os
                limites mínimo/máximo informados.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
            <input
              type="checkbox"
              name="horarioDiferenciadoPermitido"
              defaultChecked={campos?.horarioDiferenciadoPermitido ?? false}
              className="size-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold">Permite horário diferenciado</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Habilita autorização individual para trabalhar dentro da janela
                diferenciada cadastrada.
              </span>
            </span>
          </label>

          {[
            ["controlaHorario", campos?.controlaHorario ?? !contextoTipo.semControle],
            ["permiteFlexibilidade", campos?.permiteFlexibilidade ?? contextoTipo.usaCiclo],
            ["permiteBancoHoras", campos?.permiteBancoHoras ?? true],
            ["permiteHoraExtra", campos?.permiteHoraExtra ?? false],
            ["cruzaMeiaNoite", campos?.cruzaMeiaNoite ?? contextoTipo.jornadaNoturna],
          ].map(([name, checked]) => (
            <label
              key={String(name)}
              className="flex items-start gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm"
            >
              <input
                type="checkbox"
                name={String(name)}
                defaultChecked={Boolean(checked)}
                className="mt-0.5 size-4 rounded border-slate-300"
              />
              <span>
                <span className="block font-semibold">
                  {descricoesParametros[String(name)].label}
                </span>
                <span className="text-xs leading-5 text-[var(--muted-foreground)]">
                  {descricoesParametros[String(name)].descricao}
                </span>
              </span>
            </label>
          ))}

          <div className="space-y-2">
            <label htmlFor="intervaloMinimoMinutos" className="text-sm font-semibold">
              Intervalo mínimo
            </label>
            <input
              id="intervaloMinimoMinutos"
              name="intervaloMinimoMinutos"
              type="number"
              defaultValue={campos?.intervaloMinimoMinutos ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              placeholder="60"
            />
            {erro(estado, "intervaloMinimoMinutos") && (
              <p className="text-sm text-red-600">
                {erro(estado, "intervaloMinimoMinutos")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="intervaloMaximoMinutos" className="text-sm font-semibold">
              Intervalo máximo
            </label>
            <input
              id="intervaloMaximoMinutos"
              name="intervaloMaximoMinutos"
              type="number"
              defaultValue={campos?.intervaloMaximoMinutos ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              placeholder="180"
            />
            {erro(estado, "intervaloMaximoMinutos") && (
              <p className="text-sm text-red-600">
                {erro(estado, "intervaloMaximoMinutos")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="entradaMinimaDiferenciada" className="text-sm font-semibold">
              Entrada mínima diferenciada
            </label>
            <input
              id="entradaMinimaDiferenciada"
              name="entradaMinimaDiferenciada"
              type="time"
              defaultValue={campos?.entradaMinimaDiferenciada ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            {erro(estado, "entradaMinimaDiferenciada") && (
              <p className="text-sm text-red-600">
                {erro(estado, "entradaMinimaDiferenciada")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="saidaMaximaDiferenciada" className="text-sm font-semibold">
              Saída máxima diferenciada
            </label>
            <input
              id="saidaMaximaDiferenciada"
              name="saidaMaximaDiferenciada"
              type="time"
              defaultValue={campos?.saidaMaximaDiferenciada ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            {erro(estado, "saidaMaximaDiferenciada") && (
              <p className="text-sm text-red-600">
                {erro(estado, "saidaMaximaDiferenciada")}
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="fundamentoNormativo" className="text-sm font-semibold">
              Fundamento normativo
            </label>
            <input
              id="fundamentoNormativo"
              name="fundamentoNormativo"
              defaultValue={campos?.fundamentoNormativo ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              placeholder="Portaria, resolução, ato ou regulamento"
            />
            {erro(estado, "fundamentoNormativo") && (
              <p className="text-sm text-red-600">
                {erro(estado, "fundamentoNormativo")}
              </p>
            )}
          </div>

          <div className="grid gap-5 md:col-span-2 md:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="vigenciaInicio" className="text-sm font-semibold">
                Vigência inicial
              </label>
              <input
                id="vigenciaInicio"
                name="vigenciaInicio"
                type="date"
                defaultValue={formatarDataInput(campos?.vigenciaInicio)}
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="vigenciaFim" className="text-sm font-semibold">
                Vigência final
              </label>
              <input
                id="vigenciaFim"
                name="vigenciaFim"
                type="date"
                defaultValue={formatarDataInput(campos?.vigenciaFim)}
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              />
              {erro(estado, "vigenciaFim") && (
                <p className="text-sm text-red-600">
                  {erro(estado, "vigenciaFim")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="horarioLimiteVirada" className="text-sm font-semibold">
                Limite da virada
              </label>
              <input
                id="horarioLimiteVirada"
                name="horarioLimiteVirada"
                type="time"
                defaultValue={campos?.horarioLimiteVirada ?? ""}
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              />
            </div>
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
            <p className="text-xs text-[var(--muted-foreground)]">
              Para jornadas especiais, informe o fundamento legal ou normativo
              da profissão regulamentada.
            </p>
            {erro(estado, "descricao") && (
              <p className="text-sm text-red-600">{erro(estado, "descricao")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="cargaSemanalMinutos" className="text-sm font-semibold">
              Carga semanal em minutos
            </label>
            <input
              id="cargaSemanalMinutos"
              name="cargaSemanalMinutos"
              type="number"
              min={0}
              defaultValue={campos?.cargaSemanalMinutos ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              placeholder="2100"
            />
            {contextoTipo.exigeCargaSemanal && (
              <p className="text-xs text-[var(--muted-foreground)]">
                Campo principal para jornadas controladas por carga semanal.
              </p>
            )}
            {erro(estado, "cargaSemanalMinutos") && (
              <p className="text-sm text-red-600">
                {erro(estado, "cargaSemanalMinutos")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="cargaMensalMinutos" className="text-sm font-semibold">
              Carga mensal em minutos
            </label>
            <input
              id="cargaMensalMinutos"
              name="cargaMensalMinutos"
              type="number"
              min={0}
              defaultValue={campos?.cargaMensalMinutos ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              placeholder="9000"
            />
            {contextoTipo.exigeCargaMensal && (
              <p className="text-xs text-[var(--muted-foreground)]">
                Campo principal para jornadas controladas por carga mensal.
              </p>
            )}
            {erro(estado, "cargaMensalMinutos") && (
              <p className="text-sm text-red-600">
                {erro(estado, "cargaMensalMinutos")}
              </p>
            )}
          </div>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
            <input
              type="checkbox"
              name="ativo"
              defaultChecked={campos?.ativo ?? true}
              className="size-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold">Jornada ativa</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Jornadas inativas não devem ser atribuídas a novos servidores.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-xl border bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">Previsão semanal da jornada</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
          Esta grade define a previsão por dia da semana quando a jornada é
          fixa. Em jornadas cíclicas ou de revezamento, use-a como referência
          geral e cadastre o ciclo efetivo na escala após salvar.
        </p>

        <div className="mt-5 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-3 py-3">Dia</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Carga</th>
                <th className="px-3 py-3">Início</th>
                <th className="px-3 py-3">Fim</th>
                <th className="px-3 py-3">Núcleo início</th>
                <th className="px-3 py-3">Núcleo fim</th>
                <th className="px-3 py-3">Vira dia</th>
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

        {erro(estado, "dias") && (
          <p className="mt-3 text-sm text-red-600">{erro(estado, "dias")}</p>
        )}
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {modo === "criar" ? "Criar jornada" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
