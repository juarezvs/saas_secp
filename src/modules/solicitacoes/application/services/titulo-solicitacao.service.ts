import { rotuloTipoSolicitacao } from "./fluxo-solicitacao.service";

type DadosTituloSolicitacao = {
  tipo: string;
  dataReferencia?: string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
};

function formatarDataCurta(valor?: string | null) {
  const texto = String(valor ?? "").trim();
  const data = texto.includes("T") ? texto.split("T")[0] : texto;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);

  if (!match) {
    return null;
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function gerarTituloSolicitacao(dados: DadosTituloSolicitacao) {
  const rotulo = rotuloTipoSolicitacao(dados.tipo);
  const dataReferencia =
    formatarDataCurta(dados.dataReferencia) ??
    formatarDataCurta(dados.dataInicio);
  const dataFim = formatarDataCurta(dados.dataFim);

  if (dataReferencia && dataFim && dataFim !== dataReferencia) {
    return `${rotulo} - ${dataReferencia} a ${dataFim}`.slice(0, 180);
  }

  if (dataReferencia) {
    return `${rotulo} - ${dataReferencia}`.slice(0, 180);
  }

  return rotulo.slice(0, 180);
}
