import type { DiscoveryDevice } from "./contracts";

export type EquipmentIdentity = {
  id: string;
  orgaoId: string | null;
  codigo: string;
  nome: string;
  fabricante: string | null;
  numeroSerie: string | null;
  ip: string | null;
  mac: string | null;
  discoveryId: string | null;
};
const normal = (value: string | null) => (value ?? "").trim().toUpperCase();
const brand = (value: string | null) => normal(value).replace(/[\s_-]/g, "");
const mac = (value: string | null) => normal(value).replace(/[^0-9A-F]/g, "");

export function identifyRegistration(
  device: DiscoveryDevice,
  equipment: EquipmentIdentity[],
  visibleOrgaos: string[],
): NonNullable<DiscoveryDevice["registration"]> {
  const data = device.payload;
  const trustedSerial =
    data.confidence === "CONFIRMED" &&
    normal(data.serial).length >= 4 &&
    !/^0+$/.test(normal(data.serial));
  const exact = equipment.filter(
    (e) =>
      e.discoveryId === device.device_id ||
      (trustedSerial &&
        normal(e.numeroSerie) === normal(data.serial) &&
        brand(e.fabricante) === brand(data.manufacturer)),
  );
  if (exact.length === 1) {
    const found = exact[0];
    if (
      !found.orgaoId ||
      !visibleOrgaos.includes(found.orgaoId) ||
      found.orgaoId !== device.orgao_id
    )
      return {
        state: "CONFLICT",
        warnings: [
          "Identidade já vinculada a cadastro fora deste escopo. Solicite análise administrativa.",
        ],
      };
    return {
      state: "REGISTERED",
      equipmentId: found.id,
      label: `${found.codigo} — ${found.nome}`,
      warnings:
        found.ip && found.ip !== data.ip
          ? [
              "O IP encontrado difere do cadastro. Nenhuma configuração foi alterada.",
            ]
          : [],
    };
  }
  if (exact.length > 1)
    return {
      state: "CONFLICT",
      warnings: [
        "Mais de um cadastro corresponde à identidade. Não é seguro mesclar automaticamente.",
      ],
    };
  const auxiliary = equipment.filter(
    (e) =>
      (e.orgaoId === device.orgao_id && e.ip === data.ip) ||
      (mac(data.mac).length === 12 && mac(e.mac) === mac(data.mac)),
  );
  if (auxiliary.length)
    return {
      state: "CONFLICT",
      warnings: [
        "IP ou MAC coincide com cadastro existente sem confirmação suficiente de identidade. Revise o cadastro antes de prosseguir.",
      ],
    };
  return { state: "NEW", warnings: [] };
}
