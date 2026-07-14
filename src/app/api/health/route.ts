import { NextResponse } from "next/server";

import { withHttpMetrics } from "@/lib/observability/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withHttpMetrics("/api/health", async () => {
  return NextResponse.json(
    {
      status: "ok",
      service: "secp",
      timestamp: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
});

