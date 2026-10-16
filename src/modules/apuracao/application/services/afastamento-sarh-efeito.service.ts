type AfastamentoSarhEfeito = {
  ativo: boolean;
  categoria: string;
  origemTabela: string;
  tipoDescricao: string | null;
};

export function afastamentoSarhDeveImpactarApuracao(afastamento: AfastamentoSarhEfeito) {
  if (!afastamento.ativo) return false;
  const normalizar = (valor: string) => valor.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();
  const ferias = [afastamento.categoria, afastamento.origemTabela].some((valor) => normalizar(valor).includes("FERIAS"));
  return !ferias || normalizar(afastamento.tipoDescricao ?? "") === "GOZADA";
}
