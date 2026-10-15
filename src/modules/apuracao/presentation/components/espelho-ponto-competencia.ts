type SolicitacaoComPeriodo = {
  dataReferencia: Date | string | null;
  dataInicio: Date | string | null;
  dataFim: Date | string | null;
};

export function pertenceACompetencia(
  valor: Date | string,
  anoReferencia: number,
  mesReferencia: number,
) {
  const data = valor instanceof Date ? valor : new Date(valor);

  return (
    !Number.isNaN(data.getTime()) &&
    data.getUTCFullYear() === anoReferencia &&
    data.getUTCMonth() + 1 === mesReferencia
  );
}

export function solicitacaoAfetaCompetencia(
  solicitacao: SolicitacaoComPeriodo,
  anoReferencia: number,
  mesReferencia: number,
) {
  if (solicitacao.dataReferencia) {
    return pertenceACompetencia(
      solicitacao.dataReferencia,
      anoReferencia,
      mesReferencia,
    );
  }

  if (!solicitacao.dataInicio) return false;

  const inicioCompetencia = Date.UTC(anoReferencia, mesReferencia - 1, 1);
  const fimCompetencia = Date.UTC(anoReferencia, mesReferencia, 1);
  const inicioSolicitacao = new Date(solicitacao.dataInicio).getTime();
  const fimSolicitacao = solicitacao.dataFim
    ? new Date(solicitacao.dataFim).getTime()
    : inicioSolicitacao;

  return (
    Number.isFinite(inicioSolicitacao) &&
    Number.isFinite(fimSolicitacao) &&
    inicioSolicitacao < fimCompetencia &&
    fimSolicitacao >= inicioCompetencia
  );
}
