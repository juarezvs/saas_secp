/** Uma organização já inativada no SECP só volta a ser exibida por seu cadastro. */
export function preservarInativacaoOrganizacional<T extends { ativo: boolean }>(dadosSarh: T, existente?: { ativo: boolean } | null): T {
  return existente?.ativo === false ? { ...dadosSarh, ativo: false } : dadosSarh;
}
