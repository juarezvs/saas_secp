import { describe, expect, it } from "vitest";
import type { DiscoveryDevice } from "./contracts";
import { identifyRegistration, type EquipmentIdentity } from "./duplicates";
import { signDiscoveryRequest } from "./signature";

export const discovered = (
  payload: Partial<DiscoveryDevice["payload"]> = {},
): DiscoveryDevice => ({
  id: "observation",
  device_id: "stable-device",
  job_id: "job",
  orgao_id: "org1",
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
    ...payload,
  },
});
const equipment = (
  fields: Partial<EquipmentIdentity> = {},
): EquipmentIdentity => ({
  id: "eq1",
  orgaoId: "org1",
  codigo: "EQUIP1",
  nome: "Equipment",
  fabricante: "Control iD",
  numeroSerie: "SERIAL-1234",
  ip: "172.19.5.30",
  mac: null,
  discoveryId: null,
  ...fields,
});

describe("duplicate discovery identities", () => {
  it("recognizes validated identity despite changed IP without changing the registry", () => {
    const existing = equipment();
    const result = identifyRegistration(discovered(), [existing], ["org1"]);
    expect(result).toMatchObject({ state: "REGISTERED", equipmentId: "eq1" });
    expect(result.warnings).toHaveLength(1);
    expect(existing.ip).toBe("172.19.5.30");
  });
  it("does not trust serial inferred from a web title", () =>
    expect(
      identifyRegistration(
        discovered({ confidence: "PROBABLE" }),
        [equipment()],
        ["org1"],
      ).state,
    ).toBe("NEW"));
  it("treats IP and MAC only as conflicts", () => {
    expect(
      identifyRegistration(
        discovered(),
        [equipment({ numeroSerie: null, ip: "172.19.5.29" })],
        ["org1"],
      ).state,
    ).toBe("CONFLICT");
    expect(
      identifyRegistration(
        discovered({ mac: "02:00:00:00:00:01" }),
        [equipment({ numeroSerie: null, mac: "0200.0000.0001" })],
        ["org1"],
      ).state,
    ).toBe("CONFLICT");
  });
  it("does not reveal identities belonging to another seccional", () => {
    const result = identifyRegistration(
      discovered(),
      [equipment({ orgaoId: "org2", nome: "SENSITIVE NAME" })],
      ["org1"],
    );
    expect(result.state).toBe("CONFLICT");
    expect(JSON.stringify(result)).not.toContain("SENSITIVE NAME");
    expect(result.equipmentId).toBeUndefined();
  });
  it("requires review when multiple registries share serial", () =>
    expect(
      identifyRegistration(
        discovered(),
        [equipment(), equipment({ id: "eq2" })],
        ["org1"],
      ).state,
    ).toBe("CONFLICT"));
  it("makes repeated registration idempotent through its persisted discovery ID", () =>
    expect(
      identifyRegistration(
        discovered({ serial: null, confidence: "UNKNOWN" }),
        [equipment({ discoveryId: "stable-device" })],
        ["org1"],
      ).state,
    ).toBe("REGISTERED"));
});

it("signs body, query, actor and nonce exactly like the Python canonical contract", () => {
  const signature = signDiscoveryRequest(
    "test-secret",
    "POST",
    "/api/v1/jobs?q=1",
    "1700000000",
    "nonce",
    "claims",
    '{"x":1}',
  );
  expect(signature).toBe(
    "27341dfe85d2105153dbad5db928b06d181dc0dc16cf37b6fb3b7d38549e7052",
  );
});
