import { SpanStatusCode } from "@opentelemetry/api";
import { NextResponse } from "next/server";

import { logger } from "./logger";
import { normalizarRotaParaMetricas, obterObservabilidade } from "./metrics";
import { tracer } from "./tracing";

type RouteHandler<TRequest extends Request = Request, TArgs extends unknown[] = []> = (
  request: TRequest,
  ...args: TArgs
) => Promise<Response> | Response;

function tamanhoResposta(response: Response) {
  const contentLength = response.headers.get("content-length");
  const parsed = contentLength ? Number(contentLength) : Number.NaN;

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function obterRequestId(request: Request) {
  return (
    request.headers.get("x-request-id") ??
    request.headers.get("x-correlation-id") ??
    crypto.randomUUID()
  );
}

function definirRequestId(response: Response, requestId: string) {
  try {
    response.headers.set("x-request-id", requestId);
  } catch {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "x-request-id": requestId,
      },
    });
  }

  return response;
}

export function withHttpMetrics<
  TRequest extends Request = Request,
  TArgs extends unknown[] = [],
>(
  routeName: string,
  handler: RouteHandler<TRequest, TArgs>,
) {
  return async function observarHttp(request: TRequest, ...args: TArgs) {
    const observabilidade = obterObservabilidade();
    const method = request.method.toUpperCase();
    const route = normalizarRotaParaMetricas(routeName);
    const requestId = obterRequestId(request);
    const inicio = performance.now();
    const endTimer = observabilidade.httpRequestDurationSeconds.startTimer({
      method,
      route,
    });

    observabilidade.httpRequestsInFlight.inc({ method, route });

    return tracer().startActiveSpan(`HTTP ${method} ${route}`, async (span) => {
      span.setAttributes({
        "http.request.method": method,
        "http.route": route,
        "url.path": new URL(request.url).pathname,
        "secp.request_id": requestId,
      });

      try {
        const response = await handler(request, ...args);
        const status = String(response.status);
        const durationMs = Math.round(performance.now() - inicio);

        span.setAttribute("http.response.status_code", response.status);
        span.setStatus({
          code: response.status >= 500 ? SpanStatusCode.ERROR : SpanStatusCode.OK,
        });

        observabilidade.httpRequestsTotal.inc({ method, route, status });
        observabilidade.httpResponseSizeBytes.observe(
          { method, route, status },
          tamanhoResposta(response),
        );
        endTimer({ status });

        logger[response.status >= 500 ? "error" : response.status >= 400 ? "warn" : "info"](
          "Requisicao HTTP observada",
          {
            requestId,
            method,
            route,
            status: response.status,
            durationMs,
          },
        );

        return definirRequestId(response, requestId);
      } catch (error) {
        const status = "500";
        const durationMs = Math.round(performance.now() - inicio);

        observabilidade.httpRequestsTotal.inc({ method, route, status });
        observabilidade.applicationErrorsTotal.inc({
          area: "http",
          kind: "unhandled",
        });
        endTimer({ status });
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });

        logger.error("Erro em rota observada", {
          requestId,
          method,
          route,
          status: 500,
          durationMs,
          error,
        });

        return NextResponse.json(
          { status: "error", message: "Erro interno.", requestId },
          { status: 500, headers: { "x-request-id": requestId } },
        );
      } finally {
        observabilidade.httpRequestsInFlight.dec({ method, route });
        span.end();
      }
    });
  };
}
