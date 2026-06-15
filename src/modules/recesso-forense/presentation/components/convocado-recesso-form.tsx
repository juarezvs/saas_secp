"use client";

import { useActionState, useMemo, useState } from "react";
import { CalendarDays, Check, Loader2, Search, UserPlus } from "lucide-react";
import Link from "next/link";

import type { RecessoFormState } from "../../application/schemas/recesso-forense.schema";

type ServidorOption = {
  id: string;
  matricula: string;
  usuario: {
    nome: string;
  };
};

type EscolhaRecesso = "PECUNIA" | "FOLGA";

type DiaRecesso = {
  iso: string;
  rotulo: string;
  semana: string;
};

type DiaConvocadoInicial = {
  dataConvocacao: Date | string;
  escolha: EscolhaRecesso;
};

type ConvocadoRecessoFormProps = {
  recessoId: string;
  convocacaoId: string;
  anoRecesso: number;
  dataInicio: Date | string;
  dataFim: Date | string;
  servidores: ServidorOption[];
  servidorIdInicial?: string;
  diasIniciais?: DiaConvocadoInicial[];
  action: (
    state: RecessoFormState,
    formData: FormData,
  ) => Promise<RecessoFormState>;
};

const estadoInicial: RecessoFormState = {
  sucesso: false,
  mensagem: null,
};

function erro(estado: RecessoFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

function criarDataUtc(data: Date | string) {
  const iso = typeof data === "string" ? data : data.toISOString();
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function formatarDia(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);
}

function formatarSemana(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(data);
}

function gerarDiasRecesso(dataInicio: Date | string, dataFim: Date | string) {
  const dias: DiaRecesso[] = [];
  const cursor = criarDataUtc(dataInicio);
  const fim = criarDataUtc(dataFim);

  while (cursor <= fim) {
    dias.push({
      iso: cursor.toISOString().slice(0, 10),
      rotulo: formatarDia(cursor),
      semana: formatarSemana(cursor),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dias;
}

function mapearDiasIniciais(dias: DiaConvocadoInicial[] | undefined) {
  return (dias ?? []).reduce<Record<string, EscolhaRecesso>>((acc, dia) => {
    acc[criarDataUtc(dia.dataConvocacao).toISOString().slice(0, 10)] = dia.escolha;
    return acc;
  }, {});
}

function rotuloServidor(servidor: ServidorOption) {
  return `${servidor.matricula} - ${servidor.usuario.nome}`;
}

export function ConvocadoRecessoForm({
  recessoId,
  convocacaoId,
  anoRecesso,
  dataInicio,
  dataFim,
  servidores,
  servidorIdInicial,
  diasIniciais,
  action,
}: ConvocadoRecessoFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const servidorInicial = servidores.find((servidor) => servidor.id === servidorIdInicial);
  const [servidorId, setServidorId] = useState(servidorIdInicial ?? "");
  const [servidorBusca, setServidorBusca] = useState(
    servidorInicial ? rotuloServidor(servidorInicial) : "",
  );
  const [listaServidoresAberta, setListaServidoresAberta] = useState(false);
  const [tabelaMontada, setTabelaMontada] = useState(Boolean(servidorIdInicial));
  const [diasSelecionados, setDiasSelecionados] = useState<Record<string, EscolhaRecesso>>(
    () => mapearDiasIniciais(diasIniciais),
  );

  const diasRecesso = useMemo(
    () => gerarDiasRecesso(dataInicio, dataFim),
    [dataInicio, dataFim],
  );

  const diasConvocados = useMemo(
    () =>
      Object.entries(diasSelecionados).map(([dataConvocacao, escolha]) => ({
        dataConvocacao,
        escolha,
      })),
    [diasSelecionados],
  );

  const servidoresFiltrados = useMemo(() => {
    const termo = servidorBusca.trim().toLocaleLowerCase("pt-BR");

    if (!termo) {
      return servidores.slice(0, 12);
    }

    return servidores
      .filter((servidor) =>
        `${servidor.matricula} ${servidor.usuario.nome}`
          .toLocaleLowerCase("pt-BR")
          .includes(termo),
      )
      .slice(0, 12);
  }, [servidorBusca, servidores]);

  function selecionarServidor(servidor: ServidorOption) {
    setServidorId(servidor.id);
    setServidorBusca(rotuloServidor(servidor));
    setListaServidoresAberta(false);
    setTabelaMontada(false);
    setDiasSelecionados({});
  }

  function alternarData(data: string) {
    setDiasSelecionados((atual) => {
      const proximo = { ...atual };

      if (proximo[data]) {
        delete proximo[data];
      } else {
        proximo[data] = "PECUNIA";
      }

      return proximo;
    });
  }

  function alternarEscolha(data: string) {
    setDiasSelecionados((atual) => ({
      ...atual,
      [data]: atual[data] === "FOLGA" ? "PECUNIA" : "FOLGA",
    }));
  }

  const servidorSelecionado = servidores.find((servidor) => servidor.id === servidorId);
  const podeSalvar = servidorId && diasConvocados.length > 0 && !pendente;

  return (
    <form action={formAction} className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <input type="hidden" name="recessoId" value={recessoId} />
      <input type="hidden" name="convocacaoId" value={convocacaoId} />
      <input type="hidden" name="anoRecesso" value={anoRecesso} />
      <input type="hidden" name="diasConvocados" value={JSON.stringify(diasConvocados)} />
      <input type="hidden" name="servidorId" value={servidorId} />

      <div
        id={`convocado-form-${convocacaoId}`}
        className="flex scroll-mt-24 flex-col gap-3 md:flex-row md:items-start md:justify-between"
      >
        <div>
          <h3 className="font-bold">
            {servidorIdInicial ? "Editar servidor convocado" : "Adicionar servidor convocado"}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {servidorIdInicial
              ? "Ajuste as datas convocadas e alterne entre Pecúnia e Folga antes de salvar."
              : "Selecione o servidor, monte o período do recesso e marque todas as datas convocadas antes de salvar."}
          </p>
        </div>
        <div className="rounded-md border bg-[var(--muted)] px-3 py-2 text-sm font-semibold">
          {diasConvocados.length} data(s) selecionada(s)
        </div>
      </div>

      {servidorIdInicial && servidorSelecionado && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="font-semibold">Modo edicao ativo</p>
              <p className="mt-1">
                Editando a convocação de {servidorSelecionado.usuario.nome}. Desmarcar uma
                data remove o servidor daquele dia do recesso.
              </p>
            </div>
            <Link
              href={`/recesso-forense/${recessoId}/convocacoes`}
              className="inline-flex items-center justify-center rounded-md border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-900 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100 dark:hover:bg-blue-900"
            >
              Cancelar edicao
            </Link>
          </div>
        </div>
      )}

      {estado.mensagem && (
        <p
          className={`mt-3 rounded-md border p-3 text-sm ${
            estado.sucesso
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {estado.mensagem}
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_180px]">
        <div className="space-y-2">
          <label htmlFor={`servidor-${convocacaoId}`} className="text-sm font-semibold">
            Servidor
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              id={`servidor-${convocacaoId}`}
              type="search"
              value={servidorBusca}
              disabled={Boolean(servidorIdInicial)}
              onChange={(event) => {
                setServidorBusca(event.target.value);
                setServidorId("");
                setTabelaMontada(false);
                setDiasSelecionados({});
                setListaServidoresAberta(true);
              }}
              onFocus={() => {
                if (!servidorIdInicial) {
                  setListaServidoresAberta(true);
                }
              }}
              className="h-11 w-full rounded-md border bg-[var(--card)] pl-9 pr-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
              placeholder="Pesquise por matrícula ou nome"
              aria-label="Pesquisar servidor por matrícula ou nome"
              autoComplete="off"
              required={!servidorIdInicial}
            />

            {listaServidoresAberta && !servidorIdInicial && (
              <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-[var(--card)] shadow-lg">
                {servidoresFiltrados.map((servidor) => (
                  <button
                    key={servidor.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selecionarServidor(servidor)}
                    className="flex w-full flex-col px-3 py-2 text-left text-sm transition hover:bg-[var(--muted)] focus:bg-[var(--muted)] focus:outline-none"
                  >
                    <span className="font-semibold">{servidor.usuario.nome}</span>
                    <span className="font-mono text-xs text-[var(--muted-foreground)]">
                      {servidor.matricula}
                    </span>
                  </button>
                ))}

                {servidoresFiltrados.length === 0 && (
                  <div className="px-3 py-4 text-sm text-[var(--muted-foreground)]">
                    Nenhum servidor encontrado.
                  </div>
                )}
              </div>
            )}
          </div>
          {!servidorId && servidorBusca && !servidorIdInicial && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Selecione um servidor na lista para habilitar a convocação.
            </p>
          )}
          {erro(estado, "servidorId") && (
            <p className="text-sm text-red-600">{erro(estado, "servidorId")}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor={`minutos-${convocacaoId}`} className="text-sm font-semibold">
            Minutos por dia
          </label>
          <input
            id={`minutos-${convocacaoId}`}
            name="minutosPrevistos"
            type="number"
            defaultValue={420}
            min={0}
            max={1440}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            disabled={!servidorId || Boolean(servidorIdInicial)}
            onClick={() => setTabelaMontada(true)}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Criar tabela de datas da convocação"
          >
            <CalendarDays className="size-4" />
            {servidorIdInicial ? "Tabela montada" : "Criar convocação"}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <label htmlFor={`observacao-${convocacaoId}`} className="text-sm font-semibold">
          Observacao
        </label>
        <textarea
          id={`observacao-${convocacaoId}`}
          name="observacao"
          rows={2}
          className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
          placeholder="Informação administrativa opcional sobre a convocação."
        />
      </div>

      {tabelaMontada && servidorSelecionado && (
        <div className="mt-5 overflow-hidden rounded-lg border">
          <div className="border-b bg-[var(--muted)] px-4 py-3">
            <p className="text-sm font-semibold">
              Datas do recesso para {servidorSelecionado.usuario.nome}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Clique na linha para marcar a data. A opção padrão é Pecúnia; use o
              toggle para alternar para Folga.
            </p>
          </div>

          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="sticky top-0 border-b bg-[var(--card)] text-xs uppercase text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Convocado</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Dia</th>
                  <th className="px-4 py-3">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {diasRecesso.map((dia) => {
                  const escolha = diasSelecionados[dia.iso];
                  const selecionado = Boolean(escolha);

                  return (
                    <tr
                      key={dia.iso}
                      onClick={() => alternarData(dia.iso)}
                      className={`cursor-pointer border-b transition last:border-b-0 hover:bg-blue-50/70 dark:hover:bg-blue-950/40 ${
                        selecionado
                          ? "border-l-4 border-l-blue-900 bg-blue-50/90 dark:border-l-blue-300 dark:bg-blue-950/50"
                          : "border-l-4 border-l-transparent"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex size-8 items-center justify-center rounded-full border-2 shadow-sm transition ${
                            selecionado
                              ? escolha === "FOLGA"
                                ? "border-emerald-700 bg-emerald-600 text-white ring-2 ring-emerald-200 dark:border-emerald-300 dark:bg-emerald-500 dark:ring-emerald-900"
                                : "border-blue-900 bg-blue-900 text-white ring-2 ring-blue-200 dark:border-blue-300 dark:bg-blue-700 dark:ring-blue-900"
                              : "border-[var(--border)] bg-white text-transparent dark:bg-slate-950"
                          }`}
                          aria-hidden="true"
                        >
                          <Check className="size-4" />
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{dia.rotulo}</td>
                      <td className="px-4 py-3 capitalize text-[var(--muted-foreground)]">
                        {dia.semana}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={!selecionado}
                          onClick={(event) => {
                            event.stopPropagation();
                            alternarEscolha(dia.iso);
                          }}
                          className="relative inline-grid h-9 w-36 grid-cols-2 items-center overflow-hidden rounded-full border bg-[var(--muted)] p-1 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Alternar tipo da data ${dia.rotulo}`}
                          aria-pressed={escolha === "FOLGA"}
                        >
                          <span
                            className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full shadow-sm transition-transform duration-300 ease-out ${
                              escolha === "FOLGA"
                                ? "translate-x-full bg-emerald-600"
                                : "translate-x-0 bg-blue-900"
                            }`}
                            aria-hidden="true"
                          />
                          <span
                            className={`relative z-10 text-center transition-colors duration-300 ${
                              escolha === "FOLGA" ? "text-[var(--muted-foreground)]" : "text-white"
                            }`}
                          >
                            Pecúnia
                          </span>
                          <span
                            className={`relative z-10 text-center transition-colors duration-300 ${
                              escolha === "FOLGA" ? "text-white" : "text-[var(--muted-foreground)]"
                            }`}
                          >
                            Folga
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {erro(estado, "diasConvocados") && (
        <p className="mt-3 text-sm text-red-600">{erro(estado, "diasConvocados")}</p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={!podeSalvar}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendente ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          {servidorIdInicial ? "Salvar alteracoes" : "Salvar convocação"}
        </button>
      </div>
    </form>
  );
}
