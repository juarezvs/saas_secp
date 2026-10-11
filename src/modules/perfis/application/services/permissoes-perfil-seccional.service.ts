type PermissaoBase = {
  permissaoId: string;
  permissao: { codigo: string };
};

type ExcecaoSeccional = {
  orgaoId: string;
  permissaoId: string;
  permitida: boolean;
  permissao: { codigo: string };
};

export function resolverPermissoesPerfilNaSeccional(
  permissoesBase: PermissaoBase[],
  excecoes: ExcecaoSeccional[],
  orgaoId?: string | null,
) {
  const efetivas = new Map(
    permissoesBase.map((item) => [item.permissaoId, item.permissao.codigo]),
  );

  if (!orgaoId) {
    return Array.from(efetivas.values());
  }

  for (const excecao of excecoes) {
    if (excecao.orgaoId !== orgaoId) continue;

    if (excecao.permitida) {
      efetivas.set(excecao.permissaoId, excecao.permissao.codigo);
    } else {
      efetivas.delete(excecao.permissaoId);
    }
  }

  return Array.from(efetivas.values());
}

export function calcularExcecoesPermissoesSeccionais(
  permissoesBaseIds: string[],
  permissoesSelecionadasIds: string[],
) {
  const base = new Set(permissoesBaseIds);
  const selecionadas = new Set(permissoesSelecionadasIds);

  return [
    ...permissoesSelecionadasIds
      .filter((permissaoId) => !base.has(permissaoId))
      .map((permissaoId) => ({ permissaoId, permitida: true })),
    ...permissoesBaseIds
      .filter((permissaoId) => !selecionadas.has(permissaoId))
      .map((permissaoId) => ({ permissaoId, permitida: false })),
  ];
}
