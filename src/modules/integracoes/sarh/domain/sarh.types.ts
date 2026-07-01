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
  nomeSocial?: string | null;
  ativo: boolean;
  cpf?: string | number | null;
  dataNascimento?: string | null;
  cpfServidor?: {
    cpf?: string | number | null;
    dados?: {
      cpf?: string | number | null;
      dataNascimento?: string | null;
    } | null;
  } | null;

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
  codigoFuncionario?: number | null;
  codigoProvimento?: number | null;
  descricaoProvimento?: string | null;
  codigoSituacao?: number | null;
  descricaoSituacao?: string | null;
  perfilTipo?: string | null;
  funcaoAtualGrupo?: string | null;
  funcaoAtualCategoria?: string | null;
  funcaoAtualCodigo?: string | null;
  funcaoAtualDescricao?: string | null;
  funcaoAtualSituacao?: string | null;
  funcaoAtualInicio?: string | null;
};

export type SarhLotacaoServidorDto = {
  matricula: string;
  lotacaoId: number | null;
  cargoId: number | null;
  lotacao: SarhLotacaoDto | null;
  cargo: SarhCargoDto | null;
};

export type SarhTipoAfastamentoDto = {
  codigo: number;
  descricao: string;
  categoria: string;
  remunerada: string | boolean | null;
  servidor: string | boolean | null;
  juiz: string | boolean | null;
  dataInicioVigencia: string | null;
  dataFimVigencia: string | null;
};

export type SarhAfastamentoDto = {
  id: string;
  categoria: string;
  tipoCodigo: number | string | null;
  tipoDescricao: string | null;
  matricula: string | null;
  cpf: number | string | null;
  nome: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  dias: number | null;
  exercicio: number | null;
  processo: string | null;
  observacao: string | null;
  origemTabela: string;
};

export type SarhChefiaDto = {
  idFuncaoLotacao: number;
  lotacaoId: number;
  lotacaoSigla: string | null;
  lotacaoDescricao: string | null;
  funcaoDescricao: string | null;
  funcaoCategoria: string | null;
  funcaoCodigo: string | null;
  matricula: string | null;
  nome: string | null;
  situacao: string | null;
  dataInicio: string | null;
  flagOcupado: string | boolean | null;
  flagAtiva: string | boolean | null;
};

export type SarhPayloadCompleto = {
  empresas: SarhEmpresaDto[];
  lotacoes: SarhLotacaoDto[];
  cargos: SarhCargoDto[];
  servidores: SarhServidorDto[];
  lotacoesServidores: SarhLotacaoServidorDto[];
  tiposAfastamento: SarhTipoAfastamentoDto[];
  afastamentos: SarhAfastamentoDto[];
  chefias: SarhChefiaDto[];
};

export type SarhEndpointKey =
  | "empresas"
  | "lotacoes"
  | "cargos"
  | "servidores"
  | "lotacoesServidores"
  | "tiposAfastamento"
  | "afastamentos"
  | "chefias";

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
  | "LOTACOES_SERVIDORES"
  | "TIPOS_AFASTAMENTO"
  | "AFASTAMENTOS"
  | "CHEFIAS";

export type TipoRegistroSarhDb =
  | "EMPRESA"
  | "LOTACAO"
  | "CARGO"
  | "SERVIDOR"
  | "LOTACAO_SERVIDOR"
  | "TIPO_AFASTAMENTO"
  | "AFASTAMENTO"
  | "CHEFIA";

export type OperacaoRegistroSarhDb =
  "CRIAR" | "ATUALIZAR" | "INATIVAR" | "IGNORAR" | "CONFLITO" | "ERRO";

export type StatusRegistroIntegracaoSarhDb =
  "PENDENTE" | "PROCESSADO" | "IGNORADO" | "ERRO" | "CONFLITO";

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

export type SarhSyncProgress = {
  execucaoId?: string;
  percentualGeral: number;
  percentualEndpoint: number;
  endpointAtual: SarhEndpointKey | null;
  endpointIndice: number;
  totalEndpoints: number;
  etapa: string;
  status: "AGENDADA" | "EM_EXECUCAO" | "CONCLUIDA" | "FALHOU";
  contadores: {
    totalRecebidos: number;
    totalCriados: number;
    totalAtualizados: number;
    totalInativados: number;
    totalIgnorados: number;
    totalErros: number;
    totalConflitos: number;
  };
};
