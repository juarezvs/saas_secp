export type ModeloConfiguracaoApuracao = {
  codigo: string;
  nome: string;
  descricao: string;
  tiposJornada: string[];
  camposComplementares: string[];
};

// Os modelos orientam o cadastro, mas não publicam parâmetros normativos.
export const MODELOS_CONFIGURACAO_APURACAO: ModeloConfiguracaoApuracao[] = [
  {
    codigo: "JORNADA_CONTINUA",
    nome: "Jornada contínua",
    descricao: "Carga diária executada em um período contínuo.",
    tiposJornada: ["FIXA", "SEMANAL"],
    camposComplementares: [],
  },
  {
    codigo: "JORNADA_COM_INTERVALO",
    nome: "Jornada com intervalo",
    descricao: "Jornada diária com um ou mais intervalos não computáveis.",
    tiposJornada: ["FIXA", "SEMANAL"],
    camposComplementares: ["intervaloMinimoMinutos", "intervaloMaximoMinutos"],
  },
  {
    codigo: "JORNADA_FLEXIVEL",
    nome: "Jornada flexível",
    descricao: "Carga cumprida dentro de uma janela de início e término.",
    tiposJornada: ["FLEXIVEL", "CARGA_HORARIA_LIVRE"],
    camposComplementares: ["janelaInicio", "janelaFim"],
  },
  {
    codigo: "JORNADA_REDUZIDA",
    nome: "Jornada reduzida",
    descricao: "Carga reduzida definida no cadastro oficial de jornada.",
    tiposJornada: ["FIXA", "SEMANAL"],
    camposComplementares: [],
  },
  {
    codigo: "ESCALA_5X2",
    nome: "Escala 5x2",
    descricao: "Cinco dias de trabalho e dois de descanso.",
    tiposJornada: ["ESCALA_CICLICA"],
    camposComplementares: [],
  },
  {
    codigo: "ESCALA_6X1",
    nome: "Escala 6x1",
    descricao: "Seis dias de trabalho e um de descanso.",
    tiposJornada: ["ESCALA_CICLICA"],
    camposComplementares: [],
  },
  {
    codigo: "ESCALA_5X1",
    nome: "Escala 5x1",
    descricao: "Cinco dias de trabalho e um de descanso.",
    tiposJornada: ["ESCALA_CICLICA"],
    camposComplementares: [],
  },
  {
    codigo: "ESCALA_12X36",
    nome: "Escala 12x36",
    descricao: "Doze horas de trabalho seguidas por trinta e seis de descanso.",
    tiposJornada: ["ESCALA_CICLICA"],
    camposComplementares: [],
  },
  {
    codigo: "CICLO_PERSONALIZADO",
    nome: "Ciclo personalizado",
    descricao: "Ciclo cuja composição é lida integralmente da escala cadastrada.",
    tiposJornada: ["ESCALA_CICLICA"],
    camposComplementares: [],
  },
  {
    codigo: "PLANTAO",
    nome: "Plantão",
    descricao: "Jornada de plantão conforme faixas e escala cadastradas.",
    tiposJornada: ["PLANTAO", "ESCALA_CICLICA"],
    camposComplementares: [],
  },
  {
    codigo: "JORNADA_NOTURNA",
    nome: "Jornada noturna",
    descricao: "Jornada que atravessa a meia-noite.",
    tiposJornada: ["FIXA", "ESCALA_CICLICA"],
    camposComplementares: [],
  },
  {
    codigo: "REGIME_ESPECIAL",
    nome: "Regime especial",
    descricao: "Modelo aberto para regime institucional específico.",
    tiposJornada: [],
    camposComplementares: ["fundamentoNormativo"],
  },
];

export function sugerirModelosConfiguracao(tipoJornada: string) {
  return MODELOS_CONFIGURACAO_APURACAO.filter(
    (modelo) => modelo.tiposJornada.length === 0 || modelo.tiposJornada.includes(tipoJornada),
  );
}
