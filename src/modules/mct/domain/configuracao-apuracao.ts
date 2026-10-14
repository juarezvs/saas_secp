import { MODELOS_CONFIGURACAO_APURACAO } from "./modelos-configuracao-apuracao";

export type DadosConfiguracaoApuracao = {
  modeloCodigo: string;
  politicaPublicada: boolean;
  vigenciaInicio: Date;
  vigenciaFim?: Date | null;
  configuracaoComplementar?: Record<string, unknown> | null;
};

export function diagnosticarConfiguracaoApuracao(dados: DadosConfiguracaoApuracao) {
  const pendencias: string[] = [];
  const modelo = MODELOS_CONFIGURACAO_APURACAO.find((item) => item.codigo === dados.modeloCodigo);
  if (!modelo) pendencias.push("Selecione um modelo de apuração válido.");
  if (!dados.politicaPublicada) pendencias.push("Vincule uma política publicada.");
  if (!Number.isFinite(dados.vigenciaInicio.getTime())) pendencias.push("Informe uma data inicial de vigência válida.");
  if (dados.vigenciaFim && (!Number.isFinite(dados.vigenciaFim.getTime()) || dados.vigenciaFim < dados.vigenciaInicio)) {
    pendencias.push("A vigência final deve ser igual ou posterior à inicial.");
  }
  const complementos = dados.configuracaoComplementar ?? {};
  for (const campo of modelo?.camposComplementares ?? []) {
    const valor = complementos[campo];
    if (valor === null || valor === undefined || (typeof valor === "string" && !valor.trim())) {
      pendencias.push(`Informe o campo complementar ${campo}.`);
    }
  }
  return { completa: pendencias.length === 0, status: pendencias.length === 0 ? "PRONTA_SIMULACAO" as const : "INCOMPLETA" as const, pendencias };
}
