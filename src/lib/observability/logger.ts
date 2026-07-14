import { context, trace } from "@opentelemetry/api";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const CAMPOS_SENSIVEIS = /(authorization|cookie|token|secret|password|senha|cpf|matricula|biometria|template)/i;

function nivelAtual() {
  return process.env.LOG_LEVEL?.toLowerCase() ?? "info";
}

function deveEmitir(level: LogLevel) {
  const pesos: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
  };

  return pesos[level] >= (pesos[nivelAtual() as LogLevel] ?? pesos.info);
}

function sanitizar(valor: unknown): unknown {
  if (valor instanceof Error) {
    return {
      name: valor.name,
      message: valor.message,
      stack: process.env.NODE_ENV === "production" ? undefined : valor.stack,
    };
  }

  if (Array.isArray(valor)) {
    return valor.map(sanitizar);
  }

  if (!valor || typeof valor !== "object") {
    return valor;
  }

  return Object.fromEntries(
    Object.entries(valor as LogContext).map(([chave, conteudo]) => [
      chave,
      CAMPOS_SENSIVEIS.test(chave) ? "[REDACTED]" : sanitizar(conteudo),
    ]),
  );
}

function contextoTrace() {
  const span = trace.getSpan(context.active());
  const spanContext = span?.spanContext();

  if (!spanContext) {
    return {};
  }

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

function escrever(level: LogLevel, message: string, contextObject: LogContext = {}) {
  if (!deveEmitir(level)) {
    return;
  }

  const contextoSanitizado = sanitizar(contextObject) as LogContext;
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service: "secp",
    environment: process.env.NODE_ENV ?? "unknown",
    message,
    ...contextoTrace(),
    ...contextoSanitizado,
  };

  const linha = JSON.stringify(payload);

  if (level === "error") {
    console.error(linha);
    return;
  }

  if (level === "warn") {
    console.warn(linha);
    return;
  }

  console.log(linha);
}

export const logger = {
  debug: (message: string, contextObject?: LogContext) =>
    escrever("debug", message, contextObject),
  info: (message: string, contextObject?: LogContext) =>
    escrever("info", message, contextObject),
  warn: (message: string, contextObject?: LogContext) =>
    escrever("warn", message, contextObject),
  error: (message: string, contextObject?: LogContext) =>
    escrever("error", message, contextObject),
};
