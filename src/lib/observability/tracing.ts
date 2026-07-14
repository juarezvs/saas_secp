import { trace } from "@opentelemetry/api";

import { logger } from "./logger";

const globalForTracing = globalThis as unknown as {
  __secpTracingStarted?: boolean;
};

function tracingAtivo() {
  return process.env.OTEL_ENABLED === "true" || Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
}

export async function inicializarTracing() {
  if (globalForTracing.__secpTracingStarted || !tracingAtivo()) {
    return;
  }

  const [
    { NodeSDK },
    { OTLPTraceExporter },
    { getNodeAutoInstrumentations },
    { resourceFromAttributes },
  ] = await Promise.all([
    import("@opentelemetry/sdk-node"),
    import("@opentelemetry/exporter-trace-otlp-http"),
    import("@opentelemetry/auto-instrumentations-node"),
    import("@opentelemetry/resources"),
  ]);

  const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, ATTR_DEPLOYMENT_ENVIRONMENT_NAME } =
    await import("@opentelemetry/semantic-conventions");

  const endpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
    (process.env.OTEL_EXPORTER_OTLP_ENDPOINT
      ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, "")}/v1/traces`
      : undefined);

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "secp-web",
      [ATTR_SERVICE_VERSION]: process.env.APP_VERSION ?? "development",
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV ?? "unknown",
    }),
    traceExporter: new OTLPTraceExporter(endpoint ? { url: endpoint } : {}),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": {
          enabled: false,
        },
      }),
    ],
  });

  await sdk.start();
  globalForTracing.__secpTracingStarted = true;
  logger.info("Tracing OpenTelemetry inicializado", { endpoint: endpoint ?? "default" });

  const encerrar = async () => {
    try {
      await sdk.shutdown();
      logger.info("Tracing OpenTelemetry encerrado");
    } catch (error) {
      logger.error("Falha ao encerrar tracing OpenTelemetry", { error });
    }
  };

  process.once("SIGTERM", encerrar);
  process.once("SIGINT", encerrar);
}

export function tracer() {
  return trace.getTracer("secp");
}
