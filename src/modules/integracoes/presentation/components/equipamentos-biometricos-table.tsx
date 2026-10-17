"use client";

import { Select as SelectPesquisavel } from "@/components/ui/form-controls";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Copy,
  Edit3,
  Eye,
  Fingerprint,
  Grid2X2,
  List,
  MoreVertical,
  Search,
  Server,
  SlidersHorizontal,
} from "lucide-react";

import { excluirEquipamentoBiometricoAction } from "../../application/actions/excluir-equipamento-biometrico.action";
import { ExcluirEquipamentoButton } from "./excluir-equipamento-button";

type ColetaAtivaItem = {
  id: string;
  status: "AGUARDANDO" | "PROCESSANDO" | "CONCLUIDO" | "ERRO" | "CANCELADO";
  equipamentoId: string;
  atualizadoEm: string;
  progresso: {
    percentual: number;
    etapa: string;
  };
};

type StatusListenerOnline = {
  ativo: boolean;
  host: string;
  porta: number;
  iniciadoEm: Date | null;
};

type EquipamentoItem = {
  id: string;
  codigo: string;
  nome: string;
  fabricante: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  ip: string | null;
  porta: number | null;
  localizacao: string | null;
  ativo: boolean;
  orgaoId: string | null;
  unidadeId: string | null;
  ultimoHeartbeatEm: Date | null;
  ultimaSincronizacaoEm: Date | null;
  configuracao: unknown;
  estatisticasMarcacoes?: {
    marcacoesBrutas: number;
    marcacoesPendentes: number;
  };
  unidade: {
    sigla: string;
  } | null;
  orgao: {
    sigla: string;
  } | null;
  _count: {
    eventos: number;
  };
};

type EstadoOperacional = {
  label: "Online" | "Atencao" | "Offline" | "Coletando" | "Inativo" | "Sem comunicacao";
  detalhe: string;
  classe: string;
  dot: string;
};

function getProximoNsr(configuracao: unknown) {
  if (!configuracao || typeof configuracao !== "object") {
    return "-";
  }

  const dados = configuracao as {
    proximoNsrColeta?: unknown;
    ultimoNsrColetado?: unknown;
  };

  if (dados.proximoNsrColeta) return String(dados.proximoNsrColeta);
  if (dados.ultimoNsrColetado) return String(Number(dados.ultimoNsrColetado) + 1);

  return "-";
}

function getUltimaComunicacao(equipamento: EquipamentoItem) {
  const datas = [equipamento.ultimoHeartbeatEm, equipamento.ultimaSincronizacaoEm]
    .filter((data): data is Date => Boolean(data))
    .map((data) => new Date(data));

  if (datas.length === 0) return null;

  return datas.reduce((maisRecente, atual) =>
    atual.getTime() > maisRecente.getTime() ? atual : maisRecente,
  );
}

function getOrigemUltimaComunicacao(equipamento: EquipamentoItem) {
  const heartbeat = equipamento.ultimoHeartbeatEm
    ? new Date(equipamento.ultimoHeartbeatEm).getTime()
    : 0;
  const sincronizacao = equipamento.ultimaSincronizacaoEm
    ? new Date(equipamento.ultimaSincronizacaoEm).getTime()
    : 0;

  if (!heartbeat && !sincronizacao) return "Sem comunicacao";
  return heartbeat >= sincronizacao ? "Listener online" : "Coleta";
}

function getMinutosDesde(data: Date | null) {
  if (!data) return null;
  return (Date.now() - new Date(data).getTime()) / 60000;
}

function formatarMinutos(minutos: number) {
  if (minutos < 1) return "agora";
  if (minutos < 60) return `Ha ${Math.floor(minutos)} minutos`;
  const horas = Math.floor(minutos / 60);
  return `Ha ${horas} horas`;
}

function getEstadoOperacional(
  equipamento: EquipamentoItem,
  listenerOnlineAtivo: boolean,
  coletaAtiva?: ColetaAtivaItem,
): EstadoOperacional {
  if (!equipamento.ativo) {
    return {
      label: "Inativo",
      detalhe: "Cadastro desativado",
      classe: "bg-slate-100 text-slate-700",
      dot: "bg-slate-400",
    };
  }

  if (coletaAtiva) {
    return {
      label: "Coletando",
      detalhe: `Reprocessando ${coletaAtiva.progresso.percentual}%`,
      classe: "bg-blue-50 text-blue-800",
      dot: "bg-blue-600",
    };
  }

  const ultimaComunicacao = getUltimaComunicacao(equipamento);
  const minutos = getMinutosDesde(ultimaComunicacao);

  if (minutos === null) {
    return {
      label: "Sem comunicacao",
      detalhe: listenerOnlineAtivo ? "Aguardando relogio" : "Listener parado",
      classe: "bg-slate-100 text-slate-700",
      dot: "bg-slate-400",
    };
  }

  if (minutos <= 5) {
    return {
      label: "Online",
      detalhe: listenerOnlineAtivo ? "Listener online" : "Listener parado",
      classe: "bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
    };
  }

  if (minutos <= 120) {
    return {
      label: "Atencao",
      detalhe: formatarMinutos(minutos),
      classe: "bg-amber-50 text-amber-700",
      dot: "bg-amber-500",
    };
  }

  return {
    label: "Offline",
    detalhe: formatarMinutos(minutos),
    classe: "bg-red-50 text-red-700",
    dot: "bg-red-500",
  };
}

function formatarData(data: Date | null) {
  return data
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(data))
    : "-";
}

function formatarNumero(valor: number) {
  return valor.toLocaleString("pt-BR");
}

function valoresUnicos(
  equipamentos: EquipamentoItem[],
  resolver: (equipamento: EquipamentoItem) => string | null | undefined,
) {
  return Array.from(
    new Set(equipamentos.map(resolver).filter((valor): valor is string => Boolean(valor))),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function EquipamentosBiometricosTable({
  equipamentos,
  coletasAtivas,
  statusListenerOnline,
  orgaoId,
}: {
  equipamentos: EquipamentoItem[];
  coletasAtivas: ColetaAtivaItem[];
  statusListenerOnline: StatusListenerOnline;
  orgaoId?: string | null;
}) {
  const [busca, setBusca] = useState("");
  const [filtroOrgao, setFiltroOrgao] = useState("todos");
  const [filtroFabricante, setFiltroFabricante] = useState("todos");
  const [filtroModelo, setFiltroModelo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("nome");
  const coletasPorEquipamento = useMemo(
    () => new Map(coletasAtivas.map((coleta) => [coleta.equipamentoId, coleta])),
    [coletasAtivas],
  );
  const opcoesOrgao = useMemo(
    () => valoresUnicos(equipamentos, (equipamento) => equipamento.orgao?.sigla),
    [equipamentos],
  );
  const opcoesFabricante = useMemo(
    () => valoresUnicos(equipamentos, (equipamento) => equipamento.fabricante),
    [equipamentos],
  );
  const opcoesModelo = useMemo(
    () => valoresUnicos(equipamentos, (equipamento) => equipamento.modelo),
    [equipamentos],
  );
  const equipamentosFiltrados = useMemo(() => {
    const texto = busca.trim().toLowerCase();

    return equipamentos
      .filter((equipamento) => {
        const coletaAtiva = coletasPorEquipamento.get(equipamento.id);
        const estado = getEstadoOperacional(
          equipamento,
          statusListenerOnline.ativo,
          coletaAtiva,
        );
        const conteudoBusca = [
          equipamento.codigo,
          equipamento.nome,
          equipamento.numeroSerie,
          equipamento.ip,
          equipamento.localizacao,
          equipamento.orgao?.sigla,
          equipamento.unidade?.sigla,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          (!texto || conteudoBusca.includes(texto)) &&
          (filtroOrgao === "todos" || equipamento.orgao?.sigla === filtroOrgao) &&
          (filtroFabricante === "todos" ||
            equipamento.fabricante === filtroFabricante) &&
          (filtroModelo === "todos" || equipamento.modelo === filtroModelo) &&
          (filtroStatus === "todos" || estado.label === filtroStatus)
        );
      })
      .sort((a, b) => {
        if (ordenacao === "comunicacao") {
          return (
            (getUltimaComunicacao(b)?.getTime() ?? 0) -
            (getUltimaComunicacao(a)?.getTime() ?? 0)
          );
        }

        if (ordenacao === "pendentes") {
          return (
            (b.estatisticasMarcacoes?.marcacoesPendentes ?? 0) -
            (a.estatisticasMarcacoes?.marcacoesPendentes ?? 0)
          );
        }

        return a.nome.localeCompare(b.nome, "pt-BR");
      });
  }, [
    busca,
    coletasPorEquipamento,
    equipamentos,
    filtroFabricante,
    filtroModelo,
    filtroOrgao,
    filtroStatus,
    ordenacao,
    statusListenerOnline.ativo,
  ]);
  const montarHrefEditar = (id: string) =>
    orgaoId
      ? `/equipamentos/${id}/editar?${new URLSearchParams({
          orgaoId,
        }).toString()}`
      : `/equipamentos/${id}/editar`;

  function limparFiltros() {
    setBusca("");
    setFiltroOrgao("todos");
    setFiltroFabricante("todos");
    setFiltroModelo("todos");
    setFiltroStatus("todos");
  }

  return (
    <section className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1.7fr)_repeat(5,minmax(130px,1fr))_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar equipamento, nome, IP ou NSR..."
              className="h-11 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <FiltroSelect label="Seccional" value={filtroOrgao} onChange={setFiltroOrgao}>
            <option value="todos">Todos</option>
            {opcoesOrgao.map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao}
              </option>
            ))}
          </FiltroSelect>
          <FiltroSelect
            label="Fabricante"
            value={filtroFabricante}
            onChange={setFiltroFabricante}
          >
            <option value="todos">Todos</option>
            {opcoesFabricante.map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao}
              </option>
            ))}
          </FiltroSelect>
          <FiltroSelect label="Modelo" value={filtroModelo} onChange={setFiltroModelo}>
            <option value="todos">Todos</option>
            {opcoesModelo.map((opcao) => (
              <option key={opcao} value={opcao}>
                {opcao}
              </option>
            ))}
          </FiltroSelect>
          <FiltroSelect
            label="Status operacional"
            value={filtroStatus}
            onChange={setFiltroStatus}
          >
            <option value="todos">Todos</option>
            <option value="Online">Online</option>
            <option value="Atencao">Atencao</option>
            <option value="Offline">Offline</option>
            <option value="Coletando">Coletando</option>
            <option value="Inativo">Inativo</option>
            <option value="Sem comunicacao">Sem comunicacao</option>
          </FiltroSelect>
          <FiltroSelect label="Comunicacao" value="todos" onChange={() => undefined}>
            <option value="todos">Todos</option>
          </FiltroSelect>
          <button
            type="button"
            onClick={limparFiltros}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
          >
            <SlidersHorizontal className="size-4" />
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Fingerprint className="size-5 text-blue-700" />
            <h2 className="text-lg font-black text-blue-950">
              Equipamentos ({equipamentosFiltrados.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Ordenar por:</span>
            <SelectPesquisavel
              value={ordenacao}
              onChange={(event) => setOrdenacao(event.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-blue-900"
            >
              <option value="nome">Nome (A - Z)</option>
              <option value="comunicacao">Ultima comunicacao</option>
              <option value="pendentes">Mais pendentes</option>
            </SelectPesquisavel>
            <button className="inline-flex size-9 items-center justify-center rounded-md bg-blue-900 text-white">
              <List className="size-4" />
            </button>
            <button className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-slate-500">
              <Grid2X2 className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-black uppercase text-blue-950">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" aria-label="Selecionar todos" />
                </th>
                <th className="px-4 py-3">Codigo</th>
                <th className="px-4 py-3">Equipamento</th>
                <th className="px-4 py-3">Orgao / Unidade</th>
                <th className="px-4 py-3">Fabricante / Modelo</th>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3">NSR</th>
                <th className="px-4 py-3">Marcacoes brutas</th>
                <th className="px-4 py-3">Pendentes</th>
                <th className="px-4 py-3">Ultima comunicacao</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Acoes</th>
              </tr>
            </thead>

            <tbody>
              {equipamentosFiltrados.map((equipamento) => {
                const coletaAtiva = coletasPorEquipamento.get(equipamento.id);
                const ultimaComunicacao = getUltimaComunicacao(equipamento);
                const estado = getEstadoOperacional(
                  equipamento,
                  statusListenerOnline.ativo,
                  coletaAtiva,
                );
                const minutos = getMinutosDesde(ultimaComunicacao);

                return (
                  <tr
                    key={equipamento.id}
                    className="border-t border-slate-100 hover:bg-blue-50/30"
                  >
                    <td className="px-4 py-4">
                      <input type="checkbox" aria-label={equipamento.nome} />
                    </td>
                    <td className="px-4 py-4 font-mono text-xs font-black text-blue-950">
                      {equipamento.codigo}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-950 text-blue-100 shadow-inner">
                          <Server className="size-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-blue-950">{equipamento.nome}</p>
                          <p className="mt-0.5 max-w-[260px] truncate text-xs font-semibold text-slate-500">
                            {equipamento.localizacao ?? "Sem local informado"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-black text-blue-950">
                        {equipamento.orgao?.sigla ?? "-"}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        {equipamento.unidade?.sigla ?? "Sem unidade"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">
                          {equipamento.fabricante ?? "-"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                          {equipamento.modelo ?? "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-blue-950">
                      {equipamento.ip
                        ? `${equipamento.ip}:${equipamento.porta ?? 3000}`
                        : "-"}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-blue-950">
                      {getProximoNsr(equipamento.configuracao)}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-blue-950">
                      {formatarNumero(
                        equipamento.estatisticasMarcacoes?.marcacoesBrutas ?? 0,
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-blue-950">
                      {formatarNumero(
                        equipamento.estatisticasMarcacoes?.marcacoesPendentes ?? 0,
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-mono text-xs font-bold text-blue-950">
                        {formatarData(ultimaComunicacao)}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                        <span className={`size-2 rounded-full ${estado.dot}`} />
                        {minutos === null
                          ? getOrigemUltimaComunicacao(equipamento)
                          : formatarMinutos(minutos)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${estado.classe}`}
                      >
                        <span className={`size-2 rounded-full ${estado.dot}`} />
                        {estado.label}
                      </span>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {estado.detalhe}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={montarHrefEditar(equipamento.id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-blue-100 bg-white px-3 text-xs font-black text-blue-800 hover:bg-blue-50"
                        >
                          <Eye className="size-3.5" />
                          Ver detalhes
                        </Link>
                        <Link
                          href={montarHrefEditar(equipamento.id)}
                          className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-blue-800 hover:bg-blue-50"
                          title="Editar"
                        >
                          <Edit3 className="size-3.5" />
                        </Link>
                        <Link
                          href={`/equipamentos/${equipamento.id}/clonar${
                            orgaoId
                              ? `?${new URLSearchParams({ orgaoId }).toString()}`
                              : ""
                          }`}
                          className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-blue-800 hover:bg-blue-50"
                          title="Clonar"
                        >
                          <Copy className="size-3.5" />
                        </Link>
                        <form action={excluirEquipamentoBiometricoAction}>
                          <input
                            type="hidden"
                            name="equipamentoId"
                            value={equipamento.id}
                          />
                          {orgaoId && (
                            <input type="hidden" name="orgaoId" value={orgaoId} />
                          )}
                          <ExcluirEquipamentoButton nome={equipamento.nome} />
                        </form>
                        <button
                          type="button"
                          className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-blue-800 hover:bg-blue-50"
                          aria-label="Mais acoes"
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {equipamentosFiltrados.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
                  >
                    Nenhum equipamento encontrado para os filtros informados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function FiltroSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-black text-blue-950">{label}</span>
      <SelectPesquisavel
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-blue-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </SelectPesquisavel>
    </label>
  );
}
