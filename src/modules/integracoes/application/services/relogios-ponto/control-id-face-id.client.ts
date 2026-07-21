import http from "node:http";
import https from "node:https";

import type {
  BiometriaServidorRelogioPonto,
  CadastroBiometricoEquipamento,
  DadosConexaoRelogioPonto,
  IdentificadorAfdRelogioPonto,
  RelogioPontoProvider,
  ResultadoAnaliseAfdRelogioPonto,
  ResultadoColetaRelogioPonto,
  ResultadoEnvioBiometriaRelogioPonto,
  ResultadoLeituraCadastrosBiometricos,
  ResultadoSaudeRelogioPonto,
} from "@/modules/integracoes/domain/relogio-ponto.types";

type ControlIdConfig = {
  protocolo?: unknown;
  timeoutMs?: unknown;
  usarHttps?: unknown;
  ignorarCertificadoTls?: unknown;
  transporteLegado?: unknown;
  eventoAcessoConcedido?: unknown;
  incluirEventosNegados?: unknown;
};

type ControlIdLoadParams = {
  object: string;
  fields?: string[];
  limit?: number;
  offset?: number;
  order?: string[];
  where?: Array<Record<string, unknown>>;
};

type ControlIdAccessLog = {
  id?: unknown;
  time?: unknown;
  event?: unknown;
  device_id?: unknown;
  identifier_id?: unknown;
  user_id?: unknown;
  portal_id?: unknown;
  confidence?: unknown;
  mask?: unknown;
};

type ControlIdUser = {
  id?: unknown;
  name?: unknown;
  registration?: unknown;
  cpf?: unknown;
  document?: unknown;
  documento?: unknown;
  pis?: unknown;
};

type IdClassSystemInformation = {
  user_count?: unknown;
  template_count?: unknown;
  number_of_faces?: unknown;
  last_nsr?: unknown;
  memory?: unknown;
  paper_ok?: unknown;
  low_paper?: unknown;
};

type IdClassAbout = {
  mac?: unknown;
  nSerie?: unknown;
  versionFW?: unknown;
  versionMRP?: unknown;
  isFacial?: unknown;
};

function lerConfig(configuracao: unknown): ControlIdConfig {
  if (!configuracao || typeof configuracao !== "object") {
    return {};
  }

  return configuracao as ControlIdConfig;
}

function valorNumero(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function valorTexto(valor: unknown) {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function valorBooleano(valor: unknown) {
  return valor === true || valor === "true";
}

function normalizarLista<T>(payload: unknown, chave: string): T[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const lista = (payload as Record<string, unknown>)[chave];
  return Array.isArray(lista) ? (lista as T[]) : [];
}

function idComoTexto(valor: unknown) {
  const numero = valorNumero(valor);
  if (numero !== null) return String(Math.trunc(numero));

  return valorTexto(valor);
}

function dataUnixSegundos(valor: unknown) {
  const segundos = valorNumero(valor);
  if (segundos === null) return null;

  const data = new Date(segundos * 1000);
  return Number.isNaN(data.getTime()) ? null : data;
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

export function normalizarCpfControlId(valor: string | null) {
  const apenasDigitos = valor?.replace(/\D/g, "") ?? "";

  if (!apenasDigitos) return null;

  const cpf =
    apenasDigitos.length === 12 && apenasDigitos.startsWith("0")
      ? apenasDigitos.slice(1)
      : apenasDigitos.length === 11
        ? apenasDigitos
        : null;

  return cpf && cpfValido(cpf) ? cpf : null;
}

function extrairCpfCadastroControlId(usuario: ControlIdUser | undefined) {
  if (!usuario) return null;

  for (const valor of [
    usuario.cpf,
    usuario.document,
    usuario.documento,
    usuario.registration,
  ]) {
    const digitos = valorTexto(valor)?.replace(/\D/g, "") ?? "";

    if (digitos.length === 11) return normalizarCpfControlId(digitos);
    if (digitos.length === 12 && digitos.startsWith("0")) {
      return normalizarCpfControlId(digitos);
    }
  }

  return null;
}

function parseCsvSimples(linha: string) {
  return linha.split(";").map((valor) => valor.trim());
}

export function parseLinhaAfdIdClass(linha: string): {
  nsr: string;
  dataHora: Date;
  cpf: string | null;
  pis: string | null;
  matricula: string | null;
  identificador: string;
} | null {
  const match = linha.match(/^(\d{9})3(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4})(\d{12})/);

  if (!match) return null;

  const dataHora = new Date(match[2].replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));

  if (Number.isNaN(dataHora.getTime())) return null;

  const identificador = match[3];
  const cpf = normalizarCpfControlId(identificador);
  const pis = cpf ? null : identificador.replace(/^0+/, "") || identificador;

  return {
    nsr: String(Number(match[1])),
    dataHora,
    cpf,
    pis,
    matricula: null,
    identificador,
  };
}

export function parseLinhaCadastroAfdIdClass(
  linha: string,
): IdentificadorAfdRelogioPonto | null {
  const match = linha.match(
    /^(\d{9})5(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4})([IE])(\d{12})(.*)$/,
  );

  if (!match) return null;

  const dataHora = new Date(match[2].replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));

  if (Number.isNaN(dataHora.getTime())) return null;

  const identificador = match[4];
  const cpf = normalizarCpfControlId(identificador);
  const pis = cpf ? null : identificador.replace(/^0+/, "") || identificador;
  const nome = match[5].slice(0, 52).replace(/\s+/g, " ").trim() || null;

  return {
    nsr: String(Number(match[1])),
    dataHora,
    tipoRegistro: "CADASTRO",
    identificador,
    tipoIdentificador: cpf ? "CPF" : pis ? "PIS" : "DESCONHECIDO",
    cpf,
    pis,
    nome,
    operacao: match[3] === "E" ? "EXCLUSAO" : "INCLUSAO",
    linhaOriginal: linha,
  };
}

function parseLinhaIdentificadorAfdIdClass(
  linha: string,
): IdentificadorAfdRelogioPonto | null {
  const marcacao = parseLinhaAfdIdClass(linha);

  if (marcacao) {
    return {
      nsr: marcacao.nsr,
      dataHora: marcacao.dataHora,
      tipoRegistro: "MARCACAO",
      identificador: marcacao.identificador,
      tipoIdentificador: marcacao.cpf ? "CPF" : marcacao.pis ? "PIS" : "DESCONHECIDO",
      cpf: marcacao.cpf,
      pis: marcacao.pis,
      linhaOriginal: linha,
    };
  }

  return parseLinhaCadastroAfdIdClass(linha);
}

function nsrLinhaAfd(linha: string) {
  const match = linha.match(/^(\d{9})/);
  if (!match) return null;

  const nsr = Number(match[1]);
  return Number.isFinite(nsr) ? nsr : null;
}

function resolverProtocoloControlId(config: ControlIdConfig) {
  const protocolo = valorTexto(config.protocolo)?.toUpperCase();

  return protocolo === "CONTROL_ID_IDCLASS_BIO"
    ? "CONTROL_ID_IDCLASS_BIO"
    : "CONTROL_ID_FACE_ID";
}

function rotuloProtocoloControlId(protocolo: string) {
  return protocolo === "CONTROL_ID_IDCLASS_BIO"
    ? "Control iD idClass Bio"
    : "Control iD FACE ID";
}

export class ControlIdFaceIdClient implements RelogioPontoProvider {
  private readonly timeoutMs: number;
  private readonly config: ControlIdConfig;
  private readonly baseUrl: string;
  private readonly usuario: string;
  private readonly senha: string;
  private readonly protocolo: string;
  private readonly rotulo: string;
  private readonly usarHttps: boolean;
  private readonly ignorarCertificadoTls: boolean;
  private readonly transporteLegado: boolean;

  constructor(private readonly conexao: DadosConexaoRelogioPonto) {
    this.config = lerConfig(conexao.configuracao);
    this.protocolo = resolverProtocoloControlId(this.config);
    this.rotulo = rotuloProtocoloControlId(this.protocolo);
    this.usarHttps =
      this.protocolo === "CONTROL_ID_IDCLASS_BIO" ||
      valorBooleano(this.config.usarHttps);
    this.ignorarCertificadoTls =
      this.protocolo === "CONTROL_ID_IDCLASS_BIO" ||
      valorBooleano(this.config.ignorarCertificadoTls);
    this.transporteLegado =
      this.protocolo === "CONTROL_ID_IDCLASS_BIO" ||
      valorBooleano(this.config.transporteLegado);
    this.timeoutMs =
      conexao.timeoutMs ??
      valorNumero(this.config.timeoutMs) ??
      Number(process.env.CONTROL_ID_FACE_ID_TIMEOUT_MS ?? 10000);
    this.baseUrl = `${this.usarHttps ? "https" : "http"}://${conexao.ip}:${
      conexao.porta || (this.usarHttps ? 443 : 80)
    }`;
    this.usuario = conexao.usuario || "admin";
    this.senha = conexao.senha || "admin";
  }

  private postLegado<T>(
    path: string,
    body: Record<string, unknown>,
    session?: string,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);

      if (session) {
        url.searchParams.set("session", session);
      }

      const dados = JSON.stringify(body);
      const transport = url.protocol === "https:" ? https : http;
      const request = transport.request(
        {
          hostname: url.hostname,
          port: url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80,
          path: `${url.pathname}${url.search}`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(dados),
          },
          timeout: this.timeoutMs,
          insecureHTTPParser: true,
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
            try {
              let payload: unknown = {};

              try {
                payload = texto ? (JSON.parse(texto) as unknown) : {};
              } catch {
                payload = texto;
              }

              if ((response.statusCode ?? 0) >= 400) {
                reject(
                  new Error(`Control iD HTTP ${response.statusCode}: ${texto}`),
                );
                return;
              }

              if (payload && typeof payload === "object" && "error" in payload) {
                const erro = (payload as Record<string, unknown>).error;
                reject(
                  new Error(
                    typeof erro === "string"
                      ? erro
                      : "Equipamento Control iD retornou erro na API.",
                  ),
                );
                return;
              }

              resolve(payload as T);
            } catch (error) {
              reject(error);
            }
          });
        },
      );

      request.on("timeout", () => {
        request.destroy(new Error(`Tempo limite ao conectar no ${this.rotulo}.`));
      });
      request.on("error", reject);
      request.end(dados);
    });
  }

  private async post<T>(
    path: string,
    body: Record<string, unknown>,
    session?: string,
  ): Promise<T> {
    if (this.transporteLegado) {
      return this.postLegado<T>(path, body, session);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const url = new URL(path, this.baseUrl);

    if (session) {
      url.searchParams.set("session", session);
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const texto = await response.text();
      let payload: unknown = {};

      try {
        payload = texto ? (JSON.parse(texto) as unknown) : {};
      } catch {
        payload = texto;
      }

      if (!response.ok) {
        throw new Error(`Control iD HTTP ${response.status}: ${texto}`);
      }

      if (payload && typeof payload === "object" && "error" in payload) {
        const erro = (payload as Record<string, unknown>).error;
        throw new Error(
          typeof erro === "string"
            ? erro
            : "Equipamento Control iD retornou erro na API.",
        );
      }

      return payload as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(`Tempo limite ao conectar no ${this.rotulo}.`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async login() {
    const payload = await this.post<{ session?: unknown }>("/login.fcgi", {
      login: this.usuario,
      password: this.senha,
    });
    const session = valorTexto(payload.session);

    if (!session) {
      throw new Error("Control iD nao retornou sessao de autenticacao.");
    }

    return session;
  }

  private async carregarObjetos<T>(params: ControlIdLoadParams, session: string) {
    const payload = await this.post<unknown>("/load_objects.fcgi", params, session);
    return normalizarLista<T>(payload, params.object);
  }

  private async executarIdClass<T>(
    comando: string,
    session: string,
    body: Record<string, unknown> = {},
    params: Record<string, string> = {},
  ) {
    const query = new URLSearchParams({ session, ...params });

    return this.post<T>(`/${comando}.fcgi?${query.toString()}`, body);
  }

  private async executarIdClassTexto(
    comando: string,
    session: string,
    body: Record<string, unknown> = {},
    params: Record<string, string> = {},
  ) {
    return this.executarIdClass<string>(comando, session, body, params);
  }

  private async carregarUsuarios(session: string, ids?: Set<number>) {
    const where =
      ids && ids.size > 0
        ? [
            {
              object: "users",
              field: "id",
              operator: "IN",
              value: Array.from(ids),
            },
          ]
        : undefined;
    const usuarios = await this.carregarObjetos<ControlIdUser>(
      {
        object: "users",
        fields: ["id", "name", "registration"],
        limit: ids && ids.size > 0 ? Math.max(ids.size, 1) : 10000,
        offset: 0,
        order: ["id", "ascending"],
        where,
      },
      session,
    );

    return new Map(
      usuarios
        .map((usuario) => {
          const id = valorNumero(usuario.id);
          return id === null ? null : [Math.trunc(id), usuario] as const;
        })
        .filter((item): item is readonly [number, ControlIdUser] => Boolean(item)),
    );
  }

  async testarConexao(): Promise<ResultadoSaudeRelogioPonto> {
    try {
      const session = await this.login();

      if (this.protocolo === "CONTROL_ID_IDCLASS_BIO") {
        const [sistema, about] = await Promise.all([
          this.executarIdClass<IdClassSystemInformation>(
            "get_system_information",
            session,
          ),
          this.executarIdClass<IdClassAbout>("get_about", session),
        ]);
        const quantidadeDigitais =
          valorNumero(sistema.template_count) ??
          valorNumero(sistema.number_of_faces);

        return {
          status: "ONLINE",
          mensagem: `${this.rotulo} autenticado e respondendo pela API REP iDClass.`,
          dataHoraConsulta: new Date(),
          quantidadeUsuarios: valorNumero(sistema.user_count),
          quantidadeDigitais,
          quantidadeRegistros: valorNumero(sistema.last_nsr),
          detalhes: {
            protocolo: this.protocolo,
            codigo: this.conexao.codigo,
            modelo: this.conexao.modelo,
            ip: this.conexao.ip,
            porta: this.conexao.porta,
            numeroSerie: valorTexto(about.nSerie),
            mac: valorTexto(about.mac),
            versionFW: valorNumero(about.versionFW),
            versionMRP: valorNumero(about.versionMRP),
            isFacial: about.isFacial,
            memoria: valorNumero(sistema.memory),
            papelOk: sistema.paper_ok,
            poucoPapel: sistema.low_paper,
          },
        };
      }

      const [usuarios, logs] = await Promise.all([
        this.carregarObjetos<ControlIdUser>(
          {
            object: "users",
            fields: ["id", "registration"],
            limit: 1,
            offset: 0,
          },
          session,
        ),
        this.carregarObjetos<ControlIdAccessLog>(
          {
            object: "access_logs",
            fields: ["id", "time", "event", "user_id"],
            limit: 1,
            offset: 0,
            order: ["id", "descending"],
          },
          session,
        ),
      ]);

      return {
        status: "ONLINE",
        mensagem: `${this.rotulo} autenticado e respondendo pela Access API.`,
        dataHoraConsulta: new Date(),
        quantidadeUsuarios: usuarios.length,
        quantidadeRegistros: logs.length,
        detalhes: {
          protocolo: this.protocolo,
          codigo: this.conexao.codigo,
          modelo: this.conexao.modelo,
          ip: this.conexao.ip,
          porta: this.conexao.porta,
        },
      };
    } catch (error) {
      return {
        status: "OFFLINE",
        mensagem:
          error instanceof Error
            ? error.message
            : `Nao foi possivel conectar ao ${this.rotulo}.`,
        dataHoraConsulta: new Date(),
        detalhes: {
          protocolo: this.protocolo,
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
    const session = await this.login();
    const nsrInicial = Math.max(Number(params.nsrInicial || 1), 1);
    const quantidade = Math.min(Math.max(Number(params.quantidade ?? 100), 1), 500);

    if (this.protocolo === "CONTROL_ID_IDCLASS_BIO") {
      const afd = await this.executarIdClassTexto(
        "get_afd",
        session,
        { initial_nsr: nsrInicial, limit: quantidade },
        { mode: "671" },
      );
      const linhas = afd.split(/\r?\n/).map((linha) => linha.trim());
      const registros = linhas
        .map((linha) => parseLinhaAfdIdClass(linha))
        .filter(
          (marcacao): marcacao is NonNullable<typeof marcacao> =>
            Boolean(marcacao),
        );
      const selecionados = registros.slice(0, quantidade);
      const maiorNsr = linhas.reduce(
        (maior, linha) => Math.max(maior, nsrLinhaAfd(linha) ?? maior),
        nsrInicial - 1,
      );
      const marcacoes = selecionados.map((marcacao) => ({
        nsr: marcacao.nsr,
        cpf: marcacao.cpf,
        pis: marcacao.pis,
        matricula: marcacao.matricula,
        dataHora: marcacao.dataHora,
        codigoExterno: marcacao.nsr,
        payload: {
          protocolo: this.protocolo,
          origem: "AFD_671",
          identificadorAfd: marcacao.identificador,
          tipoIdentificadorAfd: marcacao.cpf
            ? "CPF"
            : marcacao.pis
              ? "PIS"
              : "DESCONHECIDO",
          pisAfd: marcacao.pis,
        },
      }));

      return {
        marcacoes,
        proximoNsr:
          maiorNsr >= nsrInicial ? String(maiorNsr + 1) : String(nsrInicial),
        mensagem: `${marcacoes.length} marcacao(oes) lida(s) do ${this.rotulo}.`,
        payload: {
          protocolo: this.protocolo,
          recebidos: registros.length,
          formato: "AFD_671",
        },
      };
    }

    const eventoAcessoConcedido =
      valorNumero(this.config.eventoAcessoConcedido) ?? 7;
    const incluirEventosNegados = valorBooleano(this.config.incluirEventosNegados);
    const logs = await this.carregarObjetos<ControlIdAccessLog>(
      {
        object: "access_logs",
        fields: [
          "id",
          "time",
          "event",
          "device_id",
          "identifier_id",
          "user_id",
          "portal_id",
          "confidence",
          "mask",
        ],
        limit: quantidade,
        offset: 0,
        order: ["id", "ascending"],
        where: [
          {
            object: "access_logs",
            field: "id",
            operator: ">=",
            value: nsrInicial,
          },
        ],
      },
      session,
    );
    const idsUsuarios = new Set(
      logs
        .map((log) => valorNumero(log.user_id))
        .filter((id): id is number => id !== null)
        .map((id) => Math.trunc(id)),
    );
    const usuarios = await this.carregarUsuarios(session, idsUsuarios);
    let maiorNsr = nsrInicial - 1;

    const marcacoes = logs.flatMap((log) => {
      const nsr = idComoTexto(log.id);
      const idUsuario = valorNumero(log.user_id);
      const evento = valorNumero(log.event);
      const dataHora = dataUnixSegundos(log.time);

      if (nsr) {
        maiorNsr = Math.max(maiorNsr, Number(nsr));
      }

      if (
        !nsr ||
        !dataHora ||
        (!incluirEventosNegados && evento !== eventoAcessoConcedido)
      ) {
        return [];
      }

      const usuario =
        idUsuario === null ? undefined : usuarios.get(Math.trunc(idUsuario));
      const cpf = extrairCpfCadastroControlId(usuario);
      const registration = valorTexto(usuario?.registration);
      const registrationEhCpf =
        Boolean(cpf) && registration?.replace(/\D/g, "") === cpf;
      const matricula =
        (registrationEhCpf ? null : registration) ??
        idComoTexto(log.user_id) ??
        idComoTexto(log.identifier_id);

      if (!matricula && !cpf) {
        return [];
      }

      return [
        {
          nsr,
          matricula,
          cpf,
          dataHora,
          codigoExterno: nsr,
          payload: {
            protocolo: this.protocolo,
            log,
            usuario,
          },
        },
      ];
    });

    return {
      marcacoes,
      proximoNsr: maiorNsr >= nsrInicial ? String(maiorNsr + 1) : String(nsrInicial),
      mensagem: `${marcacoes.length} marcacao(oes) lida(s) do ${this.rotulo}.`,
      payload: {
        protocolo: this.protocolo,
        recebidos: logs.length,
        eventoAcessoConcedido,
        incluirEventosNegados,
      },
    };
  }

  async analisarAfdDesdeNsr(params: {
    nsrInicial: string | number;
    quantidade?: number;
  }): Promise<ResultadoAnaliseAfdRelogioPonto> {
    if (this.protocolo !== "CONTROL_ID_IDCLASS_BIO") {
      throw new Error("Analise AFD 671 disponivel apenas para Control iD idClass Bio.");
    }

    const session = await this.login();
    const nsrInicial = Math.max(Number(params.nsrInicial || 1), 1);
    const quantidade = Math.min(Math.max(Number(params.quantidade ?? 100), 1), 500);
    const afd = await this.executarIdClassTexto(
      "get_afd",
      session,
      { initial_nsr: nsrInicial, limit: quantidade },
      { mode: "671" },
    );
    const linhas = afd.split(/\r?\n/).map((linha) => linha.trim());
    const registros = linhas
      .map((linha) => parseLinhaIdentificadorAfdIdClass(linha))
      .filter((registro): registro is IdentificadorAfdRelogioPonto =>
        Boolean(registro),
      );
    const maiorNsr = linhas.reduce(
      (maior, linha) => Math.max(maior, nsrLinhaAfd(linha) ?? maior),
      nsrInicial - 1,
    );

    return {
      registros,
      proximoNsr:
        maiorNsr >= nsrInicial ? String(maiorNsr + 1) : String(nsrInicial),
      mensagem: `${registros.length} registro(s) AFD 671 analisado(s) do ${this.rotulo}.`,
      payload: {
        protocolo: this.protocolo,
        formato: "AFD_671",
        nsrInicial,
        quantidade,
        linhas: linhas.filter(Boolean).length,
      },
    };
  }

  async enviarBiometrias(
    servidores: BiometriaServidorRelogioPonto[],
  ): Promise<ResultadoEnvioBiometriaRelogioPonto> {
    return {
      sucesso: false,
      mensagem:
        `Envio de biometrias para ${this.rotulo} ainda nao foi habilitado. A coleta de marcacoes pela Access API esta disponivel.`,
      enviados: 0,
      rejeitados: servidores.length,
      detalhes: {
        protocolo: this.protocolo,
        motivo: "Sincronizacao facial exige mapeamento dos objetos de usuario/face antes de gravar cadastros no equipamento.",
      },
    };
  }

  async listarCadastrosBiometricos(params?: {
    indiceInicial?: string | number;
    quantidade?: number;
  }): Promise<ResultadoLeituraCadastrosBiometricos> {
    const session = await this.login();
    const offset = Math.max(Number(params?.indiceInicial ?? 0), 0);
    const quantidade = Math.min(Math.max(Number(params?.quantidade ?? 100), 1), 500);

    if (this.protocolo === "CONTROL_ID_IDCLASS_BIO") {
      const csv = await this.executarIdClassTexto(
        "export_users_csv",
        session,
        {},
        { mode: "671" },
      );
      const linhas = csv.split(/\r?\n/).filter((linha) => linha.trim());
      const [cabecalho, ...dados] = linhas;
      const cadastros = dados
        .slice(offset, offset + quantidade)
        .map((linha) => {
          const [
            cpf,
            nome,
            administrador,
            matricula,
            rfid,
            codigo,
            ,
            barras,
            digitais,
          ] = parseCsvSimples(linha);

          return {
            codigo: codigo || matricula || normalizarCpfControlId(cpf),
            matricula: matricula || codigo || normalizarCpfControlId(cpf) || "",
            cpf: normalizarCpfControlId(cpf),
            nome: nome || null,
            cartoes: [rfid, barras].filter(Boolean),
            payload: {
              protocolo: this.protocolo,
              administrador,
              digitais,
              linha,
            },
          };
        })
        .filter((cadastro) => cadastro.matricula);

      return {
        cadastros,
        mensagem: `${cadastros.length} cadastro(s) lido(s) do ${this.rotulo}.`,
        payload: {
          protocolo: this.protocolo,
          cabecalho,
          offset,
          quantidade,
          totalCsv: dados.length,
        },
      };
    }

    const usuarios = await this.carregarObjetos<ControlIdUser>(
      {
        object: "users",
        fields: ["id", "name", "registration"],
        limit: quantidade,
        offset,
        order: ["id", "ascending"],
      },
      session,
    );
    const cadastros: CadastroBiometricoEquipamento[] = usuarios
      .map((usuario) => {
        const cpf = extrairCpfCadastroControlId(usuario);
        const registration = valorTexto(usuario.registration);
        const registrationEhCpf =
          Boolean(cpf) && registration?.replace(/\D/g, "") === cpf;

        return {
          codigo: idComoTexto(usuario.id),
          matricula:
            (registrationEhCpf ? null : registration) ??
            idComoTexto(usuario.id) ??
            cpf ??
            "",
          cpf,
          nome: valorTexto(usuario.name),
          payload: usuario,
        };
      })
      .filter((cadastro) => cadastro.matricula);

    return {
      cadastros,
      mensagem: `${cadastros.length} cadastro(s) lido(s) do ${this.rotulo}.`,
      payload: {
        protocolo: this.protocolo,
        offset,
        quantidade,
      },
    };
  }

  async configurarEventosOnline() {
    return {
      sucesso: false,
      mensagem:
        `Eventos online do ${this.rotulo} nao foram ativados por esta integracao. Use a coleta progressiva via Access API.`,
      payload: {
        protocolo: this.protocolo,
      },
    };
  }
}
