import { createHash, randomBytes } from "node:crypto";
import http from "node:http";
import https from "node:https";

import type {
  BiometriaServidorRelogioPonto,
  CadastroBiometricoEquipamento,
  DadosConexaoRelogioPonto,
  RelogioPontoProvider,
  ResultadoColetaRelogioPonto,
  ResultadoEnvioBiometriaRelogioPonto,
  ResultadoLeituraCadastrosBiometricos,
  ResultadoSaudeRelogioPonto,
} from "@/modules/integracoes/domain/relogio-ponto.types";

type IntelbrasConfig = {
  timeoutMs?: unknown;
  usarHttps?: unknown;
  ignorarCertificadoTls?: unknown;
  incluirEventosNegados?: unknown;
  coletarPorStartTime?: unknown;
  startTimeInicial?: unknown;
};

type HttpDigestChallenge = {
  realm?: string;
  nonce?: string;
  opaque?: string;
  qop?: string;
  algorithm?: string;
};

type IntelbrasRegistro = Record<string, string>;

function lerConfig(configuracao: unknown): IntelbrasConfig {
  return configuracao && typeof configuracao === "object"
    ? (configuracao as IntelbrasConfig)
    : {};
}

function valorTexto(valor: unknown) {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function valorNumero(valor: unknown) {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : null;
}

function valorBooleano(valor: unknown) {
  return valor === true || valor === "true";
}

function md5(valor: string) {
  return createHash("md5").update(valor).digest("hex");
}

function parseDigestChallenge(header: string | null): HttpDigestChallenge {
  const desafio = header?.replace(/^Digest\s+/i, "") ?? "";
  const resultado: HttpDigestChallenge = {};
  const regex = /(\w+)=("([^"]*)"|([^,\s]+))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(desafio))) {
    resultado[match[1] as keyof HttpDigestChallenge] = match[3] ?? match[4];
  }

  return resultado;
}

function montarDigestAuthorization(params: {
  username: string;
  password: string;
  method: string;
  uri: string;
  challenge: HttpDigestChallenge;
}) {
  const realm = params.challenge.realm ?? "";
  const nonce = params.challenge.nonce ?? "";
  const algorithm = params.challenge.algorithm || "MD5";
  const qop = params.challenge.qop?.split(",").map((item) => item.trim())[0];
  const cnonce = randomBytes(8).toString("hex");
  const nc = "00000001";
  const ha1 = md5(`${params.username}:${realm}:${params.password}`);
  const ha2 = md5(`${params.method}:${params.uri}`);
  const response = qop
    ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${nonce}:${ha2}`);
  const partes = [
    `username="${params.username}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${params.uri}"`,
    `algorithm=${algorithm}`,
    `response="${response}"`,
  ];

  if (params.challenge.opaque) {
    partes.push(`opaque="${params.challenge.opaque}"`);
  }

  if (qop) {
    partes.push(`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`);
  }

  return `Digest ${partes.join(", ")}`;
}

function parseTextoChaveValor(texto: string): Record<string, unknown> & {
  records: IntelbrasRegistro[];
} {
  const raiz: Record<string, string> = {};
  const registros = new Map<number, IntelbrasRegistro>();

  for (const linha of texto.split(/\r?\n/)) {
    const indice = linha.indexOf("=");

    if (indice < 0) continue;

    const chave = linha.slice(0, indice).trim();
    const valor = linha.slice(indice + 1).trim();
    const registro = chave.match(/^records\[(\d+)\]\.(.+)$/);

    if (registro) {
      const posicao = Number(registro[1]);
      const campo = registro[2];
      const item = registros.get(posicao) ?? {};

      item[campo] = valor;
      registros.set(posicao, item);
      continue;
    }

    raiz[chave] = valor;
  }

  return {
    ...raiz,
    records: [...registros.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, item]) => item),
  };
}

function dataUnix(valor: string | null) {
  const numero = valorNumero(valor);

  if (numero === null) return null;

  const data = new Date(numero * 1000);
  return Number.isNaN(data.getTime()) ? null : data;
}

function maiorCreateTime(registros: IntelbrasRegistro[]) {
  return registros.reduce<number | null>((maior, registro) => {
    const createTime = valorNumero(registro.CreateTime);

    if (createTime === null) {
      return maior;
    }

    return maior === null ? createTime : Math.max(maior, createTime);
  }, null);
}

function dataTexto(valor: string | null) {
  if (!valor) return null;

  const data = new Date(valor.replace(" ", "T"));
  return Number.isNaN(data.getTime()) ? null : data;
}

function somenteDigitos(valor: string | null) {
  return valor?.replace(/\D/g, "") ?? "";
}

function cpfDoIdentificador(valor: string | null) {
  const digitos = somenteDigitos(valor);
  return digitos.length === 11 ? digitos : null;
}

export class IntelbrasBioTClient implements RelogioPontoProvider {
  private readonly config: IntelbrasConfig;
  private readonly timeoutMs: number;
  private readonly usuario: string;
  private readonly senha: string;
  private readonly baseUrl: string;
  private readonly ignorarCertificadoTls: boolean;

  constructor(private readonly conexao: DadosConexaoRelogioPonto) {
    this.config = lerConfig(conexao.configuracao);
    const usarHttps = valorBooleano(this.config.usarHttps);
    this.ignorarCertificadoTls = valorBooleano(
      this.config.ignorarCertificadoTls,
    );
    this.timeoutMs =
      conexao.timeoutMs ??
      valorNumero(this.config.timeoutMs) ??
      Number(process.env.INTELBRAS_BIO_T_TIMEOUT_MS ?? 10000);
    this.usuario = conexao.usuario || "admin";
    this.senha = conexao.senha || "admin";
    this.baseUrl = `${usarHttps ? "https" : "http"}://${conexao.ip}:${
      conexao.porta || (usarHttps ? 443 : 80)
    }`;
  }

  private requisitarTexto(
    method: "GET" | "POST",
    path: string,
    body?: string,
    authorization?: string,
  ): Promise<{
    statusCode: number;
    headers: http.IncomingHttpHeaders;
    texto: string;
  }> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const transport = url.protocol === "https:" ? https : http;
      const request = transport.request(
        {
          hostname: url.hostname,
          port: url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80,
          path: `${url.pathname}${url.search}`,
          method,
          timeout: this.timeoutMs,
          headers: {
            ...(authorization ? { Authorization: authorization } : {}),
            ...(body
              ? {
                  "Content-Type": "application/json; charset=utf-8",
                  "Content-Length": Buffer.byteLength(body),
                }
              : {}),
          },
          ...(url.protocol === "https:"
            ? { rejectUnauthorized: !this.ignorarCertificadoTls }
            : {}),
        },
        (response) => {
          let texto = "";

          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            texto += chunk;
          });
          response.on("end", () => {
            resolve({
              statusCode: response.statusCode ?? 0,
              headers: response.headers,
              texto,
            });
          });
        },
      );

      request.on("timeout", () => {
        request.destroy(new Error("Tempo limite ao conectar no Intelbras Bio-T."));
      });
      request.on("error", reject);

      if (body) {
        request.write(body);
      }

      request.end();
    });
  }

  private async requestTexto(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ) {
    const bodyText = body ? JSON.stringify(body) : undefined;
    const primeira = await this.requisitarTexto(method, path, bodyText);

    if (primeira.statusCode !== 401) {
      if (primeira.statusCode >= 400) {
        throw new Error(`Intelbras HTTP ${primeira.statusCode}: ${primeira.texto}`);
      }

      return primeira.texto;
    }

    const challenge = parseDigestChallenge(
      Array.isArray(primeira.headers["www-authenticate"])
        ? primeira.headers["www-authenticate"][0]
        : primeira.headers["www-authenticate"] ?? null,
    );

    if (!challenge.realm || !challenge.nonce) {
      throw new Error("Intelbras nao retornou desafio Digest valido.");
    }

    const url = new URL(path, this.baseUrl);
    const authorization = montarDigestAuthorization({
      username: this.usuario,
      password: this.senha,
      method,
      uri: `${url.pathname}${url.search}`,
      challenge,
    });
    const segunda = await this.requisitarTexto(
      method,
      path,
      bodyText,
      authorization,
    );

    if (segunda.statusCode >= 400) {
      throw new Error(`Intelbras HTTP ${segunda.statusCode}: ${segunda.texto}`);
    }

    return segunda.texto;
  }

  private async getChaveValor(path: string) {
    const texto = await this.requestTexto("GET", path);
    return parseTextoChaveValor(texto);
  }

  async testarConexao(): Promise<ResultadoSaudeRelogioPonto> {
    try {
      const [hora, serial, firmware, usuarios, faces, digitais] =
        await Promise.all([
          this.requestTexto("GET", "/cgi-bin/global.cgi?action=getCurrentTime"),
          this.requestTexto("GET", "/cgi-bin/magicBox.cgi?action=getSerialNo"),
          this.requestTexto(
            "GET",
            "/cgi-bin/magicBox.cgi?action=getSoftwareVersion",
          ),
          this.getChaveValor(
            "/cgi-bin/recordFinder.cgi?action=getQuerySize&name=AccessUserInfo",
          ).catch(() => null),
          this.getChaveValor(
            "/cgi-bin/recordFinder.cgi?action=getQuerySize&name=FaceEigenValue",
          ).catch(() => null),
          this.getChaveValor(
            "/cgi-bin/recordFinder.cgi?action=getQuerySize&name=FingerPrintRecord",
          ).catch(() => null),
        ]);

      return {
        status: "ONLINE",
        mensagem: "Intelbras Bio-T autenticado e respondendo via CGI Digest.",
        dataHoraConsulta: new Date(),
        quantidadeUsuarios: valorNumero(usuarios?.count),
        quantidadeDigitais:
          valorNumero(digitais?.count) ?? valorNumero(faces?.count),
        detalhes: {
          fabricante: "INTELBRAS",
          codigo: this.conexao.codigo,
          modelo: this.conexao.modelo,
          ip: this.conexao.ip,
          porta: this.conexao.porta,
          hora: hora.trim(),
          serial: serial.trim(),
          firmware: firmware.trim(),
          faces: valorNumero(faces?.count),
          digitais: valorNumero(digitais?.count),
        },
      };
    } catch (error) {
      return {
        status: "OFFLINE",
        mensagem:
          error instanceof Error
            ? error.message
            : "Nao foi possivel conectar ao Intelbras Bio-T.",
        dataHoraConsulta: new Date(),
        detalhes: {
          fabricante: "INTELBRAS",
          codigo: this.conexao.codigo,
          modelo: this.conexao.modelo,
          ip: this.conexao.ip,
          porta: this.conexao.porta,
        },
      };
    }
  }

  async coletarMarcacoesDesdeNsr(params: {
    nsrInicial: string | number;
    quantidade?: number;
  }): Promise<ResultadoColetaRelogioPonto> {
    const nsrInicial = Math.max(Number(params.nsrInicial || 1), 1);
    const quantidade = Math.min(Math.max(Number(params.quantidade ?? 100), 1), 1024);
    const incluirNegados = valorBooleano(this.config.incluirEventosNegados);
    const startTime =
      valorNumero(this.config.startTimeInicial) ??
      (valorBooleano(this.config.coletarPorStartTime) ? 0 : null);
    const query = new URLSearchParams({
      action: "find",
      name: "AccessControlCardRec",
      "condition.count": String(quantidade),
    });

    if (startTime !== null) {
      query.set("StartTime", String(startTime));
    }

    const payload = await this.getChaveValor(
      `/cgi-bin/recordFinder.cgi?${query.toString()}`,
    );
    const registros = (payload.records as IntelbrasRegistro[]).filter((registro) => {
      const recNo = valorNumero(registro.RecNo);
      return recNo !== null && recNo >= nsrInicial;
    });
    const selecionados = registros.slice(0, quantidade);
    const proximoStartTime = maiorCreateTime(selecionados);
    const marcacoes = selecionados
      .filter((registro) => incluirNegados || registro.Status === "1")
      .map((registro) => {
        const recNo = registro.RecNo || null;
        const dataHora = dataUnix(registro.CreateTime) ?? new Date(0);
        const userId = valorTexto(registro.UserID);
        const cardNo = valorTexto(registro.CardNo);
        const cpf = cpfDoIdentificador(userId) ?? cpfDoIdentificador(cardNo);

        return {
          nsr: recNo,
          cpf,
          matricula: cpf ? null : userId,
          dataHora,
          codigoExterno: recNo,
          payload: {
            fabricante: "INTELBRAS",
            origem: "AccessControlCardRec",
            status: registro.Status,
            metodo: registro.Method,
            tipo: registro.Type,
            porta: registro.Door,
            leitor: registro.ReaderID,
            erro: registro.ErrorCode,
            usuario: userId,
            cartao: cardNo,
            registro,
          },
        };
      })
      .filter((marcacao) => marcacao.dataHora.getTime() > 0);
    const maiorNsr = selecionados.reduce(
      (maior, registro) =>
        Math.max(maior, valorNumero(registro.RecNo) ?? maior),
      nsrInicial - 1,
    );

    return {
      marcacoes,
      proximoNsr:
        maiorNsr >= nsrInicial ? String(maiorNsr + 1) : String(nsrInicial),
      mensagem: `${marcacoes.length} marcacao(oes) lida(s) do Intelbras Bio-T.`,
      payload: {
        recebidos: registros.length,
        consultados: valorNumero(payload.found),
        incluirEventosNegados: incluirNegados,
        startTimeUsado: startTime,
        proximoStartTime,
      },
    };
  }

  async listarCadastrosBiometricos(params?: {
    indiceInicial?: string | number;
    quantidade?: number;
  }): Promise<ResultadoLeituraCadastrosBiometricos> {
    const quantidade = Math.min(Math.max(Number(params?.quantidade ?? 100), 1), 1024);
    const query = new URLSearchParams({
      action: "find",
      name: "AccessControlCard",
      "condition.count": String(quantidade),
    });
    const recNo = valorNumero(params?.indiceInicial);

    if (recNo !== null && recNo > 0) {
      query.set("condition.RecNo", String(recNo));
    }

    const payload = await this.getChaveValor(
      `/cgi-bin/recordFinder.cgi?${query.toString()}`,
    );
    const cadastros = (payload.records as IntelbrasRegistro[]).map(
      (registro): CadastroBiometricoEquipamento => {
        const userId = valorTexto(registro.UserID) ?? "";
        const citizenId = valorTexto(registro.CitizenIDNo);
        const cpf = cpfDoIdentificador(citizenId) ?? cpfDoIdentificador(userId);

        return {
          codigo: valorTexto(registro.RecNo),
          matricula: cpf ? userId : userId,
          cpf,
          nome: valorTexto(registro.CardName),
          cartoes: valorTexto(registro.CardNo)
            ? [String(registro.CardNo)]
            : undefined,
          payload: {
            fabricante: "INTELBRAS",
            origem: "AccessControlCard",
            registro,
          },
        };
      },
    );

    return {
      cadastros,
      mensagem: `${cadastros.length} cadastro(s) lido(s) do Intelbras Bio-T.`,
      payload,
    };
  }

  async enviarBiometrias(
    _servidores: BiometriaServidorRelogioPonto[],
  ): Promise<ResultadoEnvioBiometriaRelogioPonto> {
    return {
      sucesso: false,
      mensagem:
        "Envio de biometrias para Intelbras Bio-T depende de foto facial Base64 conforme AccessFace.cgi e nao aceita template generico do SECP.",
      enviados: 0,
      rejeitados: _servidores.length,
    };
  }

  async configurarEventosOnline(params: {
    habilitado: boolean;
    ipServidor?: string | null;
    portaServidor?: number | null;
  }) {
    if (!params.habilitado) {
      const texto = await this.requestTexto(
        "GET",
        "/cgi-bin/configManager.cgi?action=setConfig&Intelbras_ModeCfg.DeviceMode=0",
      );

      return {
        sucesso: texto.includes("OK"),
        mensagem: "Intelbras Bio-T configurado em modo StandAlone.",
        payload: { resposta: texto },
      };
    }

    if (!params.ipServidor || !params.portaServidor) {
      throw new Error("Informe IP e porta do servidor para eventos Intelbras.");
    }

    const query = new URLSearchParams({
      action: "setConfig",
      "Intelbras_ModeCfg.DeviceMode": "1",
      "PictureHttpUpload.Enable": "true",
      "PictureHttpUpload.UploadServerList[0].Address": params.ipServidor,
      "PictureHttpUpload.UploadServerList[0].Port": String(params.portaServidor),
      "PictureHttpUpload.UploadServerList[0].Uploadpath": [
        "/api/integracoes/equipamentos-biometricos/webhook",
        `?equipamentoCodigo=${encodeURIComponent(this.conexao.codigo)}`,
        valorTexto((this.config as Record<string, unknown>).webhookToken)
          ? `&token=${encodeURIComponent(
              String((this.config as Record<string, unknown>).webhookToken),
            )}`
          : "",
      ].join(""),
      "HTTPUploadPic.Enable": "true",
      "PictureHttpUpload.UploadServerList[0].HttpsEnable": "false",
    });
    const texto = await this.requestTexto(
      "GET",
      `/cgi-bin/configManager.cgi?${query.toString()}`,
    );

    return {
      sucesso: texto.includes("OK"),
      mensagem: "Servidor de envio de eventos configurado no Intelbras Bio-T.",
      payload: { resposta: texto },
    };
  }
}
