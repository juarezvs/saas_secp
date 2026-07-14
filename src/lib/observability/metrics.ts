import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

type ObservabilityState = {
  registry: Registry;
  httpRequestsTotal: Counter<"method" | "route" | "status">;
  httpRequestDurationSeconds: Histogram<"method" | "route" | "status">;
  httpRequestsInFlight: Gauge<"method" | "route">;
  httpResponseSizeBytes: Histogram<"method" | "route" | "status">;
  applicationErrorsTotal: Counter<"area" | "kind">;
  activeSessions: Gauge;
  businessEventsTotal: Counter<"domain" | "event" | "result">;
  queueJobs: Gauge<"queue" | "state">;
  queueHealthy: Gauge<"queue">;
  initialized: boolean;
};

const globalForObservability = globalThis as unknown as {
  __secpObservability?: ObservabilityState;
};

function criarEstado(): ObservabilityState {
  const registry = new Registry();
  registry.setDefaultLabels({
    app: "secp",
    service: "web",
  });

  collectDefaultMetrics({
    register: registry,
    prefix: "secp_nodejs_",
  });

  const buildInfo = new Gauge({
    name: "secp_build_info",
    help: "Informacoes de build e runtime do SECP.",
    labelNames: ["version", "node_version", "environment"] as const,
    registers: [registry],
  });

  buildInfo.set(
    {
      version: process.env.APP_VERSION ?? "development",
      node_version: process.version,
      environment: process.env.NODE_ENV ?? "unknown",
    },
    1,
  );

  const processUptime = new Gauge({
    name: "secp_process_uptime_seconds",
    help: "Tempo de vida do processo Node.js do SECP em segundos.",
    registers: [registry],
    collect() {
      this.set(process.uptime());
    },
  });

  const httpRequestsTotal = new Counter({
    name: "secp_http_requests_total",
    help: "Total de requisicoes HTTP observadas pelo SECP.",
    labelNames: ["method", "route", "status"] as const,
    registers: [registry],
  });

  const httpRequestDurationSeconds = new Histogram({
    name: "secp_http_request_duration_seconds",
    help: "Duracao das requisicoes HTTP observadas pelo SECP.",
    labelNames: ["method", "route", "status"] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
    registers: [registry],
  });

  const httpRequestsInFlight = new Gauge({
    name: "secp_http_requests_in_flight",
    help: "Requisicoes HTTP em andamento no SECP.",
    labelNames: ["method", "route"] as const,
    registers: [registry],
  });

  const httpResponseSizeBytes = new Histogram({
    name: "secp_http_response_size_bytes",
    help: "Tamanho estimado das respostas HTTP observadas pelo SECP.",
    labelNames: ["method", "route", "status"] as const,
    buckets: [100, 1_000, 5_000, 10_000, 50_000, 100_000, 500_000, 1_000_000],
    registers: [registry],
  });

  const applicationErrorsTotal = new Counter({
    name: "secp_application_errors_total",
    help: "Total de erros de aplicacao classificados por area segura.",
    labelNames: ["area", "kind"] as const,
    registers: [registry],
  });

  const activeSessions = new Gauge({
    name: "secp_active_sessions",
    help: "Sessoes ativas conhecidas pelo SECP. Sem coletor ate haver fonte persistente confiavel.",
    registers: [registry],
  });

  const businessEventsTotal = new Counter({
    name: "secp_business_events_total",
    help: "Eventos de negocio agregados e sem dados pessoais.",
    labelNames: ["domain", "event", "result"] as const,
    registers: [registry],
  });

  const queueJobs = new Gauge({
    name: "secp_queue_jobs",
    help: "Quantidade de jobs BullMQ por fila e estado.",
    labelNames: ["queue", "state"] as const,
    registers: [registry],
  });

  const queueHealthy = new Gauge({
    name: "secp_queue_healthy",
    help: "Indica se a coleta de metricas da fila foi bem sucedida.",
    labelNames: ["queue"] as const,
    registers: [registry],
  });

  processUptime.set(process.uptime());

  return {
    registry,
    httpRequestsTotal,
    httpRequestDurationSeconds,
    httpRequestsInFlight,
    httpResponseSizeBytes,
    applicationErrorsTotal,
    activeSessions,
    businessEventsTotal,
    queueJobs,
    queueHealthy,
    initialized: false,
  };
}

export function obterObservabilidade() {
  globalForObservability.__secpObservability ??= criarEstado();
  return globalForObservability.__secpObservability;
}

export function normalizarRotaParaMetricas(pathname: string) {
  return pathname
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "/:id",
    )
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .slice(0, 160);
}

