"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Download,
  History,
  Network,
  Plus,
  Radar,
  RefreshCw,
  Search,
  ServerCog,
  ShieldCheck,
  Square,
  Wifi,
  X,
} from "lucide-react";
import { Button, Modal, SearchableSelect } from "@/components/ui";
import { Input, Select } from "@/components/ui/form-controls";
import {
  DISCOVERY_PROTOCOLS,
  TERMINAL_DISCOVERY_STATES,
  type DiscoveryAgent,
  type DiscoveryDetail,
  type DiscoverySnapshot,
} from "../domain/contracts";

type Org = { id: string; sigla: string; nome: string };
type Tab = "results" | "history" | "agents" | "networks";
type Mode =
  | "job"
  | "network"
  | "agent"
  | "agent-edit"
  | "register"
  | "test"
  | null;
type BulkResult = {
  observationId: string;
  ok: boolean;
  id?: string;
  duplicate?: boolean;
  error?: string;
};
type TestResult = { status: string; mensagem: string; checkedAt: string };
const statusLabel: Record<string, string> = {
  ENROLLING: "Aguardando inscrição",
  PENDING: "Aguardando aprovação",
  APPROVED: "Aprovado",
  ONLINE: "Online",
  OFFLINE: "Offline",
  DEGRADED: "Degradado",
  DISCOVERING: "Descobrindo",
  COMMUNICATION_ERROR: "Erro de comunicação",
  UPDATE_REQUIRED: "Atualização necessária",
  REVOKED: "Revogado",
  QUEUED: "Na fila",
  RUNNING: "Em andamento",
  CANCELLING: "Cancelando",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
  PARTIAL: "Parcial",
  FAILED: "Falhou",
  TIMED_OUT: "Tempo esgotado",
  CONFIRMED: "Confirmado",
  PROBABLE: "Provável",
  UNKNOWN: "Desconhecido",
  NEW: "Não cadastrado",
  REGISTERED: "Já cadastrado",
  CONFLICT: "Conflito — revisar",
};
const types: Record<string, string> = {
  BIOMETRIC_CLOCK: "Relógio biométrico",
  CLOCK: "Relógio de ponto",
  TURNSTILE: "Catraca",
  ACCESS_CONTROLLER: "Controlador de acesso",
  FACIAL_TERMINAL: "Terminal facial",
  DOOR_CONTROLLER: "Controlador de portas",
  UNKNOWN: "Dispositivo desconhecido",
};
const date = (value?: number | null) =>
  value ? new Date(value * 1000).toLocaleString("pt-BR") : "Não disponível";
const empty = (value?: string | null) => value || "Não disponível";
const label = (value: string) => statusLabel[value] ?? value;
const api = "/api/descoberta-equipamentos";

async function responseJson<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error ?? "Não foi possível concluir a operação.");
  return payload as T;
}

function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-medium ${["CONFIRMED", "COMPLETED", "ONLINE", "REGISTERED"].includes(value) ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : ["FAILED", "CONFLICT", "REVOKED", "OFFLINE"].includes(value) ? "border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200" : "border-border bg-muted text-foreground"}`}
    >
      {label(value)}
    </span>
  );
}
function Field({ title, children }: { title: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-medium">
      <span>{title}</span>
      {children}
    </label>
  );
}
function UnitField({
  orgaoId,
  value,
  onChange,
}: {
  orgaoId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <Field title="Unidade">
      <SearchableSelect
        id={id}
        name="unidadeId"
        options={[{ value: "", label: "Toda a seccional" }]}
        value={value}
        onValueChange={onChange}
        disabled={!orgaoId}
        asyncSearchUrl={`${api}?resource=unit-options&orgaoId=${orgaoId}`}
        searchPlaceholder="Pesquisar unidade..."
      />
    </Field>
  );
}

export function DiscoveryConsole({
  orgaos,
  canManage,
  initialOrg,
  initialTab,
}: {
  orgaos: Org[];
  canManage: boolean;
  initialOrg?: string;
  initialTab?: string;
}) {
  const [orgaoId, setOrgaoId] = useState(
    orgaos.find((o) => o.id === initialOrg)?.id ?? orgaos[0]?.id ?? "",
  );
  const [unidadeId, setUnidadeId] = useState("");
  const [tab, setTab] = useState<Tab>(
    ["history", "agents", "networks"].includes(initialTab ?? "")
      ? (initialTab as Tab)
      : "results",
  );
  const [snapshot, setSnapshot] = useState<DiscoverySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [jobKey, setJobKey] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<DiscoveryDetail | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [agentDetail, setAgentDetail] = useState<DiscoveryAgent | null>(null);
  const [secret, setSecret] = useState("");
  const [report, setReport] = useState<BulkResult[]>([]);
  const [test, setTest] = useState<TestResult | null>(null);
  const [query, setQuery] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [confidence, setConfidence] = useState("");
  const [registration, setRegistration] = useState("");
  const [agentId, setAgentId] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [jobId, setJobId] = useState("");
  const [offset, setOffset] = useState(0);
  const [jobsOffset, setJobsOffset] = useState(0);
  const [editingAgent, setEditingAgent] = useState<DiscoveryAgent | null>(null);
  const [sort, setSort] = useState("ip");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [formTarget, setFormTarget] = useState("auto");
  const [formNetwork, setFormNetwork] = useState("");
  const [formDriver, setFormDriver] = useState<string>("GENERIC");
  const [formUnit, setFormUnit] = useState("");

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!orgaoId) return;
      try {
        const params = new URLSearchParams({
          orgaoId,
          offset: String(offset),
          jobsOffset: String(jobsOffset),
        });
        if (jobId) params.set("jobId", jobId);
        const next = await responseJson<DiscoverySnapshot>(
          await fetch(`${api}?${params}`, { signal, cache: "no-store" }),
        );
        if (!signal?.aborted) {
          setSnapshot(next);
          setError("");
          setLoading(false);
          setLastUpdated(new Date());
        }
      } catch (cause) {
        if (!signal?.aborted) {
          setError(
            cause instanceof Error ? cause.message : "Serviço indisponível",
          );
          setLoading(false);
        }
      }
    },
    [orgaoId, offset, jobId, jobsOffset],
  );
  useEffect(() => {
    const controller = new AbortController();
    const initial = setTimeout(() => void refresh(controller.signal), 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        void refresh(controller.signal);
    }, 5000);
    return () => {
      controller.abort();
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [refresh]);

  const jobsById = useMemo(
    () => new Map(snapshot?.jobs.map((j) => [j.id, j]) ?? []),
    [snapshot],
  );
  const filtered = useMemo(() => {
    const normalize = (text: string) =>
      text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const search = normalize(query);
    return (snapshot?.devices ?? [])
      .filter((row) => {
        const data = row.payload;
        const job = row.job ?? jobsById.get(row.job_id);
        return (
          (!manufacturer || data.manufacturer === manufacturer) &&
          (!deviceType || data.device_type === deviceType) &&
          (!confidence || data.confidence === confidence) &&
          (!registration || row.registration?.state === registration) &&
          (!agentId || job?.agent_id === agentId) &&
          (!networkId || job?.network_id === networkId) &&
          (!unidadeId || job?.unidade_id === unidadeId) &&
          normalize(
            [
              data.ip,
              data.mac,
              data.manufacturer,
              data.model,
              data.serial,
              data.hostname,
            ].join(" "),
          ).includes(search)
        );
      })
      .sort((a, b) =>
        sort === "ip"
          ? a.ip.localeCompare(b.ip, undefined, { numeric: true })
          : sort === "manufacturer"
            ? (a.payload.manufacturer ?? "").localeCompare(
                b.payload.manufacturer ?? "",
              )
            : a.payload.confidence.localeCompare(b.payload.confidence),
      );
  }, [
    snapshot,
    query,
    manufacturer,
    deviceType,
    confidence,
    registration,
    agentId,
    networkId,
    unidadeId,
    sort,
    jobsById,
  ]);
  const formRows = selected.length
    ? (snapshot?.devices.filter((d) => selected.includes(d.id)) ?? [])
    : detail
      ? [detail]
      : [];
  const activeJobs =
    snapshot?.jobs.filter((j) => !TERMINAL_DISCOVERY_STATES.has(j.state)) ?? [];
  const networks = snapshot?.networks.filter((n) => n.enabled) ?? [];

  async function mutation<T = unknown>(data: unknown): Promise<T> {
    return responseJson<T>(
      await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    );
  }
  async function act(action: string, id: string) {
    setBusy(true);
    setMessage("");
    try {
      const data = await mutation<{ bootstrap_token?: string }>({ action, id });
      if (data.bootstrap_token) setSecret(data.bootstrap_token);
      setMessage("Operação concluída.");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Operação não concluída",
      );
    } finally {
      setBusy(false);
    }
  }
  async function showDetail(id: string) {
    setDetailBusy(true);
    setError("");
    try {
      setDetail(
        await responseJson<DiscoveryDetail>(
          await fetch(`${api}?resource=detail&id=${id}`, { cache: "no-store" }),
        ),
      );
      setSelected([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Detalhe indisponível");
    } finally {
      setDetailBusy(false);
    }
  }
  function openForm(next: Mode) {
    setMode(next);
    setReport([]);
    setTest(null);
    setFormUnit(unidadeId);
    setFormNetwork(networkId);
    setFormTarget("auto");
    setJobKey(crypto.randomUUID());
    setFormDriver(detail?.payload.driver ?? "GENERIC");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "");
    setBusy(true);
    setMessage("");
    setError("");
    try {
      if (mode === "job") {
        const response = await mutation<{
          jobs: Array<{ id: string }>;
          warnings: string[];
        }>({
          action: "job-create",
          orgaoId,
          unidadeId: formUnit || undefined,
          agentId: value("agent") || undefined,
          networkId:
            formTarget === "auto" ? undefined : formNetwork || undefined,
          target: ["cidr", "ip"].includes(formTarget)
            ? value("target")
            : undefined,
          idempotencyKey: jobKey,
        });
        setJobId(response.jobs[0]?.id ?? "");
        setOffset(0);
        setMessage(
          response.warnings.length
            ? response.warnings.join("; ")
            : "Descoberta enviada ao agente.",
        );
        setTab("results");
        setMode(null);
      } else if (mode === "network") {
        await mutation({
          action: "network-create",
          orgaoId,
          unidadeId: formUnit || undefined,
          name: value("name"),
          cidr: value("cidr"),
          methods: data.getAll("methods").map(String),
          ports: data.getAll("ports").map(Number),
          concurrency: Number(value("concurrency")),
          rate: Number(value("rate")),
          timeout: Number(value("timeout")),
          maxHosts: Number(value("maxHosts")),
          windowStart: value("windowStart")
            ? Number(value("windowStart"))
            : null,
          windowEnd: value("windowEnd") ? Number(value("windowEnd")) : null,
        });
        setMode(null);
        setMessage("Rede autorizada.");
      } else if (mode === "agent" || mode === "agent-edit") {
        if (mode === "agent-edit" && editingAgent) {
          await mutation({
            action: "agent-configure",
            id: editingAgent.id,
            orgaoId,
            unidadeId: formUnit || undefined,
            name: value("name"),
            networkIds: data.getAll("networks").map(String),
          });
          setMode(null);
          setMessage(
            "Redes do agente atualizadas. Atualize também a configuração local do agente.",
          );
          await refresh();
          return;
        }
        const response = await mutation<{ bootstrap_token: string }>({
          action: "agent-enroll",
          orgaoId,
          unidadeId: formUnit || undefined,
          name: value("name"),
          networkIds: data.getAll("networks").map(String),
        });
        setSecret(response.bootstrap_token);
        setMode(null);
        setMessage(
          "Inscrição criada. Instale o agente e aprove após o primeiro contato.",
        );
      } else {
        const settings = {
          protocolo: formDriver,
          porta: Number(value("port")),
          usuario: value("username") || undefined,
          senha: value("password") || undefined,
        };
        if (mode === "test" && detail)
          setTest(
            await mutation<TestResult>({
              action: "test",
              id: detail.id,
              ...settings,
            }),
          );
        if (mode === "register") {
          const response = await mutation<{ items: BulkResult[] }>({
            action: "register",
            ids: formRows.map((d) => d.id),
            ...settings,
            nome: value("name"),
            unidadeId: formUnit || undefined,
            localizacao: value("location"),
            aceitarIdentificacaoProvavel: data.get("accept") === "on",
          });
          setReport(response.items);
          setSelected([]);
        }
      }
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Operação não concluída.",
      );
    } finally {
      setBusy(false);
    }
  }

  function downloadAgent(agent: DiscoveryAgent) {
    const content = {
      central_url: "https://PREENCHA-ENDERECO-DO-SERVICO-CENTRAL",
      state_dir: "/data/agent",
      networks: networks
        .filter((n) => agent.network_ids.includes(n.id))
        .map((n) => n.cidr),
      methods: ["tcp", "arp"],
      ports: [80, 443, 3000, 3001, 8080, 8443],
      rate: 10,
      concurrency: 8,
      max_hosts: 256,
      timeout: 1,
      device_verify_tls: true,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(content, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "agent.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!orgaos.length)
    return (
      <div role="status" className="rounded-lg border p-6 text-sm">
        Nenhuma seccional ativa disponível para este perfil.
      </div>
    );
  return (
    <section className="space-y-4" aria-label="Console de descoberta">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1" aria-label="Áreas de descoberta">
          {(
            [
              ["results", "Resultados", Radar],
              ["history", "Histórico", History],
              ["agents", "Gerenciar agentes", ServerCog],
              ["networks", "Redes autorizadas", Network],
            ] as const
          ).map(([key, title, Icon]) => (
            <Button
              key={key}
              size="sm"
              variant={tab === key ? "primary" : "ghost"}
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
              leftIcon={<Icon className="size-4" />}
            >
              {title}
            </Button>
          ))}
        </nav>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void refresh()}
            disabled={busy}
            leftIcon={<RefreshCw className="size-4" />}
          >
            Atualizar
          </Button>
          {canManage && (
            <Button
              size="sm"
              disabled={busy || !networks.length}
              onClick={() => openForm("job")}
              leftIcon={<Plus className="size-4" />}
            >
              Nova descoberta
            </Button>
          )}
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>
            {error}
            {snapshot &&
              " Os resultados exibidos correspondem à última atualização concluída."}
          </span>
        </div>
      )}
      {message && (
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          {message}
        </p>
      )}
      <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field title="Seccional">
          <Select
            value={orgaoId}
            onChange={(event) => {
              setOrgaoId(event.target.value);
              setJobsOffset(0);
              setUnidadeId("");
              setSelected([]);
              setSnapshot(null);
              setAgentId("");
              setNetworkId("");
              setJobId("");
              setOffset(0);
            }}
            aria-label="Seccional"
          >
            {orgaos.map((org) => (
              <option key={org.id} value={org.id}>
                {org.sigla} — {org.nome}
              </option>
            ))}
          </Select>
        </Field>
        <UnitField
          orgaoId={orgaoId}
          value={unidadeId}
          onChange={setUnidadeId}
        />
        <Field title="Agente">
          <Select
            aria-label="Agente"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          >
            <option value="">Todos</option>
            {snapshot?.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {label(a.state)}
              </option>
            ))}
          </Select>
        </Field>
        <Field title="Rede">
          <Select
            aria-label="Rede"
            value={networkId}
            onChange={(e) => setNetworkId(e.target.value)}
          >
            <option value="">Todas</option>
            {snapshot?.networks.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} · {n.cidr}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {[
          ["Dispositivos encontrados", snapshot?.devicesTotal, Radar],
          [
            "Identificados nesta página",
            snapshot?.devices.filter(
              (d) => d.payload.confidence === "CONFIRMED",
            ).length,
            ShieldCheck,
          ],
          [
            "Já cadastrados nesta página",
            snapshot?.devices.filter(
              (d) => d.registration?.state === "REGISTERED",
            ).length,
            Check,
          ],
          [
            "Pendentes nesta página",
            snapshot?.devices.filter(
              (d) => d.payload.confidence !== "CONFIRMED",
            ).length,
            Search,
          ],
          [
            "Agentes online",
            snapshot?.agents.filter((a) =>
              ["ONLINE", "DISCOVERING"].includes(a.state),
            ).length,
            Wifi,
          ],
        ].map(([title, count, Icon]) => {
          const MetricIcon = Icon as typeof Radar;
          return (
            <div
              key={String(title)}
              className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3"
            >
              <MetricIcon className="size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-[11px] text-muted-foreground">
                  {String(title)}
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {count === undefined ? "—" : String(count)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {activeJobs.length > 0 && (
        <div
          className="space-y-3 rounded-lg border bg-card p-3"
          aria-live="polite"
        >
          {activeJobs.map((job) => (
            <div key={job.id} className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2">
                  <Badge value={job.state} />
                  <b>{job.target}</b>
                  <span className="text-muted-foreground">
                    {snapshot?.agents.find((a) => a.id === job.agent_id)
                      ?.name ?? "Agente"}
                  </span>
                </span>
                <span>
                  {job.processed}/{job.total} hosts · {job.found} encontrados ·{" "}
                  {job.errors} erros{" "}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy || job.state === "CANCELLING"}
                      onClick={() => void act("job-cancel", job.id)}
                      leftIcon={<Square className="size-3" />}
                    >
                      Cancelar
                    </Button>
                  )}
                </span>
              </div>
              <progress
                aria-label={`Progresso ${job.target}`}
                value={job.processed}
                max={job.total || undefined}
                className="h-1.5 w-full accent-blue-800"
              />
              <p className="text-[11px] text-muted-foreground">
                {job.state === "QUEUED"
                  ? "Aguardando o agente autorizado"
                  : `Verificação dos hosts · início ${date(job.started)}`}
              </p>
            </div>
          ))}
        </div>
      )}
      {loading && (
        <p
          role="status"
          className="py-6 text-center text-sm text-muted-foreground"
        >
          Carregando descoberta...
        </p>
      )}

      {tab === "results" && (
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
            <Field title="Pesquisar">
              <Input
                placeholder="IP, modelo, série..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </Field>
            <Field title="Fabricante">
              <Select
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
              >
                <option value="">Todos</option>
                {Array.from(
                  new Set(
                    snapshot?.devices
                      .map((d) => d.payload.manufacturer)
                      .filter(Boolean),
                  ),
                ).map((m) => (
                  <option key={m} value={m!}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field title="Tipo">
              <Select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
              >
                <option value="">Todos</option>
                {Object.entries(types).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field title="Identificação">
              <Select
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
              >
                <option value="">Todas</option>
                {["CONFIRMED", "PROBABLE", "UNKNOWN"].map((v) => (
                  <option key={v} value={v}>
                    {label(v)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field title="Cadastro">
              <Select
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
              >
                <option value="">Todos</option>
                {["NEW", "REGISTERED", "CONFLICT"].map((v) => (
                  <option key={v} value={v}>
                    {label(v)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field title="Ordenar">
              <Select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="ip">Endereço IP</option>
                <option value="manufacturer">Fabricante</option>
                <option value="confidence">Identificação</option>
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Field title="Descoberta">
              <Select
                aria-label="Filtrar descoberta"
                value={jobId}
                onChange={(e) => {
                  setJobId(e.target.value);
                  setOffset(0);
                  setSelected([]);
                }}
              >
                <option value="">Todas as descobertas</option>
                {snapshot?.jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.target} · {date(j.created)} · {label(j.state)}
                  </option>
                ))}
              </Select>
            </Field>
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                disabled={!selected.length || busy}
                onClick={() => openForm("register")}
              >
                Cadastrar selecionados ({selected.length}/20)
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b text-[11px] text-muted-foreground">
                <tr>
                  {[
                    "Seleção",
                    "Equipamento",
                    "IP / MAC",
                    "Fabricante / modelo",
                    "Tipo",
                    "Unidade / seccional",
                    "Agente",
                    "Identificação",
                    "Cadastro",
                    "Ações",
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap p-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const job = row.job ?? jobsById.get(row.job_id);
                  return (
                    <tr
                      key={row.id}
                      className="border-b last:border-0 hover:bg-muted/40"
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          aria-label={`Selecionar ${row.ip}`}
                          checked={selected.includes(row.id)}
                          disabled={
                            !canManage ||
                            row.registration?.state !== "NEW" ||
                            (!selected.includes(row.id) &&
                              selected.length >= 20)
                          }
                          onChange={(e) =>
                            setSelected((current) =>
                              e.target.checked
                                ? [...current, row.id]
                                : current.filter((id) => id !== row.id),
                            )
                          }
                        />
                      </td>
                      <td className="p-2">
                        <button
                          className="text-left font-medium text-blue-800 hover:underline dark:text-blue-300"
                          onClick={() => void showDetail(row.id)}
                        >
                          {row.payload.hostname || row.payload.model || row.ip}
                        </button>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {date(row.created)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap p-2 font-mono">
                        {row.ip}
                        <p className="text-[10px] text-muted-foreground">
                          {empty(row.payload.mac)}
                        </p>
                      </td>
                      <td className="p-2">
                        {empty(row.payload.manufacturer)}
                        <p className="text-muted-foreground">
                          {empty(row.payload.model)}
                        </p>
                      </td>
                      <td className="p-2">{types[row.payload.device_type]}</td>
                      <td className="p-2">
                        {orgaos.find((o) => o.id === row.orgao_id)?.sigla}
                        <p className="text-muted-foreground">
                          {snapshot?.units.find((u) => u.id === job?.unidade_id)
                            ?.nome ?? "Toda a seccional"}
                        </p>
                      </td>
                      <td className="p-2">
                        {snapshot?.agents.find((a) => a.id === job?.agent_id)
                          ?.name ?? "Não disponível"}
                      </td>
                      <td className="p-2">
                        <Badge value={row.payload.confidence} />
                      </td>
                      <td className="p-2">
                        <Badge value={row.registration?.state ?? "NEW"} />
                      </td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={detailBusy}
                          onClick={() => void showDetail(row.id)}
                        >
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && !filtered.length && (
            <div className="py-10 text-center">
              <Radar className="mx-auto mb-2 size-6 text-muted-foreground" />
              <p className="text-sm font-medium">
                Nenhum dispositivo nesta consulta
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Configure uma rede e um agente, ou ajuste os filtros.
              </p>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filtered.length} exibidos · {snapshot?.devicesTotal ?? 0}{" "}
              observações · filtros aplicados nesta página
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={offset === 0}
                onClick={() => {
                  setOffset(Math.max(0, offset - 50));
                  setSelected([]);
                }}
                leftIcon={<ArrowLeft className="size-3" />}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={offset + 50 >= (snapshot?.devicesTotal ?? 0)}
                onClick={() => {
                  setOffset(offset + 50);
                  setSelected([]);
                }}
                rightIcon={<ArrowRight className="size-3" />}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="overflow-x-auto rounded-lg border bg-card p-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Histórico de descobertas</h2>
            <Link
              href="/auditoria?entidade=DescobertaEquipamentos"
              className="text-xs text-blue-800 hover:underline dark:text-blue-300"
            >
              Auditoria no SECP
            </Link>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                {[
                  "Data",
                  "Rede",
                  "Agente",
                  "Solicitante",
                  "Situação",
                  "Hosts / encontrados",
                  "Duração",
                  "Ação",
                ].map((h) => (
                  <th key={h} className="border-b p-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snapshot?.jobs.map((j) => (
                <tr key={j.id} className="border-b">
                  <td className="p-2">{date(j.created)}</td>
                  <td className="p-2 font-mono">{j.target}</td>
                  <td className="p-2">
                    {snapshot.agents.find((a) => a.id === j.agent_id)?.name}
                  </td>
                  <td className="p-2 font-mono text-[10px]">
                    {j.requested_by}
                  </td>
                  <td className="p-2">
                    <Badge value={j.state} />
                  </td>
                  <td className="p-2">
                    {j.processed}/{j.total} · {j.found} encontrados · {j.errors}{" "}
                    erros
                  </td>
                  <td className="p-2">
                    {j.started && j.finished
                      ? `${Math.round(j.finished - j.started)} s`
                      : "Em andamento"}
                  </td>
                  <td className="p-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setJobId(j.id);
                        setOffset(0);
                        setTab("results");
                      }}
                    >
                      Ver resultados
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!snapshot?.jobs.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma descoberta registrada.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {snapshot?.jobs.length ?? 0} descobertas de{" "}
            {snapshot?.jobsTotal ?? 0} · solicitante identificado pelo ID de
            auditoria.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={jobsOffset === 0}
              onClick={() => setJobsOffset(Math.max(0, jobsOffset - 50))}
            >
              Anteriores
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={jobsOffset + 50 >= (snapshot?.jobsTotal ?? 0)}
              onClick={() => setJobsOffset(jobsOffset + 50)}
            >
              Próximas
            </Button>
          </div>
        </div>
      )}

      {tab === "agents" && (
        <div className="rounded-lg border bg-card p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Agentes distribuídos</h2>
            <div className="flex gap-2">
              <Link
                href="/equipamentos/descoberta/instalacao"
                className="self-center text-xs text-blue-800 hover:underline dark:text-blue-300"
              >
                Instalação e diagnóstico
              </Link>
              {canManage && (
                <Button
                  size="sm"
                  onClick={() => openForm("agent")}
                  disabled={!networks.length}
                >
                  <Plus className="size-4" />
                  Registrar agente
                </Button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  {[
                    "Agente",
                    "Seccional / unidade",
                    "Redes autorizadas",
                    "Versão",
                    "Último heartbeat",
                    "Status",
                    "Ações",
                  ].map((h) => (
                    <th key={h} className="border-b p-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshot?.agents.map((agent) => (
                  <tr key={agent.id} className="border-b">
                    <td className="p-2 font-medium">{agent.name}</td>
                    <td className="p-2">
                      {orgaos.find((o) => o.id === agent.orgao_id)?.sigla}
                      <p className="text-[10px] text-muted-foreground">
                        {snapshot?.units.find((u) => u.id === agent.unidade_id)
                          ?.nome ?? "Toda a seccional"}
                      </p>
                    </td>
                    <td className="p-2">
                      {snapshot.networks
                        .filter((n) => agent.network_ids.includes(n.id))
                        .map((n) => n.cidr)
                        .join(", ")}
                    </td>
                    <td className="p-2">
                      {agent.version || "Ainda não inscrito"}
                    </td>
                    <td className="p-2">{date(agent.heartbeat)}</td>
                    <td className="p-2">
                      <Badge value={agent.state} />
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAgentDetail(agent)}
                        >
                          Detalhes
                        </Button>
                        {canManage && agent.state === "PENDING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void act("agent-approve", agent.id)}
                          >
                            Aprovar
                          </Button>
                        )}
                        {canManage && agent.state !== "REVOKED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => void act("agent-revoke", agent.id)}
                          >
                            Revogar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!snapshot?.agents.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum agente registrado. Autorize uma rede e crie uma inscrição.
            </p>
          )}
        </div>
      )}

      {tab === "networks" && (
        <div className="rounded-lg border bg-card p-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Redes autorizadas</h2>
            {canManage && (
              <Button size="sm" onClick={() => openForm("network")}>
                <Plus className="size-4" />
                Autorizar rede
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  {[
                    "Rede",
                    "CIDR",
                    "Métodos / portas",
                    "Limites",
                    "Janela UTC",
                    "Situação",
                    "Ação",
                  ].map((h) => (
                    <th key={h} className="border-b p-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshot?.networks.map((n) => (
                  <tr key={n.id} className="border-b">
                    <td className="p-2 font-medium">{n.name}</td>
                    <td className="p-2 font-mono">{n.cidr}</td>
                    <td className="p-2">
                      {n.config.methods.join(", ")}
                      <p className="text-muted-foreground">
                        {n.config.ports.join(", ")}
                      </p>
                    </td>
                    <td className="p-2">
                      {n.config.max_hosts} hosts · {n.config.rate}/s ·{" "}
                      {n.config.concurrency} conexões
                    </td>
                    <td className="p-2">
                      {n.config.window_start_utc === null
                        ? "Sem restrição de horário"
                        : `${n.config.window_start_utc}h–${n.config.window_end_utc}h`}
                    </td>
                    <td className="p-2">
                      {n.enabled ? "Autorizada" : "Desabilitada"}
                    </td>
                    <td className="p-2">
                      {canManage && n.enabled && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void act("network-disable", n.id)}
                        >
                          Desabilitar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!snapshot?.networks.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma rede autorizada. Nenhuma varredura pode ser executada até
              essa configuração.
            </p>
          )}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        {lastUpdated
          ? `Atualizado em ${lastUpdated.toLocaleTimeString("pt-BR")} · atualização automática a cada 5 segundos`
          : "Aguardando o serviço de descoberta"}
      </p>

      <Modal
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setMode(null);
            setReport([]);
            setTest(null);
          }
        }}
        title={
          {
            job: "Nova descoberta",
            network: "Autorizar rede",
            agent: "Registrar agente",
            "agent-edit": "Configurar agente",
            register: "Cadastro assistido",
            test: "Testar comunicação",
          }[mode ?? "job"]
        }
        description={
          mode === "register"
            ? "Os equipamentos serão cadastrados inativos para revisão e ativação no cadastro existente."
            : "Operação limitada à seccional e às redes autorizadas."
        }
        className="max-h-[90vh] w-[min(94vw,720px)] overflow-y-auto"
      >
        <form onSubmit={submit} className="space-y-4">
          {(mode === "job" ||
            mode === "network" ||
            mode === "agent" ||
            mode === "agent-edit" ||
            mode === "register") && (
            <UnitField
              orgaoId={orgaoId}
              value={formUnit}
              onChange={setFormUnit}
            />
          )}
          {mode === "job" && (
            <>
              <Field title="Modo">
                <Select
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                >
                  <option value="auto">
                    Descoberta automática nas redes autorizadas
                  </option>
                  <option value="network">Rede específica</option>
                  <option value="cidr">Faixa CIDR autorizada</option>
                  <option value="ip">Endereço IP individual</option>
                </Select>
              </Field>
              {formTarget !== "auto" && (
                <Field title="Rede autorizada">
                  <Select
                    value={formNetwork}
                    required
                    onChange={(e) => setFormNetwork(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {networks.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} · {n.cidr}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {["cidr", "ip"].includes(formTarget) && (
                <Field
                  title={
                    formTarget === "ip"
                      ? "Endereço IPv4"
                      : "CIDR contido na rede selecionada"
                  }
                >
                  <Input
                    name="target"
                    required
                    placeholder={
                      formTarget === "ip" ? "192.168.50.20" : "192.168.50.0/28"
                    }
                  />
                </Field>
              )}
              <Field title="Agente">
                <Select name="agent" defaultValue={agentId}>
                  <option value="">Seleção automática</option>
                  {snapshot?.agents
                    .filter(
                      (a) =>
                        !["REVOKED", "PENDING", "ENROLLING"].includes(a.state),
                    )
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} · {label(a.state)}
                      </option>
                    ))}
                </Select>
              </Field>
              <p className="text-xs text-muted-foreground">
                Agentes offline receberão o job após reconectar, dentro do prazo
                de execução.
              </p>
            </>
          )}
          {mode === "network" && (
            <>
              <Field title="Nome da rede">
                <Input
                  name="name"
                  required
                  maxLength={100}
                  placeholder="Rede de equipamentos da recepção"
                />
              </Field>
              <Field title="Rede CIDR autorizada">
                <Input name="cidr" required placeholder="192.168.50.0/24" />
              </Field>
              <fieldset className="rounded-md border p-3">
                <legend className="px-1 text-xs font-medium">
                  Métodos permitidos
                </legend>
                <div className="flex flex-wrap gap-3">
                  {[
                    "tcp",
                    "arp",
                    "icmp",
                    "mdns",
                    "ssdp",
                    "ws-discovery",
                    "snmp",
                  ].map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <input
                        type="checkbox"
                        name="methods"
                        value={m}
                        defaultChecked={["tcp", "arp"].includes(m)}
                      />
                      {m}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  SNMP somente leitura exige comunidade configurada no agente.
                  Multicast depende da interface e da rede física.
                </p>
              </fieldset>
              <fieldset className="rounded-md border p-3">
                <legend className="px-1 text-xs font-medium">
                  Portas autorizadas
                </legend>
                <div className="flex flex-wrap gap-3">
                  {[80, 443, 3000, 3001, 4370, 8080, 8443, 1870].map((p) => (
                    <label
                      key={p}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <input
                        type="checkbox"
                        name="ports"
                        value={p}
                        defaultChecked={[
                          80, 443, 3000, 3001, 8080, 8443,
                        ].includes(p)}
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field title="Hosts por job">
                  <Input
                    name="maxHosts"
                    type="number"
                    min={1}
                    max={1024}
                    defaultValue={256}
                    required
                  />
                </Field>
                <Field title="Conexões">
                  <Input
                    name="concurrency"
                    type="number"
                    min={1}
                    max={24}
                    defaultValue={8}
                    required
                  />
                </Field>
                <Field title="Conexões/s">
                  <Input
                    name="rate"
                    type="number"
                    min={1}
                    max={20}
                    defaultValue={10}
                    required
                  />
                </Field>
                <Field title="Timeout (s)">
                  <Input
                    name="timeout"
                    type="number"
                    min={0.2}
                    max={5}
                    step={0.1}
                    defaultValue={1}
                    required
                  />
                </Field>
                <Field title="Início UTC (opcional)">
                  <Input name="windowStart" type="number" min={0} max={23} />
                </Field>
                <Field title="Fim UTC (opcional)">
                  <Input name="windowEnd" type="number" min={0} max={23} />
                </Field>
              </div>
              <label className="flex items-start gap-2 text-xs">
                <input className="mt-0.5" type="checkbox" required />
                Confirmo que esta rede está autorizada para descoberta
                administrativa.
              </label>
            </>
          )}
          {(mode === "agent" || mode === "agent-edit") && (
            <>
              <Field title="Nome do agente">
                <Input
                  name="name"
                  required
                  maxLength={100}
                  placeholder="Agente da seccional"
                  defaultValue={mode === "agent-edit" ? editingAgent?.name : ""}
                />
              </Field>
              <fieldset className="max-h-52 space-y-2 overflow-y-auto rounded border p-3">
                <legend className="px-1 text-xs font-medium">
                  Redes autorizadas para este agente
                </legend>
                {networks.map((n) => (
                  <label key={n.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      name="networks"
                      value={n.id}
                      defaultChecked={
                        mode === "agent-edit" &&
                        editingAgent?.network_ids.includes(n.id)
                      }
                    />
                    {n.name} · {n.cidr}
                  </label>
                ))}
              </fieldset>
              <p className="text-xs text-muted-foreground">
                A credencial inicial será exibida uma única vez, com validade de
                15 minutos. A aprovação acontece após a inscrição do agente.
              </p>
            </>
          )}
          {(mode === "register" || mode === "test") && (
            <>
              {mode === "register" && (
                <>
                  <p className="text-xs">
                    {formRows.length} equipamento(s) selecionado(s). Em lote, os
                    campos de configuração abaixo serão compartilhados.
                  </p>
                  <Field
                    title={
                      formRows.length > 1
                        ? "Prefixo do nome"
                        : "Nome do equipamento"
                    }
                  >
                    <Input
                      name="name"
                      required
                      maxLength={160}
                      defaultValue={
                        detail?.payload.model ||
                        detail?.payload.manufacturer ||
                        "Equipamento descoberto"
                      }
                    />
                  </Field>
                  <Field title="Localização de instalação">
                    <Input
                      name="location"
                      maxLength={200}
                      placeholder="Recepção principal — térreo"
                    />
                  </Field>
                </>
              )}
              <Field title="Driver existente no SECP">
                <Select
                  value={formDriver}
                  onChange={(e) => setFormDriver(e.target.value)}
                >
                  {DISCOVERY_PROTOCOLS.map((p) => (
                    <option key={p} value={p}>
                      {p === "GENERIC"
                        ? "Genérico — cadastro sem coleta confirmada"
                        : p.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field title="Porta comprovada pela descoberta">
                <Select
                  name="port"
                  required
                  defaultValue={String(
                    (detail?.payload.open_ports ??
                      formRows[0]?.payload.open_ports)?.[0] ?? "",
                  )}
                >
                  <option value="">Selecione</option>
                  {(
                    detail?.payload.open_ports ??
                    formRows[0]?.payload.open_ports ??
                    []
                  ).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field title="Usuário">
                  <Input
                    name="username"
                    autoComplete="off"
                    required={mode === "test"}
                  />
                </Field>
                <Field title="Senha fornecida para este equipamento">
                  <Input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required={mode === "test"}
                  />
                </Field>
              </div>
              {mode === "register" &&
                formRows.some((d) => d.payload.confidence !== "CONFIRMED") && (
                  <label className="flex items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      name="accept"
                      required
                      className="mt-0.5"
                    />
                    Revisei os dados e autorizo o cadastro sem identificação
                    confirmada.
                  </label>
                )}
              {test && (
                <div role="status" className="rounded border p-3 text-sm">
                  <Badge value={test.status} />
                  <p className="mt-2">{test.mensagem}</p>
                </div>
              )}
              {report.length > 0 && (
                <div role="status" className="space-y-2 rounded border p-3">
                  {report.map((r) => (
                    <p key={r.observationId} className="text-xs">
                      {r.ok ? "✓ Cadastro confirmado" : "Falha"} ·{" "}
                      {r.id ? (
                        <Link
                          href={`/equipamentos/${r.id}/editar`}
                          className="text-blue-800 underline dark:text-blue-300"
                        >
                          Revisar equipamento
                        </Link>
                      ) : (
                        r.error
                      )}
                      {r.duplicate && " · já existente"}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
          {error && (
            <p
              role="alert"
              className="text-sm text-amber-800 dark:text-amber-200"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setMode(null)}
            >
              Fechar
            </Button>
            {!report.length && (
              <Button type="submit" loading={busy}>
                {mode === "test"
                  ? "Testar comunicação"
                  : mode === "register"
                    ? "Cadastrar inativos para revisão"
                    : mode === "job"
                      ? "Iniciar descoberta"
                      : "Salvar"}
              </Button>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(secret)}
        onOpenChange={(open) => {
          if (!open) setSecret("");
        }}
        title="Credencial inicial do agente"
        description="Exibida uma única vez. Configure no agente como DISCOVERY_AGENT_BOOTSTRAP_TOKEN e conclua a inscrição em até 15 minutos."
      >
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted p-3 text-xs select-all">
          {secret}
        </pre>
        <p className="mt-3 text-xs text-muted-foreground">
          Depois da inscrição, aprove o agente na listagem. A credencial de
          operação será guardada pelo próprio agente.
        </p>
        <Link
          href="/equipamentos/descoberta/instalacao"
          className="mt-3 inline-block text-sm text-blue-800 underline dark:text-blue-300"
        >
          Ver instruções de instalação
        </Link>
      </Modal>
      <Modal
        open={Boolean(agentDetail)}
        onOpenChange={(open) => {
          if (!open) setAgentDetail(null);
        }}
        title={agentDetail?.name ?? "Agente"}
        description="Saúde e configuração do agente distribuído."
      >
        {agentDetail && (
          <div className="space-y-3 text-xs">
            <Badge value={agentDetail.state} />
            <p>
              ID: <span className="font-mono">{agentDetail.id}</span>
            </p>
            <p>Último contato: {date(agentDetail.heartbeat)}</p>
            <p>Credencial válida até: {date(agentDetail.token_expires)}</p>
            <p>
              Métodos declarados:{" "}
              {agentDetail.health?.capabilities?.join(", ") || "Não disponível"}
            </p>
            {agentDetail.health?.interfaces?.map((i) => (
              <p key={`${i.name}-${i.ip}`} className="font-mono">
                {i.name} · {i.ip} · {i.netmask}
              </p>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadAgent(agentDetail)}
              leftIcon={<Download className="size-4" />}
            >
              Baixar configuração sem credenciais
            </Button>
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setEditingAgent(agentDetail);
                  setFormUnit(agentDetail.unidade_id ?? "");
                  setAgentDetail(null);
                  setMode("agent-edit");
                }}
              >
                Configurar redes
              </Button>
            )}
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void act("agent-rotate", agentDetail.id)}
              >
                Rotacionar e reinscrever
              </Button>
            )}
            <p className="text-muted-foreground">
              Ao rotacionar, o agente precisa reinscrever e ser aprovado
              novamente. Não há atualização remota de código.
            </p>
          </div>
        )}
      </Modal>

      <Dialog.Root
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open && !busy) setDetail(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40" />
          <Dialog.Content className="fixed inset-y-0 right-0 z-40 w-full max-w-xl overflow-y-auto border-l bg-card p-5 text-card-foreground shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="text-base font-semibold">
                  {detail?.payload.model ||
                    detail?.ip ||
                    "Detalhes do equipamento"}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-xs text-muted-foreground">
                  Dados coletados na rede; informações ausentes não são
                  presumidas.
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="Fechar detalhes"
                className="rounded p-1 hover:bg-muted"
              >
                <X className="size-5" />
              </Dialog.Close>
            </div>
            {detail && (
              <div className="mt-5 space-y-5 text-xs">
                <div className="flex flex-wrap gap-2">
                  <Badge value={detail.payload.confidence} />
                  <Badge value={detail.registration?.state ?? "NEW"} />
                </div>
                <DetailSection
                  title="Identificação"
                  icon={<ShieldCheck className="size-4" />}
                  rows={[
                    ["Fabricante", empty(detail.payload.manufacturer)],
                    ["Modelo", empty(detail.payload.model)],
                    ["Número de série", empty(detail.payload.serial)],
                    ["Firmware", empty(detail.payload.firmware)],
                    ["Tipo", types[detail.payload.device_type]],
                  ]}
                />
                <DetailSection
                  title="Rede"
                  icon={<Network className="size-4" />}
                  rows={[
                    ["IP", detail.ip],
                    ["MAC", empty(detail.payload.mac)],
                    ["Hostname", empty(detail.payload.hostname)],
                    [
                      "Portas",
                      detail.payload.open_ports.join(", ") || "Não disponível",
                    ],
                    [
                      "Protocolos",
                      detail.payload.protocols.join(", ") || "Não disponível",
                    ],
                    [
                      "Agente",
                      snapshot?.agents.find((a) => a.id === detail.job.agent_id)
                        ?.name ?? detail.job.agent_id,
                    ],
                    [
                      "Seccional",
                      orgaos.find((o) => o.id === detail.orgao_id)?.sigla ??
                        detail.orgao_id,
                    ],
                    [
                      "Unidade",
                      snapshot?.units.find(
                        (u) => u.id === detail.job.unidade_id,
                      )?.nome ?? "Não informada",
                    ],
                    ["Rede de origem", detail.job.target],
                  ]}
                />
                <DetailSection
                  title="Integração"
                  icon={<ServerCog className="size-4" />}
                  rows={[
                    [
                      "Driver sugerido",
                      detail.payload.driver || "Sem driver confirmado",
                    ],
                    [
                      "Capacidades demonstradas",
                      detail.payload.capabilities.join(", ") ||
                        "Não disponíveis",
                    ],
                    [
                      "Compatibilidade",
                      "Validar com o driver do SECP antes de ativar coleta",
                    ],
                  ]}
                />
                <div>
                  <h3 className="mb-2 font-semibold">Evidências</h3>
                  {detail.payload.evidence.length ? (
                    detail.payload.evidence.map((e, i) => (
                      <p key={i} className="border-b py-1.5">
                        {e.field}: {e.value}
                        <span className="ml-2 text-muted-foreground">
                          {e.source === "DECLARED"
                            ? "Declarado pelo dispositivo"
                            : "Inferido"}{" "}
                          · {e.method}
                        </span>
                      </p>
                    ))
                  ) : (
                    <p className="text-muted-foreground">
                      Sem evidência específica de fabricante.
                    </p>
                  )}
                </div>
                {[
                  ...detail.payload.warnings,
                  ...(detail.registration?.warnings ?? []),
                ].map((w, i) => (
                  <p
                    key={i}
                    className="rounded border border-amber-200 p-2 text-amber-800 dark:text-amber-200"
                  >
                    {w}
                  </p>
                ))}
                <DetailSection
                  title="Histórico"
                  icon={<Clock3 className="size-4" />}
                  rows={[
                    ["Primeira descoberta", date(detail.device.first_seen)],
                    ["Última descoberta", date(detail.device.last_seen)],
                    ["Job", detail.job_id],
                    ["Observações recentes", String(detail.history.length)],
                  ]}
                />
                <div className="space-y-1">
                  {detail.history.map((h) => (
                    <p key={h.id} className="font-mono text-[10px]">
                      {date(h.created)} · {h.ip} · {empty(h.payload.mac)} ·{" "}
                      {empty(h.payload.firmware)}
                    </p>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {canManage && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setSelected([]);
                          openForm("test");
                        }}
                      >
                        Testar comunicação
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void act("identify", detail.id)}
                      >
                        Identificar novamente
                      </Button>
                      {detail.registration?.state === "NEW" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelected([]);
                            openForm("register");
                          }}
                        >
                          Cadastrar
                        </Button>
                      )}
                    </>
                  )}
                  {detail.registration?.equipmentId && (
                    <Link
                      href={`/equipamentos/${detail.registration.equipmentId}/editar`}
                      className="rounded border px-3 py-2 text-sm font-semibold text-blue-800 dark:text-blue-300"
                    >
                      Abrir cadastro existente
                    </Link>
                  )}
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

function DetailSection({
  title,
  rows,
  icon,
}: {
  title: string;
  rows: Array<[string, string]>;
  icon: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </h3>
      <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-x-3 gap-y-2">
        {rows.map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="text-muted-foreground">{key}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
