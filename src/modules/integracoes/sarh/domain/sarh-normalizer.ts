import { createHash } from "node:crypto";
import type {
  SarhCargoDto,
  SarhAfastamentoDto,
  SarhCalendarioDto,
  SarhChefiaDto,
  SarhEmpresaDto,
  SarhEndpointKey,
  SarhLotacaoDto,
  SarhLotacaoServidorDto,
  SarhServidorDto,
  SarhTipoAfastamentoDto,
  TipoEndpointSarhDb,
  TipoRegistroSarhDb,
} from "./sarh.types";

export function limparTexto(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim().replace(/\s+/g, " ");
  return texto.length > 0 ? texto : null;
}

export function normalizarMatricula(matricula: string): string {
  return limparTexto(matricula)?.toUpperCase() ?? "";
}

export function normalizarCpf(
  cpf: string | number | null | undefined,
): string | null {
  if (cpf === null || cpf === undefined) return null;
  const somenteDigitos = String(cpf).replace(/\D/g, "");
  if (!somenteDigitos) return null;
  const normalizado = somenteDigitos.padStart(11, "0").slice(-11);
  if (/^(\d)\1{10}$/.test(normalizado)) return null;
  return normalizado;
}

export function normalizarPis(
  pis: string | number | null | undefined,
): string | null {
  if (pis === null || pis === undefined) return null;
  const somenteDigitos = String(pis).replace(/\D/g, "");
  if (!somenteDigitos) return null;
  const normalizado =
    somenteDigitos.length === 12 && somenteDigitos.startsWith("0")
      ? somenteDigitos.slice(1)
      : somenteDigitos.length <= 11
        ? somenteDigitos.padStart(11, "0")
        : somenteDigitos;

  if (normalizado.length < 11 || normalizado.length > 12) return null;
  if (/^(\d)\1+$/.test(normalizado)) return null;

  return normalizado;
}

export function obterCpfServidorSarh(payload: SarhServidorDto): string | null {
  return normalizarCpf(
    payload.cpf ?? payload.cpfServidor?.cpf ?? payload.cpfServidor?.dados?.cpf,
  );
}

export function obterPisServidorSarh(payload: SarhServidorDto): string | null {
  return normalizarPis(
    payload.pis ??
      payload.pasep ??
      payload.pisPasep ??
      payload.numeroPis ??
      payload.nit,
  );
}

export function obterDataNascimentoServidorSarh(
  payload: SarhServidorDto,
): Date | null {
  return normalizarDataSarh(
    payload.dataNascimento ?? payload.cpfServidor?.dados?.dataNascimento,
  );
}

export function normalizarDataSarh(
  data: string | null | undefined,
): Date | null {
  if (!data) return null;
  const date = new Date(data);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizarCodigoLotacaoServidor(
  payload: SarhServidorDto,
): number | null {
  return payload.locatacaoId ?? payload.lotacaoId ?? null;
}

export function normalizarCodigoLotacaoPaiServidor(
  payload: SarhServidorDto,
): number | null {
  return payload.locatacaoPai ?? payload.lotacaoPai ?? null;
}

export function gerarHashRegistro(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(ordenarObjeto(payload)))
    .digest("hex");
}

function ordenarObjeto(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenarObjeto);
  if (valor && typeof valor === "object") {
    return Object.keys(valor as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, chave) => {
        acc[chave] = ordenarObjeto((valor as Record<string, unknown>)[chave]);
        return acc;
      }, {});
  }
  return valor;
}

export function endpointDbFromKey(
  endpoint: SarhEndpointKey,
): TipoEndpointSarhDb {
  const mapa: Record<SarhEndpointKey, TipoEndpointSarhDb> = {
    empresas: "EMPRESAS",
    lotacoes: "LOTACOES",
    cargos: "CARGOS",
    servidores: "SERVIDORES",
    estagiarios: "SERVIDORES",
    prestadores: "SERVIDORES",
    voluntarios: "SERVIDORES",
    lotacoesServidores: "LOTACOES_SERVIDORES",
    tiposAfastamento: "TIPOS_AFASTAMENTO",
    afastamentos: "AFASTAMENTOS",
    ferias: "AFASTAMENTOS",
    chefias: "CHEFIAS",
    substituicoes: "SUBSTITUICOES",
    calendarios: "CALENDARIOS",
  };
  return mapa[endpoint];
}

export function tipoRegistroDbFromEndpoint(
  endpoint: SarhEndpointKey,
): TipoRegistroSarhDb {
  const mapa: Record<SarhEndpointKey, TipoRegistroSarhDb> = {
    empresas: "EMPRESA",
    lotacoes: "LOTACAO",
    cargos: "CARGO",
    servidores: "SERVIDOR",
    estagiarios: "SERVIDOR",
    prestadores: "SERVIDOR",
    voluntarios: "SERVIDOR",
    lotacoesServidores: "LOTACAO_SERVIDOR",
    tiposAfastamento: "TIPO_AFASTAMENTO",
    afastamentos: "AFASTAMENTO",
    ferias: "AFASTAMENTO",
    chefias: "CHEFIA",
    substituicoes: "SUBSTITUICAO",
    calendarios: "CALENDARIO",
  };
  return mapa[endpoint];
}

export function obterChaveExterna(
  endpoint: SarhEndpointKey,
  payload: unknown,
): string {
  if (
    endpoint === "servidores" ||
    endpoint === "estagiarios" ||
    endpoint === "prestadores" ||
    endpoint === "voluntarios"
  ) {
    return normalizarMatricula((payload as SarhServidorDto).matricula);
  }

  if (endpoint === "lotacoesServidores") {
    const item = payload as SarhLotacaoServidorDto;
    return `${normalizarMatricula(item.matricula)}:${item.lotacaoId ?? "sem-lotacao"}`;
  }

  if (endpoint === "cargos") {
    return String((payload as SarhCargoDto).id);
  }

  if (endpoint === "tiposAfastamento") {
    return String((payload as SarhTipoAfastamentoDto).codigo);
  }

  if (endpoint === "afastamentos" || endpoint === "ferias") {
    return String((payload as SarhAfastamentoDto).id);
  }

  if (endpoint === "chefias") {
    const chefia = payload as SarhChefiaDto;
    return `${chefia.lotacaoId}:${chefia.idFuncaoLotacao}`;
  }

  if (endpoint === "calendarios") {
    return String((payload as SarhCalendarioDto).id);
  }

  return String((payload as SarhEmpresaDto | SarhLotacaoDto).id);
}

export function isLotacaoServidorDesligado(
  payload: SarhLotacaoServidorDto,
): boolean {
  const descricao =
    limparTexto(payload.lotacao?.descricao)?.toUpperCase() ?? "";
  const sigla = limparTexto(payload.lotacao?.sigla)?.toUpperCase() ?? "";
  const tipo = limparTexto(payload.lotacao?.tipo?.nome)?.toUpperCase() ?? "";

  return (
    descricao.includes("SERVIDOR DESLIGADO") ||
    sigla === "SERDE" ||
    tipo.includes("SERVIDOR OUT")
  );
}

export function mapearTipoUnidadeSarhParaSecp(
  tipoNome: string | null | undefined,
): string {
  const tipo = limparTexto(tipoNome)?.toUpperCase() ?? "";

  if (tipo.includes("SEÇÃO JUDICI")) return "SECAO_JUDICIARIA";
  if (tipo.includes("SUBSE")) return "SUBSECAO_JUDICIARIA";
  if (tipo.includes("UNIDADE AVAN")) return "UNIDADE_AVANCADA_ATENDIMENTO";
  if (tipo.includes("NÚCLEO") || tipo.includes("NUCLEO")) return "NUCLEO";
  if (tipo.includes("SEÇÃO") || tipo.includes("SECAO")) return "SECAO";
  if (tipo.includes("SECRETARIA")) return "SECRETARIA";
  if (tipo.includes("VARA")) return "VARA";
  if (tipo.includes("GABINETE")) return "GABINETE";
  if (tipo.includes("TURMA")) return "TURMA_RECURSAL";
  if (tipo.includes("CONCILIA")) return "CENTRO_CONCILIACAO";
  if (tipo.includes("DEPARTAMENTO")) return "DEPARTAMENTO";
  if (tipo.includes("SUBDEPARTAMENTO")) return "SUBDEPARTAMENTO";

  return "OUTRA";
}
