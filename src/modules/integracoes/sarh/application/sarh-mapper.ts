import type { SarhCargoDto, SarhLotacaoDto, SarhServidorDto, SarhUnidadeBaseDto } from "../domain/sarh.types";
import {
  limparTexto,
  mapearTipoUnidadeSarhParaSecp,
  normalizarCodigoLotacaoPaiServidor,
  normalizarCodigoLotacaoServidor,
  normalizarCpf,
  normalizarDataSarh,
  normalizarMatricula,
} from "../domain/sarh-normalizer";

export function mapearCargoSarh(payload: SarhCargoDto) {
  return {
    codigoExternoSarh: payload.id,
    descricao: limparTexto(payload.cargoDescricao) ?? `Cargo SARH ${payload.id}`,
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

export function mapearUnidadeSarh(payload: SarhLotacaoDto, orgaoId: string, unidadePaiId?: string | null) {
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
  const cpf = normalizarCpf(payload.cpf);
  const nome = limparTexto(payload.nomeSocial) ?? limparTexto(payload.nome) ?? normalizarMatricula(payload.matricula);

  return {
    matricula: normalizarMatricula(payload.matricula),
    cpf,
    nome,
    tipo: "SERVIDOR",
    ativo: payload.ativo,
  };
}

export function mapearServidorSarh(payload: SarhServidorDto, usuarioId: string, orgaoId: string, cargoId?: string | null) {
  return {
    usuarioId,
    orgaoId,
    matricula: normalizarMatricula(payload.matricula),
    cpf: normalizarCpf(payload.cpf),
    nomeFuncional: limparTexto(payload.nomeSocial) ?? limparTexto(payload.nome),
    vinculo: "EFETIVO",
    ativo: payload.ativo,
    cargoId: cargoId ?? null,
    dataNascimento: normalizarDataSarh(payload.dataNascimento),
    nomeCompletoSarh: limparTexto(payload.nome),
    nomeSocialSarh: limparTexto(payload.nomeSocial),
    codigoLotacaoSarh: normalizarCodigoLotacaoServidor(payload),
    codigoLotacaoPaiSarh: normalizarCodigoLotacaoPaiServidor(payload),
    origemSarh: true,
    ultimaSincronizacaoSarh: new Date(),
    payloadSarh: payload,
  };
}
