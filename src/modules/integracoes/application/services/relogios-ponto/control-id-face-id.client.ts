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

type ControlIdConfig = {
  timeoutMs?: unknown;
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

export class ControlIdFaceIdClient implements RelogioPontoProvider {
  private readonly timeoutMs: number;
  private readonly config: ControlIdConfig;
  private readonly baseUrl: string;
  private readonly usuario: string;
  private readonly senha: string;

  constructor(private readonly conexao: DadosConexaoRelogioPonto) {
    this.config = lerConfig(conexao.configuracao);
    this.timeoutMs =
      conexao.timeoutMs ??
      valorNumero(this.config.timeoutMs) ??
      Number(process.env.CONTROL_ID_FACE_ID_TIMEOUT_MS ?? 10000);
    this.baseUrl = `http://${conexao.ip}:${conexao.porta || 80}`;
    this.usuario = conexao.usuario || "admin";
    this.senha = conexao.senha || "admin";
  }

  private async post<T>(
    path: string,
    body: Record<string, unknown>,
    session?: string,
  ): Promise<T> {
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
      const payload = texto ? (JSON.parse(texto) as unknown) : {};

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
        throw new Error("Tempo limite ao conectar no Control iD FACE ID.");
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
        mensagem: "Control iD FACE ID autenticado e respondendo pela Access API.",
        dataHoraConsulta: new Date(),
        quantidadeUsuarios: usuarios.length,
        quantidadeRegistros: logs.length,
        detalhes: {
          protocolo: "CONTROL_ID_FACE_ID",
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
            : "Nao foi possivel conectar ao Control iD FACE ID.",
        dataHoraConsulta: new Date(),
        detalhes: {
          protocolo: "CONTROL_ID_FACE_ID",
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
      const matricula =
        valorTexto(usuario?.registration) ??
        idComoTexto(log.user_id) ??
        idComoTexto(log.identifier_id);

      if (!matricula) {
        return [];
      }

      return [
        {
          nsr,
          matricula,
          cpf: null,
          dataHora,
          codigoExterno: nsr,
          payload: {
            protocolo: "CONTROL_ID_FACE_ID",
            log,
            usuario,
          },
        },
      ];
    });

    return {
      marcacoes,
      proximoNsr: maiorNsr >= nsrInicial ? String(maiorNsr + 1) : String(nsrInicial),
      mensagem: `${marcacoes.length} marcacao(oes) lida(s) do Control iD FACE ID.`,
      payload: {
        protocolo: "CONTROL_ID_FACE_ID",
        recebidos: logs.length,
        eventoAcessoConcedido,
        incluirEventosNegados,
      },
    };
  }

  async enviarBiometrias(
    servidores: BiometriaServidorRelogioPonto[],
  ): Promise<ResultadoEnvioBiometriaRelogioPonto> {
    return {
      sucesso: false,
      mensagem:
        "Envio de biometrias para Control iD FACE ID ainda nao foi habilitado. A coleta de marcacoes pela Access API esta disponivel.",
      enviados: 0,
      rejeitados: servidores.length,
      detalhes: {
        protocolo: "CONTROL_ID_FACE_ID",
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
      .map((usuario) => ({
        codigo: idComoTexto(usuario.id),
        matricula: valorTexto(usuario.registration) ?? idComoTexto(usuario.id) ?? "",
        cpf: null,
        nome: valorTexto(usuario.name),
        payload: usuario,
      }))
      .filter((cadastro) => cadastro.matricula);

    return {
      cadastros,
      mensagem: `${cadastros.length} cadastro(s) lido(s) do Control iD FACE ID.`,
      payload: {
        protocolo: "CONTROL_ID_FACE_ID",
        offset,
        quantidade,
      },
    };
  }

  async configurarEventosOnline() {
    return {
      sucesso: false,
      mensagem:
        "Eventos online do Control iD FACE ID nao foram ativados por esta integracao. Use a coleta progressiva via Access API.",
      payload: {
        protocolo: "CONTROL_ID_FACE_ID",
      },
    };
  }
}
