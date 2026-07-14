"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Edit, Trash2 } from "lucide-react";

import { excluirCalendariosInstitucionaisAction } from "../../application/actions/excluir-calendario-institucional.action";

type CalendarioEventoItem = {
  id: string;
  dataReferencia: string;
  dataOriginal: string | null;
  dataSubstituida: boolean;
  tipo: string;
  descricao: string;
  observacao: string | null;
  contaComoDiaUtil: boolean;
  geraApuracaoRegular: boolean;
  janelaInicio: string | null;
  janelaFim: string | null;
  ativo: boolean;
};

type CalendarioInstitucionalListagemProps = {
  eventos: CalendarioEventoItem[];
  redirectTo: string;
};

const rotulosTipo: Record<string, string> = {
  FERIADO: "Feriado",
  PONTO_FACULTATIVO: "Ponto facultativo",
  SUSPENSAO_EXPEDIENTE: "Suspensao do expediente",
};

function formatarDataUtc(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(data));
}

function formatarJanela(evento: {
  janelaInicio?: string | null;
  janelaFim?: string | null;
}) {
  if (!evento.janelaInicio || !evento.janelaFim) {
    return "Dia inteiro";
  }

  return `${evento.janelaInicio} - ${evento.janelaFim}`;
}

export function CalendarioInstitucionalListagem({
  eventos,
  redirectTo,
}: CalendarioInstitucionalListagemProps) {
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const ids = useMemo(() => eventos.map((evento) => evento.id), [eventos]);
  const todosSelecionados =
    ids.length > 0 && ids.every((id) => selecionados.includes(id));

  function alternarTodos() {
    setSelecionados(todosSelecionados ? [] : ids);
  }

  function alternarSelecionado(id: string) {
    setSelecionados((atuais) =>
      atuais.includes(id)
        ? atuais.filter((item) => item !== id)
        : [...atuais, id],
    );
  }

  function confirmarExclusao(event: FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        `Excluir ${selecionados.length} evento(s) selecionado(s)? Esta acao nao pode ser desfeita.`,
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={excluirCalendariosInstitucionaisAction}
      onSubmit={confirmarExclusao}
    >
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {selecionados.map((id) => (
        <input key={id} type="hidden" name="calendarioId" value={id} />
      ))}

      {selecionados.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-b bg-red-50 px-5 py-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
          <span className="font-semibold">
            {selecionados.length} selecionado(s)
          </span>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-red-700 px-3 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Excluir selecionados
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <caption className="sr-only">
            Listagem de eventos do calendario institucional com data, tipo,
            descricao, parametros de prazo, apuracao e acoes.
          </caption>
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="w-12 px-5 py-3">
                <input
                  type="checkbox"
                  checked={todosSelecionados}
                  onChange={alternarTodos}
                  aria-label="Selecionar todos os eventos da pagina"
                  className="size-4 rounded border-slate-300 accent-blue-900"
                />
              </th>
              <th className="px-5 py-3">Data</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Descricao</th>
              <th className="px-5 py-3">Dia util</th>
              <th className="px-5 py-3">Apuracao regular</th>
              <th className="px-5 py-3">Expediente</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Acoes</th>
            </tr>
          </thead>

          <tbody>
            {eventos.map((evento) => (
              <tr key={evento.id} className="border-b last:border-b-0">
                <td className="px-5 py-4">
                  <input
                    type="checkbox"
                    checked={selecionados.includes(evento.id)}
                    onChange={() => alternarSelecionado(evento.id)}
                    aria-label={`Selecionar ${evento.descricao}`}
                    className="size-4 rounded border-slate-300 accent-blue-900"
                  />
                </td>
                <td className="px-5 py-4 font-semibold">
                  {formatarDataUtc(evento.dataReferencia)}
                </td>
                <td className="px-5 py-4">
                  {rotulosTipo[evento.tipo] ?? evento.tipo}
                </td>
                <td className="px-5 py-4">
                  <div className="font-semibold">{evento.descricao}</div>
                  {evento.observacao && (
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {evento.observacao}
                    </div>
                  )}
                  {evento.dataSubstituida && evento.dataOriginal && (
                    <div className="mt-1 text-xs font-medium text-blue-800 dark:text-blue-300">
                      Transferido de {formatarDataUtc(evento.dataOriginal)}
                    </div>
                  )}
                </td>
                <td className="px-5 py-4">
                  {evento.contaComoDiaUtil ? "Sim" : "Nao"}
                </td>
                <td className="px-5 py-4">
                  {evento.geraApuracaoRegular ? "Sim" : "Nao"}
                </td>
                <td className="px-5 py-4">{formatarJanela(evento)}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      evento.ativo
                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {evento.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/administracao/calendario/${evento.id}/editar`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                  >
                    <Edit className="size-4" aria-hidden="true" />
                    Editar
                  </Link>
                </td>
              </tr>
            ))}

            {eventos.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhum evento institucional encontrado para os filtros informados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </form>
  );
}
