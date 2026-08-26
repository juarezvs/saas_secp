"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Loader2, Plus, Search, X } from "lucide-react";

import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import type { JornadaServidorFormState } from "../../application/schemas/jornada-servidor.schema";

type ServidorItem = {
  id: string;
  matricula: string;
  orgaoId: string;
  nomeFuncional?: string | null;
  usuario: {
    nome: string;
  };
  lotacoes: {
    unidade: {
      id: string;
      sigla: string;
      nome: string;
    };
  }[];
};

type JornadaItem = {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
};

type OrgaoItem = {
  id: string;
  sigla: string;
  nome: string;
};

type JornadaServidorFormProps = {
  action: (
    state: JornadaServidorFormState,
    formData: FormData,
  ) => Promise<JornadaServidorFormState>;
  servidores: ServidorItem[];
  jornadas: JornadaItem[];
  orgaos: OrgaoItem[];
};

type ModoSelecao = "PESSOAS" | "UNIDADES" | "SECCIONAL";

type UnidadeSelecao = {
  id: string;
  sigla: string;
  nome: string;
  quantidadePessoas: number;
};

const estadoInicial: JornadaServidorFormState = {
  sucesso: false,
  mensagem: null,
};

function erro(estado: JornadaServidorFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

function rotuloServidor(servidor: ServidorItem) {
  const lotacao = servidor.lotacoes[0]?.unidade.sigla;
  return `${servidor.matricula} - ${nomeServidor(servidor)}${
    lotacao ? ` (${lotacao})` : ""
  }`;
}

function rotuloTipoJornada(tipo: string) {
  const rotulos: Record<string, string> = {
    SETE_HORAS: "7 horas",
    OITO_HORAS: "8 horas",
    ESPECIAL: "Especial",
    FIXA_SEMANAL: "Semanal",
    FLEXIVEL: "Flexível",
    CARGA_DIARIA: "Carga diária",
    CARGA_SEMANAL: "Carga semanal",
    CARGA_MENSAL: "Carga mensal",
    HIBRIDO: "Híbrido",
    TELETRABALHO: "Teletrabalho",
    ESCALA_CICLICA: "Escala cíclica",
    ESCALA_VARIAVEL: "Escala variável",
    TURNO_FIXO: "Turno fixo",
    TURNO_REVEZAMENTO: "Turno de revezamento",
    NOTURNA: "Noturna",
    PARCIAL: "Parcial/reduzida",
    PLANTAO_EVENTUAL: "Plantão eventual",
    SEM_CONTROLE_CONVENCIONAL: "Sem controle convencional",
  };

  return rotulos[tipo] ?? tipo.replaceAll("_", " ");
}

function rotuloJornada(jornada: JornadaItem) {
  return `${jornada.nome} [${rotuloTipoJornada(jornada.tipo)}]`;
}

function rotuloUnidade(unidade: UnidadeSelecao) {
  return `${unidade.sigla} - ${unidade.nome}`;
}

function rotuloOrgao(orgao: OrgaoItem) {
  return `${orgao.sigla} - ${orgao.nome}`;
}

function normalizarModoSelecao(valor?: string | null): ModoSelecao {
  return valor === "UNIDADES" || valor === "SECCIONAL" ? valor : "PESSOAS";
}

function setTipoVinculacao() {
  return undefined;
}

export function JornadaServidorForm({
  action,
  servidores,
  jornadas,
  orgaos,
}: JornadaServidorFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const [modoSelecao, setModoSelecao] = useState<ModoSelecao>(
    normalizarModoSelecao(estado.campos?.modoSelecao),
  );
  const [buscaPessoa, setBuscaPessoa] = useState("");
  const [buscaUnidade, setBuscaUnidade] = useState("");
  const [buscaOrgao, setBuscaOrgao] = useState("");
  const [orgaoSelecionadoId, setOrgaoSelecionadoId] = useState(
    estado.campos?.orgaoId ?? "",
  );
  const [dataFim, setDataFim] = useState(estado.campos?.dataFim ?? "");
  const [selecionados, setSelecionados] = useState<string[]>(() => {
    if (estado.campos?.servidorIds?.length) {
      return estado.campos.servidorIds;
    }

    return estado.campos?.servidorId ? [estado.campos.servidorId] : [];
  });
  const [unidadesSelecionadas, setUnidadesSelecionadas] = useState<string[]>(
    [],
  );

  const servidoresPorId = useMemo(
    () => new Map(servidores.map((servidor) => [servidor.id, servidor])),
    [servidores],
  );
  const unidades = useMemo(() => {
    const mapa = new Map<string, UnidadeSelecao>();

    for (const servidor of servidores) {
      const unidade = servidor.lotacoes[0]?.unidade;
      if (!unidade) continue;

      const atual = mapa.get(unidade.id);
      mapa.set(unidade.id, {
        id: unidade.id,
        sigla: unidade.sigla,
        nome: unidade.nome,
        quantidadePessoas: (atual?.quantidadePessoas ?? 0) + 1,
      });
    }

    return Array.from(mapa.values()).sort((a, b) =>
      a.sigla.localeCompare(b.sigla, "pt-BR"),
    );
  }, [servidores]);
  const unidadesPorId = useMemo(
    () => new Map(unidades.map((unidade) => [unidade.id, unidade])),
    [unidades],
  );
  const orgaosPorId = useMemo(
    () => new Map(orgaos.map((orgao) => [orgao.id, orgao])),
    [orgaos],
  );
  const quantidadePessoasPorOrgao = useMemo(() => {
    const mapa = new Map<string, number>();

    for (const servidor of servidores) {
      mapa.set(servidor.orgaoId, (mapa.get(servidor.orgaoId) ?? 0) + 1);
    }

    return mapa;
  }, [servidores]);
  const servidoresFiltrados = useMemo(() => {
    const termo = buscaPessoa.trim().toLowerCase();

    if (!termo) {
      return servidores.slice(0, 80);
    }

    return servidores
      .filter((servidor) => {
        const lotacao = servidor.lotacoes[0]?.unidade.sigla ?? "";
        return `${servidor.matricula} ${nomeServidor(servidor)} ${lotacao}`
          .toLowerCase()
          .includes(termo);
      })
      .slice(0, 80);
  }, [buscaPessoa, servidores]);
  const unidadesFiltradas = useMemo(() => {
    const termo = buscaUnidade.trim().toLowerCase();

    if (!termo) {
      return unidades.slice(0, 80);
    }

    return unidades
      .filter((unidade) =>
        `${unidade.sigla} ${unidade.nome}`.toLowerCase().includes(termo),
      )
      .slice(0, 80);
  }, [buscaUnidade, unidades]);
  const orgaosFiltrados = useMemo(() => {
    const termo = buscaOrgao.trim().toLowerCase();

    if (!termo) {
      return orgaos.slice(0, 80);
    }

    return orgaos
      .filter((orgao) =>
        `${orgao.sigla} ${orgao.nome}`.toLowerCase().includes(termo),
      )
      .slice(0, 80);
  }, [buscaOrgao, orgaos]);

  function alternarPessoa(servidorId: string) {
    setSelecionados((atuais) =>
      atuais.includes(servidorId)
        ? atuais.filter((id) => id !== servidorId)
        : [...atuais, servidorId],
    );
  }

  function alternarUnidade(unidadeId: string) {
    const selecionada = unidadesSelecionadas.includes(unidadeId);
    const servidorIdsDaUnidade = servidores
      .filter((servidor) => servidor.lotacoes[0]?.unidade.id === unidadeId)
      .map((servidor) => servidor.id);

    setUnidadesSelecionadas((atuais) =>
      selecionada
        ? atuais.filter((id) => id !== unidadeId)
        : [...atuais, unidadeId],
    );
    setSelecionados((atuais) => {
      if (selecionada) {
        return atuais.filter((id) => !servidorIdsDaUnidade.includes(id));
      }

      return Array.from(new Set([...atuais, ...servidorIdsDaUnidade]));
    });
  }

  function alterarModoSelecao(modo: ModoSelecao) {
    setModoSelecao(modo);
    setSelecionados([]);
    setUnidadesSelecionadas([]);
    setOrgaoSelecionadoId("");
    setBuscaPessoa("");
    setBuscaUnidade("");
    setBuscaOrgao("");
  }

  function selecionarOrgao(orgaoId: string) {
    setOrgaoSelecionadoId((atual) => (atual === orgaoId ? "" : orgaoId));
  }

  const orgaoSelecionado = orgaoSelecionadoId
    ? orgaosPorId.get(orgaoSelecionadoId)
    : null;
  const totalAbrangido =
    modoSelecao === "SECCIONAL" && orgaoSelecionadoId
      ? (quantidadePessoasPorOrgao.get(orgaoSelecionadoId) ?? 0)
      : selecionados.length;
  const tipoVinculacao =
    modoSelecao === "SECCIONAL"
      ? "SECCIONAL"
      : modoSelecao === "UNIDADES"
        ? "UNIDADE"
        : dataFim
          ? "TEMPORARIA"
          : "PERMANENTE";

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm"
    >
      <div>
        <h2 className="text-lg font-bold">Associar horário às pessoas</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          O horário vigente será usado para apuração diária, carga mensal, banco
          de horas e homologação.
        </p>
      </div>

      {estado.mensagem && (
        <div
          role="alert"
          className={`rounded-lg border p-3 text-sm ${
            estado.sucesso
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {estado.mensagem}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <fieldset className="flex flex-wrap items-center gap-3">
              <legend className="sr-only">Tipo de seleção</legend>
              {(["PESSOAS", "UNIDADES", "SECCIONAL"] as const).map((modo) => (
                <label
                  key={modo}
                  className="inline-flex items-center gap-2 text-sm font-semibold"
                >
                  <input
                    type="radio"
                    name="modoSelecao"
                    value={modo}
                    checked={modoSelecao === modo}
                    onChange={() => alterarModoSelecao(modo)}
                    className="size-4 accent-blue-900"
                  />
                  {modo === "PESSOAS"
                    ? "Pessoas"
                    : modo === "UNIDADES"
                      ? "Unidades"
                      : "Seccional"}
                </label>
              ))}
            </fieldset>
            <span className="text-xs font-semibold text-[var(--muted-foreground)]">
              {totalAbrangido} pessoa(s) abrangida(s)
            </span>
          </div>

          <input type="hidden" name="orgaoId" value={orgaoSelecionadoId} />
          <input type="hidden" name="tipoVinculacao" value={tipoVinculacao} />

          {modoSelecao !== "SECCIONAL" &&
            selecionados.map((id) => (
              <input key={id} type="hidden" name="servidorIds" value={id} />
            ))}

          {modoSelecao === "SECCIONAL" && (
            <div className="grid gap-2">
              <label htmlFor="orgaoIdSelect" className="text-sm font-semibold">
                Seccional
              </label>
              <select
                id="orgaoIdSelect"
                value={orgaoSelecionadoId}
                onChange={(event) => setOrgaoSelecionadoId(event.target.value)}
                className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              >
                <option value="">Selecione a seccional</option>
                {orgaos.map((orgao) => (
                  <option key={orgao.id} value={orgao.id}>
                    {rotuloOrgao(orgao)} -{" "}
                    {quantidadePessoasPorOrgao.get(orgao.id) ?? 0} pessoa(s)
                    ativa(s)
                  </option>
                ))}
              </select>
              {orgaos.length === 0 && (
                <p className="text-sm text-red-600">
                  Nenhuma seccional disponível para o perfil ativo.
                </p>
              )}
            </div>
          )}

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
              aria-hidden="true"
            />
            <input
              id={
                modoSelecao === "PESSOAS"
                  ? "buscaPessoa"
                  : modoSelecao === "UNIDADES"
                    ? "buscaUnidade"
                    : "buscaOrgao"
              }
              value={
                modoSelecao === "PESSOAS"
                  ? buscaPessoa
                  : modoSelecao === "UNIDADES"
                    ? buscaUnidade
                    : buscaOrgao
              }
              onChange={(event) =>
                modoSelecao === "PESSOAS"
                  ? setBuscaPessoa(event.target.value)
                  : modoSelecao === "UNIDADES"
                    ? setBuscaUnidade(event.target.value)
                    : setBuscaOrgao(event.target.value)
              }
              placeholder={
                modoSelecao === "PESSOAS"
                  ? "Pesquisar por matrícula, nome ou lotação..."
                  : modoSelecao === "UNIDADES"
                    ? "Pesquisar por sigla ou nome da unidade..."
                    : "Pesquisar por sigla ou nome da seccional..."
              }
              className="h-11 w-full rounded-md border bg-[var(--card)] pl-9 pr-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
          </div>

          {(selecionados.length > 0 || orgaoSelecionado) && (
            <div className="flex flex-wrap gap-2">
              {modoSelecao === "SECCIONAL" && orgaoSelecionado ? (
                <button
                  type="button"
                  onClick={() => selecionarOrgao(orgaoSelecionado.id)}
                  className="inline-flex max-w-full items-center gap-2 rounded-md border bg-[var(--muted)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)]"
                  title="Remover seccional"
                >
                  <span className="truncate">
                    {rotuloOrgao(orgaoSelecionado)}
                  </span>
                  <X className="size-3.5 shrink-0" aria-hidden="true" />
                </button>
              ) : modoSelecao === "UNIDADES" ? (
                unidadesSelecionadas.map((id) => {
                    const unidade = unidadesPorId.get(id);

                    if (!unidade) {
                      return null;
                    }

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => alternarUnidade(id)}
                        className="inline-flex max-w-full items-center gap-2 rounded-md border bg-[var(--muted)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)]"
                        title="Remover unidade"
                      >
                        <span className="truncate">
                          {rotuloUnidade(unidade)}
                        </span>
                        <X className="size-3.5 shrink-0" aria-hidden="true" />
                      </button>
                    );
                  })
              ) : (
                selecionados.map((id) => {
                    const servidor = servidoresPorId.get(id);

                    if (!servidor) {
                      return null;
                    }

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => alternarPessoa(id)}
                        className="inline-flex max-w-full items-center gap-2 rounded-md border bg-[var(--muted)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)]"
                        title="Remover pessoa"
                      >
                        <span className="truncate">
                          {rotuloServidor(servidor)}
                        </span>
                        <X className="size-3.5 shrink-0" aria-hidden="true" />
                      </button>
                    );
                  })
              )}
            </div>
          )}

          <div className="max-h-72 overflow-y-auto rounded-md border">
            {modoSelecao === "SECCIONAL"
              ? orgaosFiltrados.map((orgao) => {
                  const selecionado = orgaoSelecionadoId === orgao.id;
                  const quantidade =
                    quantidadePessoasPorOrgao.get(orgao.id) ?? 0;

                  return (
                    <button
                      key={orgao.id}
                      type="button"
                      onClick={() => selecionarOrgao(orgao.id)}
                      className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[var(--muted)]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {rotuloOrgao(orgao)}
                        </span>
                        <span className="block text-xs text-[var(--muted-foreground)]">
                          {quantidade} pessoa(s) ativa(s)
                        </span>
                      </span>
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded border ${
                          selecionado
                            ? "border-blue-900 bg-blue-900 text-white"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {selecionado && <Check className="size-3.5" />}
                      </span>
                    </button>
                  );
                })
              : modoSelecao === "UNIDADES"
                ? unidadesFiltradas.map((unidade) => {
                  const selecionado = unidadesSelecionadas.includes(unidade.id);

                  return (
                    <button
                      key={unidade.id}
                      type="button"
                      onClick={() => alternarUnidade(unidade.id)}
                      className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[var(--muted)]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {rotuloUnidade(unidade)}
                        </span>
                        <span className="block text-xs text-[var(--muted-foreground)]">
                          {unidade.quantidadePessoas} pessoa(s) ativa(s)
                        </span>
                      </span>
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded border ${
                          selecionado
                            ? "border-blue-900 bg-blue-900 text-white"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {selecionado && <Check className="size-3.5" />}
                      </span>
                    </button>
                  );
                })
              : servidoresFiltrados.map((servidor) => {
                  const selecionado = selecionados.includes(servidor.id);

                  return (
                    <button
                      key={servidor.id}
                      type="button"
                      onClick={() => alternarPessoa(servidor.id)}
                      className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[var(--muted)]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {rotuloServidor(servidor)}
                        </span>
                      </span>
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded border ${
                          selecionado
                            ? "border-blue-900 bg-blue-900 text-white"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {selecionado && <Check className="size-3.5" />}
                      </span>
                    </button>
                  );
                })}

            {modoSelecao === "PESSOAS" && servidoresFiltrados.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
                Nenhuma pessoa encontrada.
              </div>
            )}
            {modoSelecao === "UNIDADES" && unidadesFiltradas.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
                Nenhuma unidade encontrada.
              </div>
            )}
            {modoSelecao === "SECCIONAL" && orgaosFiltrados.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
                Nenhuma seccional encontrada.
              </div>
            )}
          </div>

          {erro(estado, "servidorIds") && (
            <p className="text-sm text-red-600">
              {erro(estado, "servidorIds")}
            </p>
          )}
          {erro(estado, "orgaoId") && (
            <p className="text-sm text-red-600">{erro(estado, "orgaoId")}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="jornadaId" className="text-sm font-semibold">
            Horário
          </label>
          <select
            id="jornadaId"
            name="jornadaId"
            defaultValue={estado.campos?.jornadaId ?? ""}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            required
          >
            <option value="">Selecione</option>
            {jornadas.map((jornada) => (
              <option key={jornada.id} value={jornada.id}>
                {rotuloJornada(jornada)}
              </option>
            ))}
          </select>
          {erro(estado, "jornadaId") && (
            <p className="text-sm text-red-600">{erro(estado, "jornadaId")}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="dataInicio" className="text-sm font-semibold">
            Data de início
          </label>
          <input
            id="dataInicio"
            name="dataInicio"
            type="date"
            defaultValue={estado.campos?.dataInicio ?? ""}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            required
          />
          {erro(estado, "dataInicio") && (
            <p className="text-sm text-red-600">{erro(estado, "dataInicio")}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="dataFim" className="text-sm font-semibold">
            Data final
          </label>
          <input
            id="dataFim"
            name="dataFim"
            type="date"
            value={dataFim}
            onChange={(event) => setDataFim(event.target.value)}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </div>

        <div className="hidden">
          <label htmlFor="tipoVinculacao" className="text-sm font-semibold">
            Tipo de vinculação
          </label>
          <select
            id="tipoVinculacao"
            name="tipoVinculacao"
            value={tipoVinculacao}
            onChange={() => {
              if (modoSelecao === "PESSOAS") {
                setTipoVinculacao();
              }
            }}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          >
            <option value="PERMANENTE">Permanente</option>
            <option value="TEMPORARIA">Temporária</option>
            <option value="CARGO_CATEGORIA">Por cargo/categoria</option>
            <option value="UNIDADE">Por unidade</option>
            <option value="SECCIONAL">Por seccional</option>
            <option value="PADRAO_ORGAO">Padrão do órgão</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="documentoSei" className="text-sm font-semibold">
            Documento SEI
          </label>
          <input
            id="documentoSei"
            name="documentoSei"
            defaultValue={estado.campos?.documentoSei ?? ""}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label
            htmlFor="fundamentoDocumental"
            className="text-sm font-semibold"
          >
            Fundamento documental
          </label>
          <input
            id="fundamentoDocumental"
            name="fundamentoDocumental"
            defaultValue={estado.campos?.fundamentoDocumental ?? ""}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            placeholder="Portaria, decisão, processo ou ato que fundamenta a vinculação"
          />
          {erro(estado, "fundamentoDocumental") && (
            <p className="text-sm text-red-600">
              {erro(estado, "fundamentoDocumental")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="motivo" className="text-sm font-semibold">
            Motivo
          </label>
          <input
            id="motivo"
            name="motivo"
            defaultValue={estado.campos?.motivo ?? ""}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="autoridadeResponsavel"
            className="text-sm font-semibold"
          >
            Autoridade responsável
          </label>
          <input
            id="autoridadeResponsavel"
            name="autoridadeResponsavel"
            defaultValue={estado.campos?.autoridadeResponsavel ?? ""}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </div>

        <label className="flex items-start gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm md:col-span-2">
          <input
            type="checkbox"
            name="horarioDiferenciadoAutorizado"
            defaultChecked={
              estado.campos?.horarioDiferenciadoAutorizado ?? false
            }
            className="mt-0.5 size-4 rounded border-slate-300 accent-blue-900"
          />
          <span>
            <span className="block font-semibold">
              Autorizar horário diferenciado
            </span>
            <span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">
              Permite computar frequência entre 06:00 e 19:00, somente quando o
              horário selecionado admitir essa exceção.
            </span>
            {erro(estado, "horarioDiferenciadoAutorizado") && (
              <span className="mt-1 block text-sm text-red-600">
                {erro(estado, "horarioDiferenciadoAutorizado")}
              </span>
            )}
          </span>
        </label>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="justificativa" className="text-sm font-semibold">
            Justificativa
          </label>
          <textarea
            id="justificativa"
            name="justificativa"
            defaultValue={estado.campos?.justificativa ?? ""}
            rows={3}
            className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            placeholder="Informe a base administrativa. Obrigatória para horário diferenciado ou carga inferior a 8h em FC/CJ."
          />
          {erro(estado, "justificativa") && (
            <p className="text-sm text-red-600">
              {erro(estado, "justificativa")}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Associar horário
        </button>
      </div>
    </form>
  );
}
