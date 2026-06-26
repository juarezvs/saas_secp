import crypto from "node:crypto";
import net from "node:net";
import { parseLinhaAfd } from "@/modules/afd/application/services/parse-afd.service";
import type {
  BiometriaServidorRelogioPonto,
  CadastroBiometricoEquipamento,
  DadosConexaoRelogioPonto,
  MarcacaoRelogioPonto,
  RelogioPontoProvider,
  ResultadoColetaRelogioPonto,
  ResultadoEnvioBiometriaRelogioPonto,
  ResultadoSaudeRelogioPonto,
} from "@/modules/integracoes/domain/relogio-ponto.types";

type RespostaHenry = {
  indice: string;
  comando: string;
  status: string;
  dados: string;
  bruto: Buffer;
};

type ConfigHenry = {
  usuario?: unknown;
  senha?: unknown;
  timeoutMs?: unknown;
  comunicacaoCriptografada?: unknown;
};

const START_BYTE = 0x02;
const END_BYTE = 0x03;
const STATUS_OK = new Set(["00", "000", "01", "001", "07"]);

const STATUS_HENRY: Record<string, string> = {
  "00": "Comando executado com sucesso.",
  "01": "Nao ha dados.",
  "07": "Autenticou.",
  "09": "Nao esta autenticado.",
  "10": "Comando desconhecido.",
  "13": "Erro de checksum.",
  "17": "Relogio Henry ocupado ou comunicacao recusada temporariamente.",
  "22": "Usuario nao cadastrado.",
  "25": "Equipamento nao possui biometria.",
  "28": "Equipamento nao possui eventos.",
  "29": "Erro na manipulacao de biometrias.",
  "111": "NSR invalido.",
  "113": "Nao encontrou registro com NSR informado.",
  "114": "Nao ha registros posteriores a data informada.",
};

function somenteDigitos(valor: string | null | undefined) {
  return (valor ?? "").replace(/\D/g, "");
}

function normalizarStatus(status: string) {
  const limpo = status.replace(/^0+(?=\d)/, "");
  if (!limpo) return "00";
  return limpo.padStart(Math.min(status.length, 2), "0");
}

function mensagemStatusHenry(status: string) {
  return STATUS_HENRY[status] ?? STATUS_HENRY[normalizarStatus(status)] ?? `Status Henry ${status}.`;
}

function statusHenryOk(status: string) {
  return STATUS_OK.has(status) || STATUS_OK.has(normalizarStatus(status));
}

function xorChecksum(buffer: Buffer) {
  let checksum = 0;

  for (const byte of buffer) {
    checksum ^= byte;
  }

  return checksum;
}

function montarPacote(payload: string | Buffer) {
  const payloadBuffer = Buffer.isBuffer(payload)
    ? payload
    : Buffer.from(payload, "latin1");
  const tamanho = Buffer.alloc(2);
  tamanho.writeUInt16LE(payloadBuffer.length, 0);
  const checksum = xorChecksum(Buffer.concat([tamanho, payloadBuffer]));

  return Buffer.concat([
    Buffer.from([START_BYTE]),
    tamanho,
    payloadBuffer,
    Buffer.from([checksum, END_BYTE]),
  ]);
}

function removerZeroPadding(texto: string) {
  return texto.replace(/\0+$/g, "");
}

function aplicarZeroPadding(buffer: Buffer) {
  const resto = buffer.length % 16;
  return resto === 0 ? buffer : Buffer.concat([buffer, Buffer.alloc(16 - resto)]);
}

function criptografarPayloadHenry(aesKey: Buffer, payload: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-128-cbc", aesKey, iv);
  cipher.setAutoPadding(false);

  const criptografado = Buffer.concat([
    cipher.update(aplicarZeroPadding(Buffer.from(payload, "latin1"))),
    cipher.final(),
  ]);

  return Buffer.concat([iv, criptografado]);
}

function descriptografarPayloadHenry(aesKey: Buffer, payload: Buffer) {
  const iv = payload.subarray(0, 16);
  const dados = payload.subarray(16);
  const decipher = crypto.createDecipheriv("aes-128-cbc", aesKey, iv);
  decipher.setAutoPadding(false);

  return Buffer.concat([decipher.update(dados), decipher.final()]);
}

function parsePacote(buffer: Buffer, aesKey?: Buffer | null): RespostaHenry {
  if (buffer[0] !== START_BYTE || buffer[buffer.length - 1] !== END_BYTE) {
    throw new Error("Pacote Henry invalido: delimitadores ausentes.");
  }

  const tamanho = buffer.readUInt16LE(1);
  const payload = buffer.subarray(3, 3 + tamanho);
  const checksumRecebido = buffer[3 + tamanho];
  const checksumCalculado = xorChecksum(buffer.subarray(1, 3 + tamanho));

  if (checksumRecebido !== checksumCalculado) {
    throw new Error("Pacote Henry invalido: checksum divergente.");
  }

  const payloadTexto = aesKey ? descriptografarPayloadHenry(aesKey, payload) : payload;
  const texto = removerZeroPadding(payloadTexto.toString("latin1"));
  const [indice = "", comando = "", status = "", ...restante] = texto.split("+");

  return {
    indice,
    comando,
    status,
    dados: restante.join("+"),
    bruto: buffer,
  };
}

function bufferRespostaCompleta(buffer: Buffer) {
  if (buffer.length < 6 || buffer[0] !== START_BYTE) {
    return false;
  }

  const tamanho = buffer.readUInt16LE(1);
  return buffer.length >= tamanho + 5 && buffer[tamanho + 4] === END_BYTE;
}

function base64Url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function criarChavePublicaRsa(modulusBase64: string, exponentBase64: string) {
  return crypto.createPublicKey({
    key: {
      kty: "RSA",
      n: base64Url(Buffer.from(modulusBase64, "base64")),
      e: base64Url(Buffer.from(exponentBase64, "base64")),
    },
    format: "jwk",
  });
}

function parseNumeroResposta(dados: string) {
  const numero = Number(String(dados).split("]").at(-1));
  return Number.isFinite(numero) ? numero : null;
}

function parseDataHoraHenry(texto: string) {
  const iso = texto.match(
    /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-]\d{4})/,
  );

  if (iso) {
    const [, ano, mes, dia, hora, minuto, segundo, fuso] = iso;
    const fusoIso = `${fuso.slice(0, 3)}:${fuso.slice(3, 5)}`;
    const data = new Date(
      `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}${fusoIso}`,
    );

    return Number.isNaN(data.getTime()) ? null : data;
  }

  const dh = texto.match(
    /(\d{2})\/(\d{2})\/(\d{2,4})\s+(\d{2}):(\d{2}):(\d{2})/,
  );

  if (!dh) return null;

  const [, dia, mes, anoTexto, hora, minuto, segundo] = dh;
  const ano = anoTexto.length === 2 ? 2000 + Number(anoTexto) : Number(anoTexto);
  const data = new Date(
    ano,
    Number(mes) - 1,
    Number(dia),
    Number(hora),
    Number(minuto),
    Number(segundo),
  );

  return Number.isNaN(data.getTime()) ? null : data;
}

function normalizarIdentificacaoHenry(valor: string | null | undefined) {
  const digitos = somenteDigitos(valor);

  if (digitos.length === 12 && digitos.startsWith("0")) {
    return { cpf: digitos.slice(1), matricula: null };
  }

  if (digitos.length === 11) {
    return { cpf: digitos, matricula: null };
  }

  return digitos ? { cpf: null, matricula: digitos } : { cpf: null, matricula: null };
}

function extrairIdentificacaoRegistroHenry(linha: string) {
  const tipoRegistro = linha.slice(9, 10);
  const matriculaExplicita =
    linha.match(/\bmat(?:ricula)?[:=\[]?(\d{1,20})\b/i)?.[1] ?? null;

  if (matriculaExplicita) {
    return { cpf: null, matricula: matriculaExplicita };
  }

  if (tipoRegistro === "4" && linha.length >= 70) {
    return normalizarIdentificacaoHenry(linha.slice(58, 70));
  }

  return { cpf: null, matricula: null };
}

function parseRegistroHenry(linha: string): MarcacaoRelogioPonto | null {
  const afd = parseLinhaAfd(linha);

  if (afd) {
    return {
      nsr: afd.nsr,
      cpf: afd.cpf,
      dataHora: afd.dataHora,
      codigoExterno: afd.nsr,
      linhaOriginal: linha,
      payload: afd,
    };
  }

  const nsr = linha.match(/^\D*(\d{1,9})/)?.[1] ?? null;
  const { cpf, matricula } = extrairIdentificacaoRegistroHenry(linha);
  const dataHora = parseDataHoraHenry(linha);

  if (!dataHora) {
    return null;
  }

  return {
    nsr,
    cpf,
    matricula,
    dataHora,
    codigoExterno: nsr ?? undefined,
    linhaOriginal: linha,
    payload: { linha, tipoRegistroHenry: linha.slice(9, 10) || null },
  };
}

function parseMarcacoesColetadas(dados: string) {
  const separadorQuantidade = dados.indexOf("]");
  const quantidadeLida =
    separadorQuantidade >= 0 ? Number(dados.slice(0, separadorQuantidade)) : null;
  const textoRegistros =
    separadorQuantidade >= 0 ? dados.slice(separadorQuantidade + 1) : dados;

  const linhas = textoRegistros
    .split(/\r\n|\n|\r|}(?=\d)/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  const marcacoes = linhas
    .map(parseRegistroHenry)
    .filter((item): item is MarcacaoRelogioPonto => Boolean(item));

  const nsrs = linhas
    .map((linha) => Number(linha.match(/^\D*(\d{1,9})/)?.[1]))
    .filter((nsr) => Number.isFinite(nsr));
  const maiorNsr = nsrs.length > 0 ? Math.max(...nsrs) : null;

  return {
    quantidadeLida,
    linhasRecebidas: linhas.length,
    marcacoes,
    proximoNsr: maiorNsr === null ? null : String(maiorNsr + 1),
  };
}

function separarQuantidadeRegistrosHenry(dados: string) {
  const inicio = dados.match(/^(\d+)[+\]](.+)$/);

  return {
    quantidade: inicio ? Number(inicio[1]) : null,
    registrosTexto: inicio ? inicio[2] : dados,
  };
}

function parseUsuarioHenry(registro: string): CadastroBiometricoEquipamento | null {
  const campos = registro.split("[");

  if (campos.length < 2) {
    return null;
  }

  const [
    operacaoOuIndice,
    indiceOuNome,
    nomeOuReservado,
    ,
    qtdReferencias,
    cartoesTexto,
  ] = campos;
  const operacoes = new Set(["I", "A", "E", "L"]);
  const matricula = operacoes.has(operacaoOuIndice)
    ? indiceOuNome
    : operacaoOuIndice;
  const nome = operacoes.has(operacaoOuIndice) ? nomeOuReservado : indiceOuNome;
  const cartoes = String(cartoesTexto ?? "")
    .split("}")
    .map((cartao) => cartao.trim())
    .filter(Boolean);

  if (!matricula) {
    return null;
  }

  const { cpf } = normalizarIdentificacaoHenry(matricula);

  return {
    codigo: matricula,
    cpf,
    matricula,
    nome: nome || null,
    cartoes,
    payload: {
      registro,
      qtdReferencias: qtdReferencias || null,
    },
  };
}

function parseUsuariosHenry(dados: string) {
  const { quantidade, registrosTexto } = separarQuantidadeRegistrosHenry(dados);
  const registros = registrosTexto
    .split(/\](?=[IAE]\[|\d+\[)/)
    .map((registro) => registro.trim())
    .filter(Boolean);
  const cadastros = registros
    .map(parseUsuarioHenry)
    .filter((cadastro): cadastro is CadastroBiometricoEquipamento =>
      Boolean(cadastro),
    );

  return {
    quantidade,
    registrosLidos: registros.length,
    cadastros,
  };
}

function parseListaBiometriasHenry(dados: string) {
  const { registrosTexto } = separarQuantidadeRegistrosHenry(dados);

  return registrosTexto
    .split(/[}\]\[]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => /^\d+$/.test(item));
}

function parseTemplatesBiometriaHenry(dados: string) {
  const [, corpo = dados] = dados.split("]");
  const [matricula, restante = ""] = corpo.split("}");
  const partes = restante.split("{").filter(Boolean);
  const templates: NonNullable<CadastroBiometricoEquipamento["templates"]> = [];

  for (let index = 0; index < partes.length; index += 2) {
    const dedo = partes[index];
    const template = partes[index + 1];

    if (template) {
      templates.push({
        dedo,
        template,
        formato: "HENRY_RAW",
      });
    }
  }

  return {
    matricula: matricula || null,
    templates,
  };
}

function lerConfigHenry(configuracao: unknown): ConfigHenry {
  if (!configuracao || typeof configuracao !== "object") {
    return {};
  }

  return configuracao as ConfigHenry;
}

function valorTexto(valor: unknown) {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function valorNumero(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function isTimeoutHenry(error: unknown) {
  return error instanceof Error && error.message.includes("Tempo limite");
}

function isRespostaRaIncompletaHenry(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("Resposta RA do Henry nao contem chave RSA completa")
  );
}

function aguardar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class HenryProtocoloLinhaAdvClient implements RelogioPontoProvider {
  private socket: net.Socket | null = null;
  private indice = 1;
  private aesKey: Buffer | null = null;
  private autenticado = false;
  private readonly timeoutMs: number;
  private readonly usuario: string;
  private readonly senha: string;

  constructor(private readonly conexao: DadosConexaoRelogioPonto) {
    const config = lerConfigHenry(conexao.configuracao);
    this.timeoutMs =
      conexao.timeoutMs ??
      valorNumero(config.timeoutMs) ??
      Number(process.env.HENRY_TIMEOUT_MS ?? 10000);
    this.usuario =
      conexao.usuario ??
      valorTexto(config.usuario) ??
      process.env.HENRY_USUARIO ??
      "rep";
    this.senha =
      conexao.senha ??
      valorTexto(config.senha) ??
      process.env.HENRY_SENHA ??
      "123456";
  }

  private async conectar() {
    if (this.socket && !this.socket.destroyed) {
      return this.socket;
    }

    this.socket = await new Promise<net.Socket>((resolve, reject) => {
      const socket = net.createConnection({
        host: this.conexao.ip,
        port: this.conexao.porta,
        timeout: this.timeoutMs,
      });

      const cleanup = () => {
        socket.off("error", onError);
        socket.off("timeout", onTimeout);
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onTimeout = () => {
        cleanup();
        socket.destroy();
        reject(new Error("Tempo limite ao conectar no relogio Henry."));
      };

      socket.once("connect", () => {
        cleanup();
        socket.setTimeout(0);
        resolve(socket);
      });
      socket.once("error", onError);
      socket.once("timeout", onTimeout);
    });

    return this.socket;
  }

  private async enviarPayload(
    payload: string | Buffer,
    descriptografar = false,
    timeoutMs = this.timeoutMs,
  ) {
    const socket = await this.conectar();
    const pacote = montarPacote(payload);

    return new Promise<RespostaHenry>((resolve, reject) => {
      let recebido = Buffer.alloc(0);
      const timer = setTimeout(() => {
        cleanup();
        socket.destroy();
        if (this.socket === socket) {
          this.socket = null;
        }
        this.autenticado = false;
        this.aesKey = null;
        reject(new Error("Tempo limite aguardando resposta do relogio Henry."));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        socket.off("data", onData);
        socket.off("error", onError);
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const onData = (chunk: Buffer) => {
        recebido = Buffer.concat([recebido, chunk]);
        if (!bufferRespostaCompleta(recebido)) {
          return;
        }

        cleanup();
        try {
          resolve(parsePacote(recebido, descriptografar ? this.aesKey : null));
        } catch (error) {
          reject(error);
        }
      };

      socket.on("data", onData);
      socket.once("error", onError);
      socket.write(pacote);
    });
  }

  private proximoIndice() {
    const atual = String(this.indice).padStart(2, "0").slice(-2);
    this.indice = this.indice >= 99 ? 1 : this.indice + 1;
    return atual;
  }

  private async enviarComando(
    comando: string,
    dados = "",
    autenticar = true,
    timeoutMs = this.timeoutMs,
  ) {
    if (autenticar) {
      await this.autenticar();
    }

    const indice = this.proximoIndice();
    const payload = `${indice}+${comando}+00${dados ? `+${dados}` : ""}`;
    const resposta =
      this.autenticado && this.aesKey
        ? await this.enviarPayload(
            criptografarPayloadHenry(this.aesKey, payload),
            true,
            timeoutMs,
          )
        : await this.enviarPayload(payload, false, timeoutMs);

    if (!statusHenryOk(resposta.status)) {
      throw new Error(mensagemStatusHenry(resposta.status));
    }

    return resposta;
  }

  private async autenticar() {
    if (this.autenticado) {
      return;
    }

    const respostaRa = await this.enviarPayload(`${this.proximoIndice()}+RA+00`);
    if (!statusHenryOk(respostaRa.status)) {
      throw new Error(mensagemStatusHenry(respostaRa.status));
    }

    const [modulusBase64, exponentBase64] = respostaRa.dados.split("]");
    if (!modulusBase64 || !exponentBase64) {
      throw new Error("Resposta RA do Henry nao contem chave RSA completa.");
    }

    this.aesKey = crypto.randomBytes(16);
    const credenciais = `1]${this.usuario}]${this.senha}]${this.aesKey.toString("base64")}`;
    const chavePublica = criarChavePublicaRsa(modulusBase64, exponentBase64);
    const credenciaisCriptografadas = crypto
      .publicEncrypt(
        {
          key: chavePublica,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        Buffer.from(credenciais, "utf8"),
      )
      .toString("base64");

    const respostaEa = await this.enviarPayload(
      `${this.proximoIndice()}+EA+00+${credenciaisCriptografadas}`,
    );

    if (!statusHenryOk(respostaEa.status)) {
      throw new Error(mensagemStatusHenry(respostaEa.status));
    }

    this.autenticado = true;
  }

  async testarConexao(): Promise<ResultadoSaudeRelogioPonto> {
    try {
      const usuarios = await this.enviarComando("RQ", "U")
        .then((resposta) => parseNumeroResposta(resposta.dados))
        .catch(() => null);
      const digitais = await this.enviarComando("RQ", "D")
        .then((resposta) => parseNumeroResposta(resposta.dados))
        .catch(() => null);
      const registros = await this.enviarComando("RQ", "R")
        .then((resposta) => parseNumeroResposta(resposta.dados))
        .catch(() => null);

      return {
        status: "ONLINE",
        mensagem: "Relogio Henry respondeu aos comandos de status.",
        dataHoraConsulta: new Date(),
        quantidadeUsuarios: usuarios,
        quantidadeDigitais: digitais,
        quantidadeRegistros: registros,
      };
    } catch (error) {
      return {
        status: "OFFLINE",
        mensagem:
          error instanceof Error
            ? error.message
            : "Nao foi possivel consultar o relogio Henry.",
        dataHoraConsulta: new Date(),
      };
    } finally {
      this.encerrar();
    }
  }

  async coletarMarcacoesDesdeNsr(params: {
    nsrInicial: string | number;
    quantidade?: number;
  }): Promise<ResultadoColetaRelogioPonto> {
    try {
      const quantidade = Math.min(Math.max(Number(params.quantidade ?? 50), 1), 500);
      const timeoutColetaMs = Math.min(
        Math.max(30000, this.timeoutMs, quantidade * 300),
        90000,
      );
      let resposta: RespostaHenry | null = null;

      for (let tentativa = 1; tentativa <= 2; tentativa += 1) {
        try {
          resposta = await this.enviarComando(
            "RR",
            `N]${quantidade}]${params.nsrInicial}`,
            true,
            timeoutColetaMs,
          );
          break;
        } catch (error) {
          if (isRespostaRaIncompletaHenry(error) && tentativa < 2) {
            this.encerrar();
            await aguardar(750);
            continue;
          }

          if (!isTimeoutHenry(error)) {
            throw error;
          }

          const totalRegistros = await this.enviarComando("RQ", "R")
            .then((respostaStatus) => parseNumeroResposta(respostaStatus.dados))
            .catch(() => null);

          if (totalRegistros === null) {
            throw error;
          }

          return {
            marcacoes: [],
            proximoNsr: String(params.nsrInicial),
            mensagem:
              "Relogio Henry online, mas nao retornou novas marcacoes para o NSR solicitado.",
            payload: {
              quantidadeLida: 0,
              linhasRecebidas: 0,
              totalRegistrosRelogio: totalRegistros,
              timeoutSemDados: true,
            },
          };
        }
      }

      if (!resposta) {
        throw new Error("Nao foi possivel obter resposta do relogio Henry.");
      }

      const resultado = parseMarcacoesColetadas(resposta.dados);

      return {
        marcacoes: resultado.marcacoes,
        proximoNsr: resultado.proximoNsr,
        mensagem: `${resultado.marcacoes.length} marcacao(oes) coletada(s) por NSR.`,
        payload: {
          quantidadeLida: resultado.quantidadeLida,
          linhasRecebidas: resultado.linhasRecebidas,
          resposta: resposta.dados,
        },
      };
    } finally {
      this.encerrar();
    }
  }

  async listarCadastrosBiometricos(params?: {
    indiceInicial?: string | number;
    quantidade?: number;
    incluirTemplates?: boolean;
  }) {
    try {
      const quantidade = Math.min(Math.max(Number(params?.quantidade ?? 25), 1), 500);
      const indiceInicial = params?.indiceInicial ?? 0;
      const timeoutLeituraMs = Math.min(
        Math.max(this.timeoutMs, quantidade * 350),
        120000,
      );
      const respostaUsuarios = await this.enviarComando(
        "RU",
        `${quantidade}]${indiceInicial}`,
        true,
        timeoutLeituraMs,
      );
      const resultadoUsuarios = parseUsuariosHenry(respostaUsuarios.dados);
      let cadastros = resultadoUsuarios.cadastros;
      let matriculasComBiometria: string[] = [];

      if (params?.incluirTemplates) {
        const respostaLista = await this.enviarComando(
          "RD",
          `L]${quantidade}}${indiceInicial}`,
          true,
          timeoutLeituraMs,
        ).catch(() => null);
        matriculasComBiometria = respostaLista
          ? parseListaBiometriasHenry(respostaLista.dados)
          : [];

        const cadastrosPorMatricula = new Map(
          cadastros.map((cadastro) => [cadastro.matricula, cadastro]),
        );
        const matriculasParaLer = Array.from(
          new Set([
            ...cadastros.map((cadastro) => cadastro.matricula),
            ...matriculasComBiometria,
          ]),
        );

        for (const matricula of matriculasParaLer) {
          const respostaTemplate = await this.enviarComando(
            "RD",
            `D]${matricula}`,
            true,
            this.timeoutMs,
          ).catch(() => null);

          if (!respostaTemplate) {
            continue;
          }

          const biometria = parseTemplatesBiometriaHenry(respostaTemplate.dados);
          const matriculaCadastro = biometria.matricula ?? matricula;
          const existente = cadastrosPorMatricula.get(matriculaCadastro) ??
            cadastrosPorMatricula.get(matricula);

          cadastrosPorMatricula.set(matriculaCadastro, {
            codigo: existente?.codigo ?? matriculaCadastro,
            cpf: existente?.cpf ?? null,
            matricula: matriculaCadastro,
            nome: existente?.nome ?? null,
            cartoes: existente?.cartoes ?? [],
            templates: biometria.templates,
            payload: existente?.payload,
          });
        }

        cadastros = Array.from(cadastrosPorMatricula.values());
      }

      return {
        cadastros,
        mensagem: `${cadastros.length} cadastro(s) lido(s) do relogio Henry.`,
        payload: {
          protocolo: "HENRY_LINHA_ADV",
          quantidadeSolicitada: quantidade,
          indiceInicial,
          quantidadeInformada: resultadoUsuarios.quantidade,
          registrosLidos: resultadoUsuarios.registrosLidos,
          matriculasComBiometria,
        },
      };
    } finally {
      this.encerrar();
    }
  }

  async enviarBiometrias(
    servidores: BiometriaServidorRelogioPonto[],
  ): Promise<ResultadoEnvioBiometriaRelogioPonto> {
    let enviados = 0;
    let rejeitados = 0;
    const detalhes: Array<{ matricula: string; status: string; mensagem: string }> = [];

    try {
      for (const servidor of servidores) {
        if (servidor.templates.length === 0) {
          rejeitados += 1;
          detalhes.push({
            matricula: servidor.matricula,
            status: "IGNORADO",
            mensagem: "Servidor sem template biometrico compativel com Henry.",
          });
          continue;
        }

        const payload = montarPayloadBiometriaHenry(servidor);
        const resposta = await this.enviarComando("ED", payload);
        enviados += 1;
        detalhes.push({
          matricula: servidor.matricula,
          status: resposta.status,
          mensagem: mensagemStatusHenry(resposta.status),
        });
      }

      return {
        sucesso: rejeitados === 0,
        mensagem: `${enviados} servidor(es) enviado(s) ao relogio Henry.`,
        enviados,
        rejeitados,
        detalhes,
      };
    } finally {
      this.encerrar();
    }
  }

  async configurarEventosOnline(params: {
    habilitado: boolean;
    ipServidor?: string | null;
    portaServidor?: number | null;
  }) {
    const configuracoes = [`EVENTO_ON[${params.habilitado ? "H" : "D"}]`];

    if (params.ipServidor && params.portaServidor) {
      configuracoes.push("MODE[C]");
      configuracoes.push(`IP_SERVER[${params.ipServidor}]`);
      configuracoes.push(`SERVER_PORT[${params.portaServidor}]`);
    }

    try {
      const resposta = await this.enviarComando("EC", configuracoes.join(""));

      return {
        sucesso: true,
        mensagem: "Eventos online configurados no relogio Henry.",
        payload: resposta.dados,
      };
    } finally {
      this.encerrar();
    }
  }

  encerrar() {
    this.socket?.destroy();
    this.socket = null;
    this.autenticado = false;
    this.aesKey = null;
  }
}

function montarPayloadBiometriaHenry(servidor: BiometriaServidorRelogioPonto) {
  const primeira = servidor.templates[0];
  const formato = primeira.formato ?? "SUPREMA";

  if (formato === "FS_SWIPE_SINATRA") {
    return `T]${servidor.matricula}}B}B}0}${primeira.template.length}{${primeira.template}`;
  }

  const templates = servidor.templates
    .map((template, index) => {
      const dedo = template.dedo ?? index + 1;
      return `${dedo}{${template.template}`;
    })
    .join("");

  return `D]${servidor.matricula}}${servidor.templates.length}}${templates}`;
}
