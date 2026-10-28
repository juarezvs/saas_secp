import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DiscoveryDetail } from "../domain/contracts";
import type { DiscoveryContext } from "./gateway";

const mock = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  queryRaw: vi.fn(),
  action: vi.fn(),
  provider: vi.fn(),
  test: vi.fn(),
  audit: vi.fn(),
  scope: vi.fn(),
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: {
    equipamentoBiometrico: {
      findMany: mock.findMany,
      findUnique: mock.findUnique,
    },
    $queryRaw: mock.queryRaw,
    auditoriaEvento: { create: mock.audit },
  },
}));
vi.mock(
  "@/modules/integracoes/application/actions/registrar-equipamento-biometrico.action",
  () => ({ registrarEquipamentoBiometricoAction: mock.action }),
);
vi.mock(
  "@/modules/integracoes/application/services/relogios-ponto/relogio-ponto-provider.service",
  () => ({ criarRelogioPontoProvider: mock.provider }),
);
vi.mock("./gateway", () => ({
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
import { registerDiscoveredDevice, testDiscoveryDevice } from "./equipment";

const orgaoId = "b05fa444-b5c4-4f0d-8709-69030d9c9d82";
const context = {
  userId: "user",
  orgaoIds: [orgaoId],
  orgaos: [],
  units: [],
  excludedUnitIds: [],
  manage: true,
} satisfies DiscoveryContext;
const detail = {
  id: "observation",
  device_id: "stable-device",
  job_id: "job",
  orgao_id: orgaoId,
  ip: "172.19.5.29",
  created: 1,
  payload: {
    ip: "172.19.5.29",
    open_ports: [80],
    mac: null,
    hostname: null,
    manufacturer: "CONTROL_ID",
    model: "iDFace",
    serial: "SERIAL-1234",
    firmware: null,
    device_type: "FACIAL_TERMINAL",
    confidence: "CONFIRMED",
    protocols: [],
    capabilities: [],
    driver: "CONTROL_ID_FACE_ID",
    evidence: [],
    warnings: [],
  },
  job: { unidade_id: null },
  device: { first_seen: 1, last_seen: 1 },
  history: [],
} as unknown as DiscoveryDetail;

beforeEach(() => {
  vi.clearAllMocks();
  mock.findMany.mockResolvedValue([]);
  mock.queryRaw.mockResolvedValue([]);
  mock.findUnique.mockResolvedValue({ id: "eq1", orgaoId, ip: detail.ip });
  mock.action.mockResolvedValue({ sucesso: true });
  mock.scope.mockResolvedValue(undefined);
  mock.audit.mockResolvedValue({});
  mock.provider.mockReturnValue({ testarConexao: mock.test });
  mock.test.mockResolvedValue({
    status: "ONLINE",
    detalhes: { sensitive: "NEVER RETURN" },
  });
});
describe("assisted registration", () => {
  it("uses the current action and registers inactive without starting collection", async () => {
    expect(
      await registerDiscoveredDevice(detail, context, {
        nome: "Face ID recepção",
        protocolo: "CONTROL_ID_FACE_ID",
        porta: 80,
      }),
    ).toEqual({ id: "eq1", duplicate: false });
    expect(mock.action).toHaveBeenCalledOnce();
    const form = mock.action.mock.calls[0][1] as FormData;
    expect(form.get("ativo")).toBe("false");
    expect(form.get("codigo")).toBe("DISC_stable-device");
    expect(form.get("numeroSerie")).toBe("SERIAL-1234");
    expect(mock.provider).not.toHaveBeenCalled();
  });
  it("returns an existing identity without creating another registry", async () => {
    mock.findMany.mockResolvedValue([
      {
        id: "eq1",
        orgaoId,
        codigo: "DISC_stable-device",
        nome: "Existing",
        fabricante: "CONTROL_ID",
        numeroSerie: detail.payload.serial,
        ip: detail.ip,
      },
    ]);
    expect(
      (
        await registerDiscoveredDevice(detail, context, {
          nome: "Another",
          protocolo: "CONTROL_ID_FACE_ID",
          porta: 80,
        })
      ).duplicate,
    ).toBe(true);
    expect(mock.action).not.toHaveBeenCalled();
  });
  it("rejects inferred identification without explicit review", async () => {
    await expect(
      registerDiscoveredDevice(
        { ...detail, payload: { ...detail.payload, confidence: "PROBABLE" } },
        context,
        { nome: "Probable", protocolo: "GENERIC", porta: 80 },
      ),
    ).rejects.toThrow(/explicitamente/);
    expect(mock.action).not.toHaveBeenCalled();
  });
  it("enforces current active organization and unit before any write", async () => {
    mock.scope.mockRejectedValue(new Error("inactive"));
    await expect(
      registerDiscoveredDevice(detail, context, {
        nome: "Blocked",
        protocolo: "GENERIC",
        porta: 80,
      }),
    ).rejects.toThrow("inactive");
    expect(mock.action).not.toHaveBeenCalled();
  });
});
describe("existing driver test", () => {
  it("refuses a driver from a different confirmed manufacturer", async () => {
    await expect(testDiscoveryDevice(detail, context, { protocolo: "HENRY", porta: 80, usuario: "test-user", senha: "test-secret" })).rejects.toThrow(/fabricante confirmado/);
    expect(mock.provider).not.toHaveBeenCalled();
  });
  it("requires explicit credentials and never tries default passwords", async () => {
    await expect(
      testDiscoveryDevice(detail, context, {
        protocolo: "CONTROL_ID_FACE_ID",
        porta: 80,
      }),
    ).rejects.toThrow(/credenciais/);
    expect(mock.provider).not.toHaveBeenCalled();
  });
  it("rejects a port not proven by discovery", async () => {
    await expect(
      testDiscoveryDevice(detail, context, {
        protocolo: "CONTROL_ID_FACE_ID",
        porta: 4370,
        usuario: "test-user",
        senha: "test-secret",
      }),
    ).rejects.toThrow(/comprovado/);
  });
  it("reuses the existing driver and returns no raw metadata or credentials", async () => {
    const result = await testDiscoveryDevice(detail, context, {
      protocolo: "CONTROL_ID_FACE_ID",
      porta: 80,
      usuario: "test-user",
      senha: "test-secret",
    });
    expect(result.status).toBe("ONLINE");
    expect(mock.test).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toContain("NEVER RETURN");
  });
});
