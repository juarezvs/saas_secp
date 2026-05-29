export type SarhTipoDto = {
  id: number;
  nome: string;
};

export type SarhUnidadeBaseDto = {
  id: number;
  idPai: number | null;
  descricao: string;
  sigla: string | null;
  categoria: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  email: string | null;
  tipo: SarhTipoDto | null;
};

export type SarhEmpresaDto = SarhUnidadeBaseDto;
export type SarhLotacaoDto = SarhUnidadeBaseDto;

export type SarhCargoDto = {
  id: number;
  cargoDescricao: string;
};

export type SarhServidorDto = {
  matricula: string;
  nome: string;
  nomeSocial: string | null;
  ativo: boolean;
  cpf: string | number | null;
  dataNascimento: string | null;

  /** O SARH retorna este campo com esta grafia no payload atual. */
  locatacaoId?: number | null;

  /** Mantido para tolerância caso a API seja corrigida no futuro. */
  lotacaoId?: number | null;

  locatacaoPai?: number | null;
  lotacaoPai?: number | null;
  lotacaoDescricao: string | null;
  lotacaoSigla: string | null;
  lotacaoTipo: string | null;
  cargoId: number | null;
  cargoDescricao: string | null;
};

export type SarhLotacaoServidorDto = {
  matricula: string;
  lotacaoId: number | null;
  cargoId: number | null;
  lotacao: SarhLotacaoDto | null;
  cargo: SarhCargoDto | null;
};

export type SarhPayloadCompleto = {
  empresas: SarhEmpresaDto[];
  lotacoes: SarhLotacaoDto[];
  cargos: SarhCargoDto[];
  servidores: SarhServidorDto[];
  lotacoesServidores: SarhLotacaoServidorDto[];
};

export type SarhEndpointKey =
  | "empresas"
  | "lotacoes"
  | "cargos"
  | "servidores"
  | "lotacoesServidores";

export type TipoExecucaoSarh =
  | "CARGA_INICIAL"
  | "SINCRONIZACAO_COMPLETA"
  | "SINCRONIZACAO_INCREMENTAL"
  | "REPROCESSAMENTO"
  | "SIMULACAO";

export type TipoEndpointSarhDb =
  | "EMPRESAS"
  | "LOTACOES"
  | "CARGOS"
  | "SERVIDORES"
  | "LOTACOES_SERVIDORES";

export type TipoRegistroSarhDb =
  | "EMPRESA"
  | "LOTACAO"
  | "CARGO"
  | "SERVIDOR"
  | "LOTACAO_SERVIDOR";

export type OperacaoRegistroSarhDb =
  | "CRIAR"
  | "ATUALIZAR"
  | "INATIVAR"
  | "IGNORAR"
  | "CONFLITO"
  | "ERRO";

export type StatusRegistroIntegracaoSarhDb =
  | "PENDENTE"
  | "PROCESSADO"
  | "IGNORADO"
  | "ERRO"
  | "CONFLITO";

export type ResultadoItemSarh = {
  tipoRegistro: TipoRegistroSarhDb;
  chaveExterna: string;
  operacao: OperacaoRegistroSarhDb;
  status: StatusRegistroIntegracaoSarhDb;
  entidadeInterna?: string;
  entidadeInternaId?: string;
  mensagem?: string;
  erro?: string;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  metadados?: Record<string, unknown>;
};

export type SarhResumoExecucao = {
  execucaoId: string;
  modoSimulacao: boolean;
  totalRecebidos: number;
  totalCriados: number;
  totalAtualizados: number;
  totalInativados: number;
  totalIgnorados: number;
  totalErros: number;
  totalConflitos: number;
  iniciadoEm: Date;
  finalizadoEm: Date;
  duracaoMs: number;
};
