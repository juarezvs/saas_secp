import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mock = vi.hoisted(() => ({
  context: vi.fn(),
  request: vi.fn(),
  scope: vi.fn(),
  annotate: vi.fn(),
  units: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: { auditoriaEvento: { create: mock.audit } },
}));
vi.mock("@/shared/infrastructure/database/prisma-listagem", () => ({
  prismaListagem: { unidadeOrganizacional: { findMany: mock.units } },
}));
vi.mock("@/lib/cache/redis-cache", () => ({ obterRedisCacheClient: vi.fn() }));
vi.mock("@/lib/observability/http", () => ({
  withHttpMetrics: (_path: string, handler: unknown) => handler,
}));
vi.mock("@/modules/descoberta/application/gateway", () => ({
  discoveryContext: mock.context,
  discoveryRequest: mock.request,
  requireDiscoveryOrganization: mock.scope,
  DiscoveryError: class extends Error {
    constructor(
      message: string,
      public status = 503,
    ) {
      super(message);
    }
  },
}));
vi.mock("@/modules/descoberta/application/equipment", () => ({
  annotateRegistrations: mock.annotate,
  registerDiscoveredDevice: vi.fn(),
  testDiscoveryDevice: vi.fn(),
}));
import { GET, POST } from "./route";
import { DiscoveryError } from "@/modules/descoberta/application/gateway";
const orgao = "b05fa444-b5c4-4f0d-8709-69030d9c9d82";
beforeEach(() => {
  vi.clearAllMocks();
  mock.context.mockResolvedValue({
    userId: "user",
    orgaoIds: [orgao],
    manage: true,
    units: [],
  });
  mock.scope.mockResolvedValue(undefined);
});
it("rejects unauthenticated reads before contacting discovery", async () => {
  mock.context.mockRejectedValue(new DiscoveryError("session", 401));
  expect(
    (
      await GET(
        new NextRequest("http://localhost:3000/api/descoberta-equipamentos"),
      )
    ).status,
  ).toBe(401);
  expect(mock.request).not.toHaveBeenCalled();
});
it("rejects inactive or out-of-scope organizations before contacting discovery", async () => {
  mock.scope.mockRejectedValue(new DiscoveryError("scope", 404));
  expect(
    (
      await GET(
        new NextRequest(
          "http://localhost:3000/api/descoberta-equipamentos?orgaoId=" + orgao,
        ),
      )
    ).status,
  ).toBe(404);
  expect(mock.request).not.toHaveBeenCalled();
});
it("rejects cross-origin mutations before authorization or writes", async () => {
  const request = new NextRequest(
    "http://localhost:3000/api/descoberta-equipamentos",
    {
      method: "POST",
      headers: {
        origin: "http://external.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    },
  );
  expect((await POST(request)).status).toBe(403);
  expect(mock.context).not.toHaveBeenCalled();
});
it("requires administrative permission for all mutations", async () => {
  mock.context.mockRejectedValue(new DiscoveryError("read-only", 403));
  const request = new NextRequest(
    "http://localhost:3000/api/descoberta-equipamentos",
    {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: "{}",
    },
  );
  expect((await POST(request)).status).toBe(403);
  expect(mock.context).toHaveBeenCalledWith(true);
  expect(mock.request).not.toHaveBeenCalled();
});
it("handles invalid JSON without leaking payloads", async () => {
  const request = new NextRequest(
    "http://localhost:3000/api/descoberta-equipamentos",
    {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: "SECRET_INVALID_JSON",
    },
  );
  const response = await POST(request);
  expect(response.status).toBe(400);
  expect(await response.text()).not.toContain("SECRET_INVALID_JSON");
});
it("validates command names and rejects oversized bodies", async () => {
  const request = (body: string) =>
    new NextRequest("http://localhost:3000/api/descoberta-equipamentos", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body,
    });
  expect((await POST(request('{"action":"reboot"}'))).status).toBe(422);
  expect((await POST(request("x".repeat(66000)))).status).toBe(413);
  expect(mock.request).not.toHaveBeenCalled();
});
