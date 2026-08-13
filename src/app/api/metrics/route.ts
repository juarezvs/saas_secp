import { NextResponse, type NextRequest } from "next/server";

import { autorizarBearerToken } from "@/lib/observability/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { obterObservabilidade } from "@/lib/observability/metrics";
import { coletarMetricasPgbouncer } from "@/lib/observability/pgbouncer-metrics";
import { coletarMetricasFilas } from "@/lib/observability/queue-metrics";
import { coletarMetricasUsuariosAtivos } from "@/lib/observability/user-activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withHttpMetrics("/api/metrics", async (request: NextRequest) => {
  if (!autorizarBearerToken(request.headers.get("authorization"))) {
    return NextResponse.json(
      { status: "unauthorized" },
      {
        status: 401,
        headers: {
          "cache-control": "no-store",
          "www-authenticate": "Bearer",
        },
      },
    );
  }

  const observabilidade = obterObservabilidade();
  await Promise.all([
    coletarMetricasFilas(),
    coletarMetricasUsuariosAtivos(),
    coletarMetricasPgbouncer(),
  ]);

  return new Response(await observabilidade.registry.metrics(), {
    status: 200,
    headers: {
      "content-type": observabilidade.registry.contentType,
      "cache-control": "no-store",
    },
  });
});
