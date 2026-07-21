import { validarCrc16Kermit } from "./crc16-kermit.service";

export type MarcacaoAfdParseada = {
  cpf: string | null;
  pis: string | null;
  matricula?: string | null;
  dataHora: Date;
  nsr: string;
  equipamentoCodigo?: string | null;
  crc?: string | null;
  crcValido: boolean;
  crcCalculado?: string | null;
  crcInformado?: string | null;
  tipoRegistro: "3";
  linhaOriginal: string;
};

export type TrailerAfdParseado = {
  tipoRegistro: "9";
  quantidadeTipo2: number;
  quantidadeTipo3: number;
  quantidadeTipo4: number;
  quantidadeTipo5: number;
  quantidadeTipo6: number;
  quantidadeTipo7: number;
};

function limparQuebraLinha(valor: string) {
  return valor.replace(/\r?\n/g, "");
}

function somenteDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

function normalizarIdentificadorEquipamento(valor: string | null | undefined) {
  return somenteDigitos(valor ?? "");
}

function normalizarCpfAfd(cpf12: string) {
  const cpf = somenteDigitos(cpf12);

  if (cpf.length === 12 && cpf.startsWith("0")) {
    return cpf.slice(1);
  }

  return cpf;
}

function cpfValido(cpf: string) {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  for (const tamanho of [9, 10]) {
    let soma = 0;

    for (let indice = 0; indice < tamanho; indice += 1) {
      soma += Number(cpf[indice]) * (tamanho + 1 - indice);
    }

    let digito = (soma * 10) % 11;
    if (digito === 10) digito = 0;

    if (digito !== Number(cpf[tamanho])) {
      return false;
    }
  }

  return true;
}

function normalizarPisAfd(identificador12: string) {
  const digitos = somenteDigitos(identificador12);
  const pis = digitos.replace(/^0+/, "") || digitos;

  return pis.length >= 10 && pis.length <= 12 ? pis : null;
}

function parseDataHoraDh(valor: string) {
  const texto = valor.trim();

  const match = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-]\d{4})$/,
  );

  if (!match) {
    return null;
  }

  const [, ano, mes, dia, hora, minuto, segundo, fuso] = match;
  const fusoIso = `${fuso.slice(0, 3)}:${fuso.slice(3, 5)}`;

  const data = new Date(
    `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}${fusoIso}`,
  );

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  return data;
}

export function obterTipoRegistroAfd(linha: string) {
  const original = limparQuebraLinha(linha);

  if (original.length < 10) {
    return null;
  }

  return original.slice(9, 10);
}

export function extrairIdentificadoresEquipamentoAfd(conteudo: string) {
  const candidatos = new Set<string>();
  const linhas = conteudo.split(/\r\n|\n|\r/);

  for (const linha of linhas) {
    const original = limparQuebraLinha(linha);
    const tipoRegistro = obterTipoRegistroAfd(original);

    if (tipoRegistro !== "2") {
      continue;
    }

    const digitos = somenteDigitos(original);

    for (const match of digitos.matchAll(/\d{6,}/g)) {
      candidatos.add(match[0]);
    }
  }

  return Array.from(candidatos);
}

export function conteudoAfdContemIdentificador(
  conteudo: string,
  identificador: string | null | undefined,
) {
  const valor = identificador?.trim();

  if (!valor) {
    return false;
  }

  if (conteudo.toLocaleLowerCase("pt-BR").includes(valor.toLocaleLowerCase("pt-BR"))) {
    return true;
  }

  const normalizado = normalizarIdentificadorEquipamento(valor);

  if (!normalizado) {
    return false;
  }

  return normalizarIdentificadorEquipamento(conteudo).includes(normalizado);
}

export function parseTrailerAfd(linha: string): TrailerAfdParseado | null {
  const original = limparQuebraLinha(linha);

  if (original.length < 64) {
    return null;
  }

  if (original.slice(0, 9) !== "999999999") {
    return null;
  }

  if (original.slice(63, 64) !== "9") {
    return null;
  }

  return {
    tipoRegistro: "9",
    quantidadeTipo2: Number(original.slice(9, 18)),
    quantidadeTipo3: Number(original.slice(18, 27)),
    quantidadeTipo4: Number(original.slice(27, 36)),
    quantidadeTipo5: Number(original.slice(36, 45)),
    quantidadeTipo6: Number(original.slice(45, 54)),
    quantidadeTipo7: Number(original.slice(54, 63)),
  };
}

/**
 * Registro tipo 3 — Marcação de ponto para REP-C e REP-A.
 *
 * 001-009: NSR
 * 010-010: tipo = "3"
 * 011-034: data/hora DH
 * 035-046: CPF do empregado
 * 047-050: CRC-16
 */
export function parseLinhaAfd(linha: string): MarcacaoAfdParseada | null {
  const original = limparQuebraLinha(linha);

  if (!original.trim()) {
    return null;
  }

  if (original.length < 50) {
    return null;
  }

  const nsr = original.slice(0, 9);
  const tipoRegistro = original.slice(9, 10);

  if (tipoRegistro !== "3") {
    return null;
  }

  const linhaSemCrc = original.slice(0, 46);
  const dataHoraTexto = original.slice(10, 34);
  const identificadorTexto = original.slice(34, 46);
  const crc = original.slice(46, 50);

  const dataHora = parseDataHoraDh(dataHoraTexto);
  const cpfCandidato = normalizarCpfAfd(identificadorTexto);
  const cpf = cpfValido(cpfCandidato) ? cpfCandidato : null;
  const pis = cpf ? null : normalizarPisAfd(identificadorTexto);

  if (!dataHora) {
    return null;
  }

  if (!cpf && !pis) {
    return null;
  }

  const crcDiagnostico = validarCrc16Kermit({
    linhaSemCrc,
    crcInformado: crc,
  });

  return {
    cpf,
    pis,
    matricula: null,
    dataHora,
    nsr: nsr.trim(),
    equipamentoCodigo: null,
    crc: crc.trim() || null,
    crcValido: crcDiagnostico.valido,
    crcCalculado: crcDiagnostico.calculado,
    crcInformado: crcDiagnostico.informado,
    tipoRegistro: "3",
    linhaOriginal: linha,
  };
}
