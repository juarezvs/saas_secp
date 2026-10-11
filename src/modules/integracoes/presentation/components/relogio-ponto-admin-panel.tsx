"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
} from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  DatabaseBackup,
  DownloadCloud,
  Fingerprint,
  List,
  PlayCircle,
  RadioTower,
  RotateCcw,
  Search,
  Settings2,
  UsersRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  coletarMarcacoesRelogioPontoAction,
  configurarEventosOnlineRelogioPontoAction,
  consultarSaudeRelogioPontoAction,
  enviarBiometriaRelogioPontoAction,
  listarCadastrosBiometricosEquipamentoAction,
  reprocessarMarcacoesRelogioPontoAction,
  sincronizarBiometriasEquipamentosOrgaoAction,
  type RelogioPontoActionState,
} from "../../application/actions/relogio-ponto.actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type EquipamentoOperacional = {
  id: string;
  codigo: string;
  nome: string;
  fabricante: string | null;
  modelo: string | null;
  ip: string | null;
  porta: number | null;
  localizacao?: string | null;
  ativo: boolean;
  orgao?: { sigla: string } | null;
  unidade?: { sigla: string } | null;
  ultimoHeartbeatEm: Date | null;
  ultimaSincronizacaoEm: Date | null;
  configuracao: unknown;
  estatisticasMarcacoes?: {
    marcacoesBrutas: number;
    marcacoesPendentes: number;
  };
};

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

type AbaOperacional = "resumo" | "coleta" | "online" | "biometria";

const estadoInicial: RelogioPontoActionState = {
  sucesso: false,
  mensagem: null,
};

const abas: Array<{ id: AbaOperacional; label: string }> = [
  { id: "resumo", label: "Resumo" },
  { id: "coleta", label: "Coleta e reprocessamento" },
  { id: "online", label: "Online" },
  { id: "biometria", label: "Biometria" },
];

function getConfiguracao(configuracao: unknown) {
  if (!configuracao || typeof configuracao !== "object") {
    return {};
  }

  return configuracao as {
    proximoNsrColeta?: unknown;
    ultimoNsrColetado?: unknown;
    eventosOnline?: {
      habilitado?: unknown;
      ipServidor?: unknown;
      portaServidor?: unknown;
    };
  };
}

function formatarData(data: Date | string | null | undefined) {
  if (!data) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

function getUltimaComunicacao(equipamento: EquipamentoOperacional) {
  const datas = [equipamento.ultimoHeartbeatEm, equipamento.ultimaSincronizacaoEm]
    .filter((data): data is Date => Boolean(data))
    .map((data) => new Date(data));

  if (datas.length === 0) return null;

  return datas.reduce((maisRecente, atual) =>
    atual.getTime() > maisRecente.getTime() ? atual : maisRecente,
  );
}

function origemUltimaComunicacao(equipamento: EquipamentoOperacional) {
  const heartbeat = equipamento.ultimoHeartbeatEm
    ? new Date(equipamento.ultimoHeartbeatEm).getTime()
    : 0;
  const sincronizacao = equipamento.ultimaSincronizacaoEm
    ? new Date(equipamento.ultimaSincronizacaoEm).getTime()
    : 0;

  if (!heartbeat && !sincronizacao) return "Sem comunicação";
  return heartbeat >= sincronizacao ? "Evento online/heartbeat" : "Coleta";
}

function formatarMinutos(minutos: number) {
  if (minutos < 1) return "agora";
  if (minutos < 60) return `${Math.floor(minutos)} min atrás`;
  return `${Math.floor(minutos / 60)} h atrás`;
}

function statusOperacional(
  equipamento: EquipamentoOperacional,
  listenerOnlineAtivo: boolean,
  coletaAtiva?: ColetaAtivaItem,
) {
  if (!equipamento.ativo) {
    return {
      label: "Inativo",
      detalhe: "Cadastro desativado",
      classe: "bg-slate-100 text-slate-700",
    };
  }

  if (coletaAtiva) {
    return {
      label: "Coletando",
      detalhe: `${coletaAtiva.progresso.percentual}% concluído`,
      classe: "bg-blue-50 text-blue-800",
    };
  }

  const ultimaComunicacao = getUltimaComunicacao(equipamento);
  if (!ultimaComunicacao) {
    return {
      label: "Sem comunicação",
      detalhe: listenerOnlineAtivo
        ? "SECP escutando; aguardando relógio"
        : "Listener online não iniciado",
      classe: "bg-slate-100 text-slate-700",
    };
  }

  const minutos = (Date.now() - ultimaComunicacao.getTime()) / 60000;

  if (minutos <= 5) {
    return {
      label: "Online",
      detalhe: listenerOnlineAtivo
        ? "Comunica e SECP escuta eventos"
        : "Comunica; listener online parado",
      classe: "bg-green-50 text-green-700",
    };
  }

  if (minutos <= 30) {
    return {
      label: "Atrasado",
      detalhe: `Última comunicação ${formatarMinutos(minutos)}`,
      classe: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Offline",
    detalhe: `Última comunicação ${formatarMinutos(minutos)}`,
    classe: "bg-red-50 text-red-700",
  };
}

function proximoNsr(configuracao: unknown) {
  const config = getConfiguracao(configuracao);

  if (config.proximoNsrColeta) return String(config.proximoNsrColeta);
  if (config.ultimoNsrColetado) return String(Number(config.ultimoNsrColetado) + 1);

  return "1";
}

function equipamentoOperacionalSuportado(equipamento: EquipamentoOperacional) {
  const fabricante = equipamento.fabricante?.toUpperCase();
  const configuracao = getConfiguracao(equipamento.configuracao) as Record<string, unknown>;
  const protocolo =
    typeof configuracao.protocolo === "string"
      ? configuracao.protocolo.toUpperCase()
      : "";

  return (
    fabricante === "HENRY" ||
    fabricante === "DIMEP" ||
    fabricante === "CONTROL_ID" ||
    fabricante === "INTELBRAS" ||
    protocolo === "INTELBRAS_BIO_T"
  );
}

export function RelogioPontoAdminPanel({
  equipamentos,
  coletasAtivas,
  statusListenerOnline,
}: {
  equipamentos: EquipamentoOperacional[];
  coletasAtivas: ColetaAtivaItem[];
  statusListenerOnline: StatusListenerOnline;
}) {
  const [aba, setAba] = useState<AbaOperacional>("resumo");
  const [busca, setBusca] = useState("");
  const [filtroEquipamento, setFiltroEquipamento] = useState("todos");
  const [filtroFabricante, setFiltroFabricante] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const relogios = useMemo(
    () =>
      equipamentos.filter(equipamentoOperacionalSuportado),
    [equipamentos],
  );
  const coletasPorEquipamento = useMemo(
    () => new Map(coletasAtivas.map((coleta) => [coleta.equipamentoId, coleta])),
    [coletasAtivas],
  );
  const fabricantes = useMemo(
    () =>
      Array.from(
        new Set(relogios.map((relogio) => relogio.fabricante).filter(Boolean)),
      ).sort() as string[],
    [relogios],
  );
  const relogiosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return relogios.filter((relogio) => {
      const coletaAtiva = coletasPorEquipamento.get(relogio.id);
      const status = statusOperacional(
        relogio,
        statusListenerOnline.ativo,
        coletaAtiva,
      );
      const texto = [
        relogio.nome,
        relogio.codigo,
        relogio.ip,
        relogio.fabricante,
        relogio.modelo,
        relogio.orgao?.sigla,
        relogio.unidade?.sigla,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!termo || texto.includes(termo)) &&
        (filtroEquipamento === "todos" || relogio.id === filtroEquipamento) &&
        (filtroFabricante === "todos" ||
          relogio.fabricante === filtroFabricante) &&
        (filtroStatus === "todos" || status.label === filtroStatus) &&
        (filtroTipo === "todos" || aba === filtroTipo)
      );
    });
  }, [
    aba,
    busca,
    coletasPorEquipamento,
    filtroEquipamento,
    filtroFabricante,
    filtroStatus,
    filtroTipo,
    relogios,
    statusListenerOnline.ativo,
  ]);

  return (
    <Tabs
      value={aba}
      onValueChange={(value) => setAba(value as AbaOperacional)}
      className="space-y-3"
    >
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm xl:flex-row xl:items-center">
        <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
          {abas.map((item) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              className="rounded-md border border-blue-100 bg-white px-4 py-2 text-xs font-black text-blue-900 data-[state=active]:bg-blue-900 data-[state=active]:text-white"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1.6fr)_repeat(5,minmax(130px,1fr))]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar equipamento, seccional, IP ou NSR..."
              className="h-11 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <FiltroOperacoes
            label="Equipamento"
            value={filtroEquipamento}
            onChange={setFiltroEquipamento}
          >
            <option value="todos">Todos</option>
            {relogios.map((relogio) => (
              <option key={relogio.id} value={relogio.id}>
                {relogio.nome}
              </option>
            ))}
          </FiltroOperacoes>
          <FiltroOperacoes label="Seccional" value="SJAM" onChange={() => undefined}>
            <option value="SJAM">SJAM</option>
          </FiltroOperacoes>
          <FiltroOperacoes
            label="Fabricante"
            value={filtroFabricante}
            onChange={setFiltroFabricante}
          >
            <option value="todos">Todos</option>
            {fabricantes.map((fabricante) => (
              <option key={fabricante} value={fabricante}>
                {fabricante}
              </option>
            ))}
          </FiltroOperacoes>
          <FiltroOperacoes
            label="Status operacional"
            value={filtroStatus}
            onChange={setFiltroStatus}
          >
            <option value="todos">Todos</option>
            <option value="Online">Online</option>
            <option value="Atrasado">Atrasado</option>
            <option value="Offline">Offline</option>
            <option value="Coletando">Coletando</option>
            <option value="Inativo">Inativo</option>
          </FiltroOperacoes>
          <FiltroOperacoes
            label="Tipo de operacao"
            value={filtroTipo}
            onChange={setFiltroTipo}
          >
            <option value="todos">Todos</option>
            {abas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </FiltroOperacoes>
        </div>
      </div>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <Settings2 className="size-5 text-blue-700" />
              <h2 className="text-lg font-black text-blue-950">
                Equipamentos ({relogiosFiltrados.length})
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Ordenar por:</span>
              <select className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold text-blue-900">
                <option>Ultima comunicacao (mais recente)</option>
              </select>
              <button className="inline-flex size-9 items-center justify-center rounded-md bg-blue-900 text-white">
                <List className="size-4" />
              </button>
            </div>
          </div>

        {relogios.length === 0 ? (
          <div className="m-4 rounded-lg border border-dashed p-8 text-center text-sm text-[var(--muted-foreground)]">
            Nenhum equipamento de ponto suportado cadastrado. Cadastre Henry,
            Dimep Smart Print, Control iD FACE ID ou Intelbras Bio-T para
            habilitar operacoes e monitoramento.
          </div>
        ) : (
          <>
            <TabsContent value="resumo" className="mt-0">
              <ResumoRelogios
                relogios={relogiosFiltrados}
                coletasPorEquipamento={coletasPorEquipamento}
                listenerOnlineAtivo={statusListenerOnline.ativo}
                selecionarAba={setAba}
              />
            </TabsContent>
            <TabsContent value="coleta" className="mt-0">
              <ColetaRelogios
                relogios={relogiosFiltrados}
                coletasPorEquipamento={coletasPorEquipamento}
                listenerOnlineAtivo={statusListenerOnline.ativo}
              />
            </TabsContent>
            <TabsContent value="online" className="mt-0">
              <OnlineRelogios
                relogios={relogiosFiltrados}
                coletasPorEquipamento={coletasPorEquipamento}
                listenerOnlineAtivo={statusListenerOnline.ativo}
              />
            </TabsContent>
            <TabsContent value="biometria" className="mt-0">
              <BiometriaRelogios
                relogios={relogiosFiltrados}
                coletasPorEquipamento={coletasPorEquipamento}
                listenerOnlineAtivo={statusListenerOnline.ativo}
              />
            </TabsContent>
          </>
        )}
        </div>

        <PainelOperacoesLateral
          relogios={relogios}
          coletasAtivas={coletasAtivas}
          statusListenerOnline={statusListenerOnline}
          coletasPorEquipamento={coletasPorEquipamento}
        />
      </section>
    </Tabs>
  );
}

function ResumoRelogios({
  relogios,
  coletasPorEquipamento,
  listenerOnlineAtivo,
  selecionarAba,
}: {
  relogios: EquipamentoOperacional[];
  coletasPorEquipamento: Map<string, ColetaAtivaItem>;
  listenerOnlineAtivo: boolean;
  selecionarAba: (aba: AbaOperacional) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
          <tr>
            <th className="px-4 py-3">Equipamento</th>
            <th className="px-4 py-3">Endpoint</th>
            <th className="px-4 py-3">Operacional</th>
            <th className="px-4 py-3">Última comunicação</th>
            <th className="px-4 py-3">Proximo NSR</th>
            <th className="px-4 py-3">Brutas</th>
            <th className="px-4 py-3">Pendentes</th>
            <th className="px-4 py-3">Operacao atual</th>
          </tr>
        </thead>
        <tbody>
          {relogios.map((relogio) => {
            const coletaAtiva = coletasPorEquipamento.get(relogio.id);
            const status = statusOperacional(
              relogio,
              listenerOnlineAtivo,
              coletaAtiva,
            );
            const ultimaComunicacao = getUltimaComunicacao(relogio);

            return (
              <tr key={relogio.id} className="border-b last:border-b-0">
                <td className="px-4 py-4">
                  <div className="font-semibold">{relogio.nome}</div>
                  <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
                    {relogio.codigo}
                  </div>
                </td>
                <td className="px-4 py-4 font-mono text-xs">
                  {relogio.ip ? `${relogio.ip}:${relogio.porta ?? 3000}` : "-"}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${status.classe}`}
                    >
                      {status.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        relogio.ativo
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {relogio.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {status.detalhe}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>{formatarData(ultimaComunicacao)}</div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {origemUltimaComunicacao(relogio)}
                  </div>
                </td>
                <td className="px-4 py-4 font-mono text-xs">
                  {proximoNsr(relogio.configuracao)}
                </td>
                <td className="px-4 py-4">
                  {relogio.estatisticasMarcacoes?.marcacoesBrutas ?? 0}
                </td>
                <td className="px-4 py-4">
                  {relogio.estatisticasMarcacoes?.marcacoesPendentes ?? 0}
                </td>
                <td className="px-4 py-4">
                  <div className="min-w-[240px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-black text-blue-950">
                        {coletaAtiva
                          ? `${coletaAtiva.progresso.etapa} ${coletaAtiva.progresso.percentual}%`
                          : status.label === "Online"
                            ? "Coleta concluida"
                            : "Aguardando coleta"}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          coletaAtiva ? "bg-blue-600" : "bg-emerald-500"
                        }`}
                        style={{ width: `${coletaAtiva?.progresso.percentual ?? 100}%` }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => selecionarAba("coleta")}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-blue-100 px-2 text-xs font-black text-blue-800 hover:bg-blue-50"
                      >
                        <DownloadCloud className="size-3.5" />
                        Coletar
                      </button>
                      <button
                        type="button"
                        onClick={() => selecionarAba("coleta")}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-blue-100 px-2 text-xs font-black text-blue-800 hover:bg-blue-50"
                      >
                        <RotateCcw className="size-3.5" />
                        Reprocessar
                      </button>
                      <button
                        type="button"
                        onClick={() => selecionarAba("biometria")}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-blue-100 px-2 text-xs font-black text-blue-800 hover:bg-blue-50"
                      >
                        <Fingerprint className="size-3.5" />
                        Biometria
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PainelOperacoesLateral({
  relogios,
  coletasAtivas,
  statusListenerOnline,
  coletasPorEquipamento,
}: {
  relogios: EquipamentoOperacional[];
  coletasAtivas: ColetaAtivaItem[];
  statusListenerOnline: StatusListenerOnline;
  coletasPorEquipamento: Map<string, ColetaAtivaItem>;
}) {
  const online = relogios.filter((relogio) => {
    const status = statusOperacional(
      relogio,
      statusListenerOnline.ativo,
      coletasPorEquipamento.get(relogio.id),
    );
    return status.label === "Online";
  }).length;
  const pendentes = relogios.filter(
    (relogio) => (relogio.estatisticasMarcacoes?.marcacoesPendentes ?? 0) > 0,
  ).length;
  const comErro = Math.max(relogios.length - online - coletasAtivas.length, 0);
  const eventos = relogios
    .map((relogio) => ({
      relogio,
      data: getUltimaComunicacao(relogio),
      status: statusOperacional(
        relogio,
        statusListenerOnline.ativo,
        coletasPorEquipamento.get(relogio.id),
      ),
    }))
    .sort((a, b) => (b.data?.getTime() ?? 0) - (a.data?.getTime() ?? 0))
    .slice(0, 5);

  return (
    <aside className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-black text-blue-950">
            <Settings2 className="size-4 text-blue-700" />
            Central de operacoes
          </h3>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">
            Servicos ativos
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <MiniStatus icon={PlayCircle} valor={coletasAtivas.length} label="Em execucao" tom="blue" />
          <MiniStatus icon={CheckCircle2} valor={online} label="Concluidas" tom="green" />
          <MiniStatus icon={Clock3} valor={pendentes} label="Pendentes" tom="amber" />
          <MiniStatus icon={XCircle} valor={comErro} label="Com erro" tom="red" />
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-black text-blue-950">
              Fila de operacoes ({coletasAtivas.length})
            </h4>
            <button type="button" className="text-xs font-black text-blue-700">
              Ver todas
            </button>
          </div>
          <div className="space-y-2">
            {coletasAtivas.slice(0, 5).map((coleta, index) => {
              const relogio = relogios.find((item) => item.id === coleta.equipamentoId);

              return (
                <div
                  key={coleta.id}
                  className="grid grid-cols-[24px_1fr_auto] items-center gap-2 rounded-md border border-slate-100 p-2"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-black text-blue-950">
                      {coleta.progresso.etapa || "Coleta de registros"}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500">
                      {relogio?.nome ?? "Equipamento"} - {coleta.progresso.percentual}%
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">
                    {coleta.status}
                  </span>
                </div>
              );
            })}
            {coletasAtivas.length === 0 && (
              <p className="rounded-md bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                Nenhuma operacao em execucao neste momento.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black text-blue-950">Eventos recentes</h3>
          <button type="button" className="text-xs font-black text-blue-700">
            Ver todos
          </button>
        </div>
        <div className="space-y-3">
          {eventos.map(({ relogio, data, status }) => (
            <div key={relogio.id} className="flex items-start gap-2">
              <span
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
                  status.label === "Online"
                    ? "bg-emerald-50 text-emerald-700"
                    : status.label === "Atrasado"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                }`}
              >
                {status.label === "Online" ? (
                  <CheckCircle2 className="size-4" />
                ) : status.label === "Atrasado" ? (
                  <AlertTriangle className="size-4" />
                ) : (
                  <XCircle className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-blue-950">
                  {status.label === "Online"
                    ? "Heartbeat recebido"
                    : status.label === "Atrasado"
                      ? "Comunicacao atrasada"
                      : "Falha na comunicacao"}
                </p>
                <p className="truncate text-[11px] font-semibold text-slate-500">
                  {relogio.nome} - {status.detalhe}
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                {data
                  ? new Intl.DateTimeFormat("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(data)
                  : "-"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function MiniStatus({
  icon: Icon,
  valor,
  label,
  tom,
}: {
  icon: LucideIcon;
  valor: number;
  label: string;
  tom: "blue" | "green" | "amber" | "red";
}) {
  const cores = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  } satisfies Record<typeof tom, string>;

  return (
    <div className="rounded-md bg-slate-50 p-2">
      <div className="flex items-center gap-1">
        <span className={`flex size-7 items-center justify-center rounded-md ${cores[tom]}`}>
          <Icon className="size-4" />
        </span>
        <span className="text-lg font-black text-blue-950">{valor}</span>
      </div>
      <p className="mt-1 text-[10px] font-bold text-slate-500">{label}</p>
    </div>
  );
}

function FiltroOperacoes({
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
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-blue-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}

function ColetaRelogios({
  relogios,
  coletasPorEquipamento,
  listenerOnlineAtivo,
}: {
  relogios: EquipamentoOperacional[];
  coletasPorEquipamento: Map<string, ColetaAtivaItem>;
  listenerOnlineAtivo: boolean;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {relogios.map((relogio) => (
        <ColetaRelogioCard
          key={relogio.id}
          equipamento={relogio}
          coletaAtiva={coletasPorEquipamento.get(relogio.id)}
          listenerOnlineAtivo={listenerOnlineAtivo}
        />
      ))}
    </div>
  );
}

function ColetaRelogioCard({
  equipamento,
  coletaAtiva,
  listenerOnlineAtivo,
}: {
  equipamento: EquipamentoOperacional;
  coletaAtiva?: ColetaAtivaItem;
  listenerOnlineAtivo: boolean;
}) {
  const [estadoColeta, actionColeta, pendenteColeta] = useActionState(
    coletarMarcacoesRelogioPontoAction,
    estadoInicial,
  );
  const [estadoReprocessar, actionReprocessar, pendenteReprocessar] =
    useActionState(reprocessarMarcacoesRelogioPontoAction, estadoInicial);

  return (
    <article className="rounded-lg border p-4">
      <CabecalhoEquipamento
        equipamento={equipamento}
        coletaAtiva={coletaAtiva}
        listenerOnlineAtivo={listenerOnlineAtivo}
      />

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <form action={actionColeta} className="rounded-md border bg-[var(--muted)] p-3">
          <input type="hidden" name="equipamentoId" value={equipamento.id} />
          <div className="mb-3">
            <div className="text-sm font-semibold">Coletar um lote</div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Busca uma quantidade limitada de marcações a partir do NSR informado.
              Use para conferir ou recuperar um trecho pequeno do relógio.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CampoTexto
              label="NSR inicial"
              name="nsrInicial"
              defaultValue={proximoNsr(equipamento.configuracao)}
              placeholder="auto"
              mono
            />
            <CampoTexto
              label="Quantidade"
              name="quantidade"
              type="number"
              min={1}
              max={500}
              defaultValue={50}
            />
          </div>
          <BotaoOperacao
            disabled={pendenteColeta || !equipamento.ativo}
            icon={DownloadCloud}
            label={pendenteColeta ? "Coletando..." : "Coletar lote"}
          />
          {pendenteColeta && (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              Coleta em andamento. Aguarde a resposta do relógio.
            </p>
          )}
          <MensagemAction estado={estadoColeta} />
        </form>

        <form
          action={actionReprocessar}
          className="rounded-md border bg-[var(--muted)] p-3"
        >
          <input type="hidden" name="equipamentoId" value={equipamento.id} />
          <div className="mb-3">
            <div className="text-sm font-semibold">Reprocessar brutas pendentes</div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Tenta vincular e processar marcações brutas já salvas no banco, sem
              consultar novamente o relógio.
            </p>
          </div>
          <CampoTexto
            label="Limite de pendentes"
            name="limiteReprocessamento"
            type="number"
            min={1}
            max={50000}
            defaultValue={5000}
          />
          <BotaoOperacao
            disabled={pendenteReprocessar || !equipamento.ativo}
            icon={RotateCcw}
            label={pendenteReprocessar ? "Reprocessando..." : "Reprocessar pendentes"}
          />
          {pendenteReprocessar && (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              Reprocessamento em andamento. A operação termina ao concluir o lote.
            </p>
          )}
          <MensagemAction estado={estadoReprocessar} />
        </form>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <ColetaProgressivaForm
          equipamento={equipamento}
          modo="TODAS"
          titulo="Captura completa do relógio"
          descricao="Percorre o relógio por NSR e atualiza o cursor global do equipamento."
          nsrInicialPadrao="1"
        />
        <ColetaProgressivaForm
          equipamento={equipamento}
          modo="SERVIDOR"
          titulo="Capturar servidor"
          descricao="Busca CPF/matrícula no cadastro do servidor e salva apenas registros correspondentes."
          nsrInicialPadrao="1"
        />
      </div>
    </article>
  );
}

type ColetaProgressivaJob = {
  id: string;
  status: "AGUARDANDO" | "PROCESSANDO" | "CONCLUIDO" | "ERRO" | "CANCELADO";
  erro?: string | null;
  progresso: {
    percentual: number;
    etapa: string;
    lotesExecutados: number;
    limiteLotes: number;
    recebidas: number;
    criadas: number;
    processadas: number;
    ignoradasPorFiltro: number;
    proximoNsr: string | null;
  };
  resultado?: {
    limiteAtingido?: boolean;
  } | null;
};

function ColetaProgressivaForm({
  equipamento,
  modo,
  nsrInicialPadrao,
}: {
  equipamento: EquipamentoOperacional;
  modo: "TODAS" | "SERVIDOR";
  titulo: string;
  descricao: string;
  nsrInicialPadrao: string;
}) {
  const [job, setJob] = useState<ColetaProgressivaJob | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const emAndamento = job?.status === "AGUARDANDO" || job?.status === "PROCESSANDO";
  const tituloExibido =
    modo === "SERVIDOR" ? "Capturar servidor" : "Captura completa do relógio";
  const descricaoExibida =
    modo === "SERVIDOR"
      ? "Busca CPF/matrícula no cadastro do servidor, percorre os lotes do relógio e salva apenas registros correspondentes."
      : "Percorre o relógio por NSR, grava as marcações encontradas e atualiza o cursor global do equipamento.";

  useEffect(() => {
    if (!job?.id || !emAndamento) {
      return;
    }

    const timer = setInterval(async () => {
      const response = await fetch(
        `/api/equipamentos-biometricos/coleta-progressiva?jobId=${encodeURIComponent(job.id)}`,
      );

      if (!response.ok) {
        setErro("Não foi possível consultar o progresso da coleta.");
        clearInterval(timer);
        return;
      }

      const atualizado = (await response.json()) as ColetaProgressivaJob;
      setJob(atualizado);

      if (["CONCLUIDO", "ERRO", "CANCELADO"].includes(atualizado.status)) {
        setCancelando(false);
        clearInterval(timer);
      }
    }, 1200);

    return () => clearInterval(timer);
  }, [job?.id, emAndamento]);

  async function iniciarColeta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    const formData = new FormData(event.currentTarget);
    const confirmar = formData.get("confirmar") === "on";

    if (!confirmar) {
      setErro("Confirme a operacao antes de iniciar.");
      return;
    }

    const response = await fetch("/api/equipamentos-biometricos/coleta-progressiva", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        equipamentoId: equipamento.id,
        modo,
        nsrInicial: String(formData.get("nsrInicial") ?? "").trim() || "1",
        quantidadePorLote: Number(formData.get("quantidadePorLote") ?? 100),
        limiteLotes: Number(formData.get("limiteLotes") ?? 100),
        reprocessarAoFinal: formData.get("reprocessarAoFinal") === "on",
        servidorBusca: String(formData.get("servidorBusca") ?? "").trim(),
      }),
    });

    const body = await response.json();

    if (!response.ok) {
      setErro(body?.mensagem ?? "Não foi possível iniciar a coleta.");
      return;
    }

    setJob(body as ColetaProgressivaJob);
  }

  async function cancelarColeta() {
    if (!job?.id || !emAndamento) {
      return;
    }

    setCancelando(true);
    setErro(null);

    const response = await fetch("/api/equipamentos-biometricos/coleta-progressiva", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        jobId: job.id,
        acao: "CANCELAR",
      }),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setCancelando(false);
      setErro(body?.mensagem ?? "Não foi possível cancelar a coleta.");
      return;
    }

    setJob(body as ColetaProgressivaJob);
  }

  const percentual = Math.max(0, Math.min(job?.progresso.percentual ?? 0, 100));

  return (
    <form
      onSubmit={iniciarColeta}
      className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950"
    >
      <div className="flex items-center gap-2 font-semibold">
        <DatabaseBackup className="size-4" />
        {tituloExibido}
      </div>
      <p className="mt-1 text-xs text-amber-900">{descricaoExibida}</p>
      <p className="mt-1 text-xs text-amber-800">
        Enquanto estiver em execução, o relógio fica reservado para evitar disputa
        com o worker automático. O cancelamento para a coleta ao final do lote atual.
      </p>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {modo === "SERVIDOR" && (
          <CampoTexto
            label="CPF ou matricula"
            name="servidorBusca"
            placeholder="Servidor"
            required
          />
        )}
        <CampoTexto
          label="NSR inicial"
          name="nsrInicial"
          defaultValue={nsrInicialPadrao}
          mono
        />
        <CampoTexto
          label="Registros por lote"
          name="quantidadePorLote"
          type="number"
          min={1}
          max={500}
          defaultValue={100}
        />
        <CampoTexto
          label="Limite de lotes"
          name="limiteLotes"
          type="number"
          min={1}
          max={500}
          defaultValue={modo === "SERVIDOR" ? 50 : 100}
        />
        <label className="flex items-end gap-2 pb-2 text-xs font-semibold">
          <input type="checkbox" name="reprocessarAoFinal" defaultChecked />
          Reprocessar ao final
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs font-semibold">
        <input type="checkbox" name="confirmar" />
        Confirmo a coleta a partir do NSR informado.
      </label>

      <button
        type={emAndamento ? "button" : "submit"}
        onClick={emAndamento ? cancelarColeta : undefined}
        disabled={cancelando || !equipamento.ativo}
        className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
          emAndamento
            ? "bg-red-700 hover:bg-red-800"
            : "bg-amber-700 hover:bg-amber-800"
        }`}
      >
        {emAndamento ? <XCircle className="size-4" /> : <DatabaseBackup className="size-4" />}
        {emAndamento
          ? cancelando
            ? "Cancelando..."
            : "Cancelar coleta"
          : "Iniciar coleta progressiva"}
      </button>

      {(job || erro) && (
        <div className="mt-3 rounded-md border border-amber-200 bg-white/70 p-3">
          <div className="h-2 overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full rounded-full bg-amber-700 transition-all"
              style={{ width: `${percentual}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-semibold">
            <span>{job?.status ?? "ERRO"}</span>
            <span>{percentual}%</span>
          </div>
          <p className="mt-1 text-xs">
            {erro ??
              job?.erro ??
              job?.progresso.etapa ??
              "Aguardando progresso."}
          </p>
          {job?.status === "ERRO" && (
            <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
              A coleta foi interrompida por erro. Revise a mensagem acima e tente
              novamente a partir do último NSR exibido.
            </p>
          )}
          {job?.status === "CANCELADO" && (
            <p className="mt-2 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              Coleta cancelada. Registros já recebidos permaneceram salvos.
            </p>
          )}
          {job && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
              <span>Lotes: {job.progresso.lotesExecutados}/{job.progresso.limiteLotes}</span>
              <span>Recebidas: {job.progresso.recebidas}</span>
              <span>Novas: {job.progresso.criadas}</span>
              <span>Filtradas: {job.progresso.ignoradasPorFiltro}</span>
              <span>Processadas: {job.progresso.processadas}</span>
              <span>Proximo NSR: {job.progresso.proximoNsr ?? "-"}</span>
            </div>
          )}
          {job?.resultado?.limiteAtingido && (
            <p className="mt-2 text-xs font-semibold text-amber-800">
              Limite atingido. Execute novamente usando o proximo NSR para continuar.
            </p>
          )}
        </div>
      )}
    </form>
  );
}

function OnlineRelogios({
  relogios,
  coletasPorEquipamento,
  listenerOnlineAtivo,
}: {
  relogios: EquipamentoOperacional[];
  coletasPorEquipamento: Map<string, ColetaAtivaItem>;
  listenerOnlineAtivo: boolean;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {relogios.map((relogio) => (
        <OnlineRelogioCard
          key={relogio.id}
          equipamento={relogio}
          coletaAtiva={coletasPorEquipamento.get(relogio.id)}
          listenerOnlineAtivo={listenerOnlineAtivo}
        />
      ))}
    </div>
  );
}

function OnlineRelogioCard({
  equipamento,
  coletaAtiva,
  listenerOnlineAtivo,
}: {
  equipamento: EquipamentoOperacional;
  coletaAtiva?: ColetaAtivaItem;
  listenerOnlineAtivo: boolean;
}) {
  const [estadoSaude, actionSaude, pendenteSaude] = useActionState(
    consultarSaudeRelogioPontoAction,
    estadoInicial,
  );
  const [estadoOnline, actionOnline, pendenteOnline] = useActionState(
    configurarEventosOnlineRelogioPontoAction,
    estadoInicial,
  );
  const configuracao = getConfiguracao(equipamento.configuracao);

  return (
    <article className="rounded-lg border p-4">
      <CabecalhoEquipamento
        equipamento={equipamento}
        coletaAtiva={coletaAtiva}
        listenerOnlineAtivo={listenerOnlineAtivo}
      />

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <form action={actionSaude} className="rounded-md border bg-[var(--muted)] p-3">
          <input type="hidden" name="equipamentoId" value={equipamento.id} />
          <BotaoOperacao
            disabled={pendenteSaude || !equipamento.ativo}
            icon={Activity}
            label={pendenteSaude ? "Testando..." : "Testar comunicacao"}
          />
          <MensagemAction estado={estadoSaude} />
        </form>

        <form action={actionOnline} className="rounded-md border bg-[var(--muted)] p-3">
          <input type="hidden" name="equipamentoId" value={equipamento.id} />
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              name="habilitado"
              defaultChecked={Boolean(configuracao.eventosOnline?.habilitado)}
            />
            Evento online em tempo real
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              name="ipServidor"
              placeholder="IP do SECP"
              defaultValue={String(configuracao.eventosOnline?.ipServidor ?? "")}
              className="h-9 rounded-md border bg-[var(--card)] px-2 text-sm"
            />
            <input
              name="portaServidor"
              placeholder="Porta"
              type="number"
              defaultValue={String(configuracao.eventosOnline?.portaServidor ?? "")}
              className="h-9 rounded-md border bg-[var(--card)] px-2 text-sm"
            />
          </div>
          <BotaoOperacao
            disabled={pendenteOnline || !equipamento.ativo}
            icon={RadioTower}
            label={pendenteOnline ? "Configurando..." : "Salvar online"}
          />
          <MensagemAction estado={estadoOnline} />
        </form>
      </div>
    </article>
  );
}

function BiometriaRelogios({
  relogios,
  coletasPorEquipamento,
  listenerOnlineAtivo,
}: {
  relogios: EquipamentoOperacional[];
  coletasPorEquipamento: Map<string, ColetaAtivaItem>;
  listenerOnlineAtivo: boolean;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {relogios.map((relogio) => (
        <BiometriaRelogioCard
          key={relogio.id}
          equipamento={relogio}
          coletaAtiva={coletasPorEquipamento.get(relogio.id)}
          listenerOnlineAtivo={listenerOnlineAtivo}
        />
      ))}
    </div>
  );
}

function BiometriaRelogioCard({
  equipamento,
  coletaAtiva,
  listenerOnlineAtivo,
}: {
  equipamento: EquipamentoOperacional;
  coletaAtiva?: ColetaAtivaItem;
  listenerOnlineAtivo: boolean;
}) {
  const [estadoBiometria, actionBiometria, pendenteBiometria] = useActionState(
    enviarBiometriaRelogioPontoAction,
    estadoInicial,
  );
  const [estadoLeitura, actionLeitura, pendenteLeitura] = useActionState(
    listarCadastrosBiometricosEquipamentoAction,
    estadoInicial,
  );
  const [estadoSincronizacao, actionSincronizacao, pendenteSincronizacao] =
    useActionState(sincronizarBiometriasEquipamentosOrgaoAction, estadoInicial);

  return (
    <article className="rounded-lg border p-4">
      <CabecalhoEquipamento
        equipamento={equipamento}
        coletaAtiva={coletaAtiva}
        listenerOnlineAtivo={listenerOnlineAtivo}
      />

      <div className="mt-4 grid gap-3">
        <form action={actionLeitura} className="rounded-md border bg-[var(--muted)] p-3">
          <input type="hidden" name="equipamentoId" value={equipamento.id} />
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              name="indiceInicialCadastros"
              placeholder="Indice inicial"
              defaultValue="0"
              className="h-9 rounded-md border bg-[var(--card)] px-2 text-sm"
            />
            <input
              name="quantidadeCadastros"
              placeholder="Quantidade"
              type="number"
              defaultValue="25"
              className="h-9 rounded-md border bg-[var(--card)] px-2 text-sm"
            />
            <label className="flex items-center gap-2 rounded-md border bg-[var(--card)] px-2 text-xs font-semibold">
              <input type="checkbox" name="incluirTemplates" />
              Ler templates
            </label>
          </div>
          <BotaoOperacao
            disabled={pendenteLeitura || !equipamento.ativo}
            icon={UsersRound}
            label={pendenteLeitura ? "Lendo..." : "Ler cadastros"}
          />
          <MensagemAction estado={estadoLeitura} />
          {estadoLeitura.cadastros && estadoLeitura.cadastros.length > 0 && (
            <TabelaCadastrosBiometricos cadastros={estadoLeitura.cadastros} />
          )}
        </form>

        <form
          action={actionSincronizacao}
          className="rounded-md border bg-[var(--muted)] p-3"
        >
          <input type="hidden" name="equipamentoId" value={equipamento.id} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="indiceInicialSincronizacao"
              placeholder="Indice inicial"
              defaultValue="0"
              className="h-9 rounded-md border bg-[var(--card)] px-2 text-sm"
            />
            <input
              name="quantidadeSincronizacao"
              placeholder="Quantidade"
              type="number"
              defaultValue="100"
              className="h-9 rounded-md border bg-[var(--card)] px-2 text-sm"
            />
          </div>
          <label className="mt-2 flex items-start gap-2 rounded-md border bg-[var(--card)] p-2 text-xs">
            <input
              className="mt-0.5"
              type="checkbox"
              name="confirmarSincronizacaoBiometria"
            />
            <span>
              Confirmo que este equipamento sera a origem e que a sincronizacao
              deve atingir apenas equipamentos Henry vinculados ao mesmo orgao.
            </span>
          </label>
          <BotaoOperacao
            disabled={pendenteSincronizacao || !equipamento.ativo}
            icon={DatabaseBackup}
            label={
              pendenteSincronizacao
                ? "Sincronizando..."
                : "Sincronizar biometrias no orgao"
            }
          />
          <MensagemAction estado={estadoSincronizacao} />
          {estadoSincronizacao.sincronizacao && (
            <ResumoSincronizacaoBiometria
              sincronizacao={estadoSincronizacao.sincronizacao}
            />
          )}
        </form>
      </div>

      <form action={actionBiometria} className="mt-3 rounded-md border bg-[var(--muted)] p-3">
        <input type="hidden" name="equipamentoId" value={equipamento.id} />
        <div className="grid grid-cols-[1fr_72px] gap-2">
          <input
            name="matricula"
            placeholder="Matrícula"
            className="h-9 rounded-md border bg-[var(--card)] px-2 text-sm"
          />
          <input
            name="dedo"
            placeholder="Dedo"
            defaultValue="1"
            className="h-9 rounded-md border bg-[var(--card)] px-2 text-sm"
          />
        </div>
        <select
          name="formato"
          defaultValue="SUPREMA"
          className="mt-2 h-9 w-full rounded-md border bg-[var(--card)] px-2 text-sm"
        >
          <option value="SUPREMA">Suprema</option>
          <option value="FS_SWIPE_SINATRA">FS/SWIPE/SINATRA</option>
          <option value="HENRY_RAW">Henry raw</option>
          <option value="DIMEP_RAW">Dimep raw</option>
          <option value="ISO_19794_2">ISO 19794-2</option>
          <option value="ANSI_378">ANSI 378</option>
        </select>
        <textarea
          name="template"
          placeholder="Template biometrico"
          rows={4}
          className="mt-2 w-full rounded-md border bg-[var(--card)] px-2 py-2 font-mono text-xs"
        />
        <BotaoOperacao
          disabled={pendenteBiometria || !equipamento.ativo}
          icon={Fingerprint}
          label={pendenteBiometria ? "Enviando..." : "Enviar biometria"}
        />
        <MensagemAction estado={estadoBiometria} />
      </form>
    </article>
  );
}

function TabelaCadastrosBiometricos({
  cadastros,
}: {
  cadastros: NonNullable<RelogioPontoActionState["cadastros"]>;
}) {
  return (
    <div className="mt-3 overflow-x-auto rounded-md border bg-[var(--card)]">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead className="border-b bg-[var(--muted)] text-[var(--muted-foreground)]">
          <tr>
            <th className="px-3 py-2">Código</th>
            <th className="px-3 py-2">CPF</th>
            <th className="px-3 py-2">Nome</th>
            <th className="px-3 py-2">Matrícula</th>
            <th className="px-3 py-2">Cartoes</th>
            <th className="px-3 py-2">Templates</th>
          </tr>
        </thead>
        <tbody>
          {cadastros.map((cadastro) => (
            <tr key={`${cadastro.matricula}-${cadastro.codigo}`} className="border-b last:border-b-0">
              <td className="px-3 py-2 font-mono">{cadastro.codigo ?? "-"}</td>
              <td className="px-3 py-2 font-mono">{cadastro.cpf ?? "-"}</td>
              <td className="px-3 py-2">{cadastro.nome ?? "-"}</td>
              <td className="px-3 py-2 font-mono">{cadastro.matricula}</td>
              <td className="px-3 py-2 font-mono">
                {cadastro.cartoes?.length ? cadastro.cartoes.join(", ") : "-"}
              </td>
              <td className="px-3 py-2">{cadastro.templates ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResumoSincronizacaoBiometria({
  sincronizacao,
}: {
  sincronizacao: NonNullable<RelogioPontoActionState["sincronizacao"]>;
}) {
  return (
    <div className="mt-3 rounded-md border bg-[var(--card)] p-3 text-xs">
      <div className="grid gap-2 sm:grid-cols-3">
        <span>Lidos: {sincronizacao.lidos}</span>
        <span>Com template: {sincronizacao.comTemplate}</span>
        <span>Ignorados: {sincronizacao.ignoradosSemTemplate}</span>
      </div>
      <div className="mt-3 space-y-2">
        {sincronizacao.destinos.length === 0 ? (
          <p className="text-[var(--muted-foreground)]">
            Nenhum equipamento destino encontrado no mesmo orgao.
          </p>
        ) : (
          sincronizacao.destinos.map((destino) => (
            <div
              key={destino.codigo}
              className="rounded-md border p-2"
            >
              <div className="font-semibold">
                {destino.nome} ({destino.codigo})
              </div>
              <div className="mt-1 text-[var(--muted-foreground)]">
                {destino.mensagem} Enviados: {destino.enviados}. Rejeitados:{" "}
                {destino.rejeitados}.
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CabecalhoEquipamento({
  equipamento,
  coletaAtiva,
  listenerOnlineAtivo,
}: {
  equipamento: EquipamentoOperacional;
  coletaAtiva?: ColetaAtivaItem;
  listenerOnlineAtivo: boolean;
}) {
  const status = statusOperacional(equipamento, listenerOnlineAtivo, coletaAtiva);
  const ultimaComunicacao = getUltimaComunicacao(equipamento);

  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold">{equipamento.nome}</h3>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${status.classe}`}>
            {status.label}
          </span>
          {!equipamento.ativo && (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              Inativo
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          {equipamento.codigo} - {equipamento.ip ?? "sem IP"}:
          {equipamento.porta ?? 3000} - {equipamento.modelo ?? "Relogio"}
        </p>
      </div>

      <div className="text-xs text-[var(--muted-foreground)] md:text-right">
        <div>Última comunicação: {formatarData(ultimaComunicacao)}</div>
        <div>{origemUltimaComunicacao(equipamento)}</div>
        <div>Proximo NSR: {proximoNsr(equipamento.configuracao)}</div>
      </div>
    </div>
  );
}

function CampoTexto({
  label,
  mono,
  ...props
}: {
  label: string;
  mono?: boolean;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="space-y-1 text-xs font-semibold">
      {label}
      <input
        {...props}
        className={`h-9 w-full rounded-md border bg-[var(--card)] px-2 text-sm ${
          mono ? "font-mono" : ""
        }`}
      />
    </label>
  );
}

function BotaoOperacao({
  icon: Icon,
  label,
  className = "bg-blue-900 hover:bg-blue-950",
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 ${className}`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function MensagemAction({ estado }: { estado: RelogioPontoActionState }) {
  if (!estado.mensagem) return null;

  return (
    <p className={`mt-2 text-xs ${estado.sucesso ? "text-green-700" : "text-red-700"}`}>
      {estado.mensagem}
    </p>
  );
}
