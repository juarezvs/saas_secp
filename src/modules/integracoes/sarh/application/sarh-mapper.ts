import type {
  SarhCargoDto,
  SarhLotacaoDto,
  SarhServidorDto,
  SarhUnidadeBaseDto,
} from "../domain/sarh.types";
import {
  limparTexto,
  mapearTipoUnidadeSarhParaSecp,
  normalizarCodigoLotacaoPaiServidor,
  normalizarCodigoLotacaoServidor,
  normalizarDataSarh,
  normalizarMatricula,
  obterCpfServidorSarh,
  obterDataNascimentoServidorSarh,
  obterPisServidorSarh,
} from "../domain/sarh-normalizer";

export function mapearCargoSarh(payload: SarhCargoDto) {
  return {
    codigoExternoSarh: payload.id,
    descricao:
      limparTexto(payload.cargoDescricao) ?? `Cargo SARH ${payload.id}`,
    ativo: true,
    origemSarh: true,
    payloadSarh: payload,
    ultimaSincronizacaoSarh: new Date(),
  };
}

export function mapearOrgaoSarh(payload: SarhUnidadeBaseDto) {
  const dataFim = normalizarDataSarh(payload.dataFim);

  return {
    sigla: limparTexto(payload.sigla) ?? `SARH-${payload.id}`,
    nome: limparTexto(payload.descricao) ?? `Órgão SARH ${payload.id}`,
    ativo: dataFim === null,
    codigoExternoSarh: payload.id,
    dataInicioSarh: normalizarDataSarh(payload.dataInicio),
    dataFimSarh: dataFim,
    ultimaSincronizacaoSarh: new Date(),
    payloadSarh: payload,
  };
}

export function mapearUnidadeSarh(
  payload: SarhLotacaoDto,
  orgaoId: string,
  unidadePaiId?: string | null,
) {
  const dataFim = normalizarDataSarh(payload.dataFim);
  const sigla = limparTexto(payload.sigla) ?? `SARH-${payload.id}`;

  return {
    orgaoId,
    unidadePaiId: unidadePaiId ?? null,
    codigo: sigla,
    sigla,
    nome: limparTexto(payload.descricao) ?? `Unidade SARH ${payload.id}`,
    tipo: mapearTipoUnidadeSarhParaSecp(payload.tipo?.nome),
    ativo: dataFim === null,
    codigoExternoSarh: payload.id,
    codigoExternoPaiSarh: payload.idPai,
    categoriaSarh: limparTexto(payload.categoria),
    emailSarh: limparTexto(payload.email),
    tipoSarhId: payload.tipo?.id ?? null,
    tipoSarhNome: limparTexto(payload.tipo?.nome),
    dataInicioSarh: normalizarDataSarh(payload.dataInicio),
    dataFimSarh: dataFim,
    origemSarh: true,
    ultimaSincronizacaoSarh: new Date(),
    payloadSarh: payload,
  };
}

export function mapearUsuarioServidorSarh(payload: SarhServidorDto) {
  const cpf = obterCpfServidorSarh(payload);
  const matricula = normalizarMatricula(payload.matricula);
  const nome =
    limparTexto(payload.nomeSocial) ??
    limparTexto(payload.nome) ??
    matricula;

  return {
    matricula,
    cpf,
    nome,
    tipo: mapearTipoPessoaPontoPorMatricula(matricula),
    ativo: payload.ativo,
  };
}

function mapearTipoPessoaPontoPorMatricula(
  matricula: string,
): "SERVIDOR" | "ESTAGIARIO" | "PRESTADOR" | "VOLUNTARIO" {
  const normalizada = matricula.trim().toUpperCase();

  if (normalizada.endsWith("ES")) return "ESTAGIARIO";
  if (normalizada.endsWith("VO")) return "VOLUNTARIO";
  if (normalizada.endsWith("PS")) return "PRESTADOR";

  return "SERVIDOR";
}

function mapearVinculoServidorSarh(payload: SarhServidorDto) {
  const texto = [
    payload.descricaoProvimento,
    payload.descricaoSituacao,
    payload.perfilTipo,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  if (texto.includes("REQUISI")) return "REQUISITADO";
  if (texto.includes("REDISTRIBUI")) return "REDISTRIBUIDO";
  if (
    texto.includes("EXERCICIO PROVISORIO") ||
    texto.includes("EXERC PROVISORIO")
  ) {
    return "EXERCICIO_PROVISORIO";
  }
  if (texto.includes("REMOCAO") || texto.includes("REMOVIDO"))
    return "REMOVIDO";
  if (texto.includes("CEDIDO")) return "CEDIDO";

  return "EFETIVO";
}

export function mapearServidorSarh(
  payload: SarhServidorDto,
  usuarioId: string,
  orgaoId: string,
  cargoId?: string | null,
) {
  return {
    usuarioId,
    orgaoId,
    matricula: normalizarMatricula(payload.matricula),
    cpf: obterCpfServidorSarh(payload),
    pis: obterPisServidorSarh(payload),
    nomeFuncional: limparTexto(payload.nomeSocial) ?? limparTexto(payload.nome),
    vinculo: mapearVinculoServidorSarh(payload),
    ativo: payload.ativo,
    cargoId: cargoId ?? null,
    dataNascimento: obterDataNascimentoServidorSarh(payload),
    nomeCompletoSarh: limparTexto(payload.nome),
    nomeSocialSarh: limparTexto(payload.nomeSocial),
    codigoLotacaoSarh: normalizarCodigoLotacaoServidor(payload),
    codigoLotacaoPaiSarh: normalizarCodigoLotacaoPaiServidor(payload),
    codigoFuncionarioSarh: payload.codigoFuncionario ?? null,
    codigoProvimentoSarh: payload.codigoProvimento ?? null,
    descricaoProvimentoSarh: limparTexto(payload.descricaoProvimento),
    codigoSituacaoSarh: payload.codigoSituacao ?? null,
    descricaoSituacaoSarh: limparTexto(payload.descricaoSituacao),
    perfilTipoSarh: limparTexto(payload.perfilTipo),
    funcaoAtualGrupoSarh: limparTexto(payload.funcaoAtualGrupo),
    funcaoAtualCategoriaSarh: limparTexto(payload.funcaoAtualCategoria),
    funcaoAtualCodigoSarh: limparTexto(payload.funcaoAtualCodigo),
    funcaoAtualDescricao: limparTexto(payload.funcaoAtualDescricao),
    funcaoAtualSituacaoSarh: limparTexto(payload.funcaoAtualSituacao),
    funcaoAtualInicioSarh: normalizarDataSarh(payload.funcaoAtualInicio),
    origemSarh: true,
    ultimaSincronizacaoSarh: new Date(),
    payloadSarh: payload,
  };
}
