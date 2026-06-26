export type FusoHorarioOficial = {
  valor: string;
  rotulo: string;
  descricao: string;
};

export const FUSOS_HORARIOS_BRASIL_PADRAO: FusoHorarioOficial[] = [
  {
    valor: "America/Noronha",
    rotulo: "Fernando de Noronha (UTC-02)",
    descricao: "Fuso oficial brasileiro UTC-02.",
  },
  {
    valor: "America/Sao_Paulo",
    rotulo: "Brasília/São Paulo (UTC-03)",
    descricao:
      "Fuso oficial brasileiro UTC-03, horário de Brasília e da maior parte do país.",
  },
  {
    valor: "America/Manaus",
    rotulo: "Manaus (UTC-04)",
    descricao:
      "Fuso oficial brasileiro UTC-04, usado no Amazonas, Roraima, Rondônia e Mato Grosso.",
  },
  {
    valor: "America/Eirunepe",
    rotulo: "Tabatinga/Eirunepé (UTC-05)",
    descricao:
      "Fuso oficial brasileiro UTC-05, usado em localidades do oeste do Amazonas.",
  },
  {
    valor: "America/Rio_Branco",
    rotulo: "Rio Branco (UTC-05)",
    descricao: "Fuso oficial brasileiro UTC-05, usado no Acre.",
  },
];

export const FUSOS_HORARIOS_CADASTRO_PADRAO =
  FUSOS_HORARIOS_BRASIL_PADRAO;
