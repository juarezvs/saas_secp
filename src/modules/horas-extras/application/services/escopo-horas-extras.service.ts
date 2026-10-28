export type EscopoHorasExtras = {
  global: boolean;
  orgaoIds: readonly string[];
};

export function podeAcessarOrgaoHorasExtras(escopo: EscopoHorasExtras, orgaoId: string) {
  return escopo.global || escopo.orgaoIds.includes(orgaoId);
}
