import { NextResponse } from "next/server";

import { withHttpMetrics } from "@/lib/observability/http";
import { verificarProntidao } from "@/lib/observability/readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withHttpMetrics("/api/ready", async () => {
  const resultado = await verificarProntidao();
  return NextResponse.json(resultado, {
    status: resultado.ok ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
});

