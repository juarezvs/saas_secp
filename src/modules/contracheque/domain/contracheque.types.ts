export type ContrachequeRubrica = {
  codigo: number;
  sequencial: number;
  tipo: string;
  descricao: string;
  prazo: string | null;
  valor: number;
  anoReferencia: number | null;
  mesReferencia: number | null;
};

export type ContrachequeDados = {
  competencia: string;
  documento: ContrachequeDocumento;
  fonte: "SARH";
  consultadoEm: Date;
  cabecalho: {
    chaveFolha: Date;
    descricao: string;
    codiserv: string;
    nome: string;
    cpf: string | null;
    cargo: string | null;
    funcao: string | null;
    lotacao: string | null;
    orgao: string | null;
    exercicio: Date | null;
    referencia: string | null;
    anuenio: number | null;
    dependentesSalarioFamilia: number | null;
    dependentesIr: number | null;
    banco: number | null;
    agencia: string | null;
    conta: string | null;
    tipoServidor: string | null;
  };
  margemConsignavel: number | null;
  rubricas: ContrachequeRubrica[];
  totais: {
    bruto: number;
    descontos: number;
    liquido: number;
  };
};

export type ContrachequeCompetencia = {
  competencia: string;
  data: Date;
  descricao: string;
};

export type ContrachequeDocumento = {
  id: string;
  competencia: string;
  chaveFolha: Date;
  sequdepe: number;
  sequpa: number;
  descricao: string;
};
