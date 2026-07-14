import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability/queue-metrics", () => ({
  coletarMetricasFilas: vi.fn().mockResolvedValue(undefined),
}));

describe("/api/metrics", () => {
  beforeEach(() => {
    process.env.SECP_METRICS_TOKEN = "token-teste";
  });

  it("recusa requisicao sem bearer token", async () => {
    const { GET } = await import("./route");
    const request = new NextRequest("http://localhost/api/metrics");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("retorna metricas prometheus com token valido", async () => {
    const { GET } = await import("./route");
    const request = new NextRequest("http://localhost/api/metrics", {
      headers: { authorization: "Bearer token-teste" },
    });
    const response = await GET(request);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain("secp_build_info");
    expect(body).not.toContain("token-teste");
  });
});

