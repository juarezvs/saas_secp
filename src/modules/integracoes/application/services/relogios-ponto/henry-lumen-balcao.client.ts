import net from "node:net";
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

type RespostaLumen = {
  indice: string;
  comando: string;
  status: string;
  dados: string;
  bruto: Buffer;
  corpo: string;
};

type ConfigHenryLumen = {
  timeoutMs?: unknown;
  protocolo?: unknown;
  usuario?: unknown;
  senha?: unknown;
  usuarioDados?: unknown;
  senhaDados?: unknown;
};

const START_BYTE = 0x02;
const END_BYTE = 0x03;

const STATUS_LUMEN: Record<string, string> = {
  "0": "Comando executado sem erro.",
  "00": "Comando executado sem erro.",
  "1": "Nao ha dados.",
  "01": "Nao ha dados.",
  "10": "Comando desconhecido.",
  "11": "Tamanho do pacote invalido.",
  "12": "Parametros invalidos.",
  "13": "Erro de checksum.",
  "14": "Tamanho dos parametros invalido.",
  "15": "Numero da mensagem invalido.",
  "16": "Start byte invalido.",
  "17": "Erro para receber pacote.",
  "21": "Nao ha usuarios cadastrados.",
  "22": "Usuario nao cadastrado.",
  "23": "Usuario ja cadastrado.",
  "24": "Limite de cadastro de usuarios atingido.",
  "28": "Equipamento nao possui eventos.",
  "43": "Erro ao gravar dados.",
  "44": "Erro ao ler dados.",
  "50": "Erro desconhecido.",
  "61": "Matricula ja existe.",
  "64": "Matricula nao existe.",
  "240": "Registro nao encontrado.",
  "241": "Registro ja existe.",
  "242": "Registro nao existe.",
  "243": "Limite atingido.",
  "244": "Tipo de operacao invalido.",
};

function xorChecksum(buffer: Buffer) {
  let checksum = 0;

  for (const byte of buffer) {
    checksum ^= byte;
  }

  return checksum;
}

function montarPacoteLumen({
  indice,
  comando,
  status = "00",
  dados = "",
}: {
  indice: string;
  comando: string;
  status?: string;
  dados?: string;
}) {
  const corpoTexto = `${indice}+${comando}+${status}${dados ? `+${dados}` : ""}`;
  const corpo = Buffer.from(corpoTexto, "latin1");
  const tamanho = Buffer.alloc(2);
  tamanho.writeUInt16LE(corpo.length, 0);
  const checksum = xorChecksum(Buffer.concat([tamanho, corpo]));

  return Buffer.concat([
    Buffer.from([START_BYTE]),
    tamanho,
    corpo,
    Buffer.from([checksum, END_BYTE]),
  ]);
}

function pacoteCompleto(buffer: Buffer) {
  if (buffer.length < 6 || buffer[0] !== START_BYTE) {
    return false;
  }

  const tamanho = buffer.readUInt16LE(1);
  return buffer.length >= tamanho + 5 && buffer[tamanho + 4] === END_BYTE;
}

function parsePacoteLumen(buffer: Buffer): RespostaLumen {
  if (buffer[0] !== START_BYTE || buffer[buffer.length - 1] !== END_BYTE) {
    throw new Error("Pacote Henry Lumen invalido: delimitadores ausentes.");
  }

  const tamanho = buffer.readUInt16LE(1);
  const corpoBuffer = buffer.subarray(3, 3 + tamanho);
  const checksumRecebido = buffer[3 + tamanho];
  const checksumCalculado = xorChecksum(buffer.subarray(1, 3 + tamanho));

  if (checksumRecebido !== checksumCalculado) {
    throw new Error("Pacote Henry Lumen invalido: checksum divergente.");
  }

  const corpo = corpoBuffer.toString("latin1");
  const primeiroSeparador = corpo.indexOf("+");
  const segundoSeparador = corpo.indexOf("+", primeiroSeparador + 1);
  const terceiroSeparador = corpo.indexOf("+", segundoSeparador + 1);

  if (primeiroSeparador < 0 || segundoSeparador < 0) {
    throw new Error("Pacote Henry Lumen invalido: cabecalho incompleto.");
  }

  const indice = corpo.slice(0, primeiroSeparador);
  const comando = corpo.slice(primeiroSeparador + 1, segundoSeparador);
  const status =
    terceiroSeparador >= 0
      ? corpo.slice(segundoSeparador + 1, terceiroSeparador)
      : corpo.slice(segundoSeparador + 1);
  const dados = terceiroSeparador >= 0 ? corpo.slice(terceiroSeparador + 1) : "";

  return {
    indice,
    comando,
    status,
    dados,
    bruto: buffer,
    corpo,
  };
}

function normalizarStatus(status: string) {
  const limpo = status.replace(/^0+(?=\d)/, "");
  return limpo || "0";
}

function statusLumenOk(status: string) {
  const normalizado = normalizarStatus(status);
  return normalizado === "0" || normalizado === "1";
}

function mensagemStatusLumen(status: string) {
  return (
    STATUS_LUMEN[status] ??
    STATUS_LUMEN[normalizarStatus(status)] ??
    `Status Henry Lumen ${status}.`
  );
}

function lerConfigHenryLumen(configuracao: unknown): ConfigHenryLumen {
  if (!configuracao || typeof configuracao !== "object") {
    return {};
  }

  return configuracao as ConfigHenryLumen;
}

function valorTexto(valor: unknown) {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function valorNumero(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function parseNumeroLumen(dados: string) {
  const partes = dados.split("]");
  const numero = Number(partes.at(-1));
  return Number.isFinite(numero) ? numero : null;
}

function parseDataHoraLumen(texto: string) {
  const match = texto.match(
    /(\d{2})\/(\d{2})\/(\d{2,4})\s+(\d{2}):(\d{2}):(\d{2})/,
  );

  if (!match) {
    return null;
  }

  const [, dia, mes, anoTexto, hora, minuto, segundo] = match;
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

function normalizarIdentificacao(valor: string | null | undefined) {
  const texto = (valor ?? "").trim();
  const digitos = texto.replace(/\D/g, "");

  if (digitos.length === 11) {
    return { cpf: digitos, matricula: null };
  }

  return digitos ? { cpf: null, matricula: digitos } : { cpf: null, matricula: null };
}

function normalizarStatusItem(valor: string | null | undefined) {
  const texto = String(valor ?? "").trim();
  return texto || "0";
}

function parseEventoLumen(registro: string): MarcacaoRelogioPonto | null {
  const campos = registro.split("[");

  if (campos.length < 4) {
    return null;
  }

  const [
    idRegistro,
    codigoEvento,
    identificacao,
    dataHoraTexto,
    direcao,
    indicadorAcesso,
    leitora,
    online,
  ] = campos;
  const dataHora = parseDataHoraLumen(dataHoraTexto);

  if (!dataHora) {
    return null;
  }

  const { cpf, matricula } = normalizarIdentificacao(identificacao);

  return {
    nsr: idRegistro || null,
    cpf,
    matricula,
    dataHora,
    codigoExterno: idRegistro || undefined,
    linhaOriginal: registro,
    payload: {
      idRegistro,
      codigoEvento,
      identificacao,
      direcao: direcao || null,
      indicadorAcesso: indicadorAcesso || null,
      leitora: leitora || null,
      online: online || null,
      protocolo: "HENRY_LUMEN_BALCAO",
    },
  };
}

function parseMarcacoesLumen(dados: string) {
  const inicioRegistros = dados.match(/^(\d+)[+\]](.+)$/);
  const quantidadeLida = inicioRegistros ? Number(inicioRegistros[1]) : null;
  const registrosTexto = inicioRegistros ? inicioRegistros[2] : dados;
  const registros = registrosTexto
    .split(/\](?=\d+\[)/)
    .map((registro) => registro.trim())
    .filter(Boolean);
  const marcacoes = registros
    .map(parseEventoLumen)
    .filter((item): item is MarcacaoRelogioPonto => Boolean(item));
  const ids = marcacoes
    .map((marcacao) => Number(marcacao.nsr))
    .filter((id) => Number.isFinite(id));
  const maiorId = ids.length > 0 ? Math.max(...ids) : null;

  return {
    quantidadeLida,
    linhasRecebidas: registros.length,
    marcacoes,
    proximoNsr: maiorId === null ? null : String(maiorId + 1),
  };
}

function separarQuantidadeRegistros(dados: string) {
  const inicio = dados.match(/^(\d+)[+\]](.+)$/);

  return {
    quantidade: inicio ? Number(inicio[1]) : null,
    registrosTexto: inicio ? inicio[2] : dados,
  };
}

function parseUsuarioLumen(registro: string): CadastroBiometricoEquipamento | null {
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

  return {
    codigo: matricula,
    matricula,
    nome: nome || null,
    cartoes,
    payload: {
      registro,
      qtdReferencias: qtdReferencias || null,
    },
  };
}

function parseUsuariosLumen(dados: string) {
  const { quantidade, registrosTexto } = separarQuantidadeRegistros(dados);
  const registros = registrosTexto
    .split(/\](?=[IAE]\[|\d+\[)/)
    .map((registro) => registro.trim())
    .filter(Boolean);
  const cadastros = registros
    .map(parseUsuarioLumen)
    .filter((cadastro): cadastro is CadastroBiometricoEquipamento =>
      Boolean(cadastro),
    );

  return {
    quantidade,
    registrosLidos: registros.length,
    cadastros,
  };
}

function parseListaBiometriasLumen(dados: string) {
  const { registrosTexto } = separarQuantidadeRegistros(dados);

  return registrosTexto
    .split(/[}\]\[]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => /^\d+$/.test(item));
}

function parseTemplatesBiometriaLumen(dados: string) {
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

function montarPayloadUsuarioLumen(servidor: BiometriaServidorRelogioPonto) {
  const nome = (servidor.nome ?? servidor.matricula).slice(0, 52);
  return `1+I[${servidor.matricula}[${nome}[[0[`;
}

function montarPayloadBiometriaLumen(servidor: BiometriaServidorRelogioPonto) {
  const templates = servidor.templates
    .map((template, index) => {
      const dedo = template.dedo ?? index + 1;
      return `${dedo}{${template.template}`;
    })
    .join("");

  return `D]${servidor.matricula}}${servidor.templates.length}}${templates}`;
}

export class HenryLumenBalcaoClient implements RelogioPontoProvider {
  private socket: net.Socket | null = null;
  private indice = 1;
  private readonly timeoutMs: number;
  private readonly usuario: string | null;
  private readonly senha: string | null;

  constructor(private readonly conexao: DadosConexaoRelogioPonto) {
    const config = lerConfigHenryLumen(conexao.configuracao);
    this.timeoutMs =
      conexao.timeoutMs ??
      valorNumero(config.timeoutMs) ??
      Number(process.env.HENRY_LUMEN_TIMEOUT_MS ?? process.env.HENRY_TIMEOUT_MS ?? 30000);
    this.usuario =
      conexao.usuario ??
      valorTexto(config.usuarioDados) ??
      valorTexto(config.usuario) ??
      process.env.HENRY_LUMEN_USUARIO ??
      null;
    this.senha =
      conexao.senha ??
      valorTexto(config.senhaDados) ??
      valorTexto(config.senha) ??
      process.env.HENRY_LUMEN_SENHA ??
      null;
  }

  private proximoIndice() {
    const atual = String(this.indice).padStart(2, "0").slice(-2);
    this.indice = this.indice >= 99 ? 1 : this.indice + 1;
    return atual;
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
        reject(new Error("Tempo limite ao conectar na catraca Henry Lumen."));
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

  private async enviarComando(comando: string, dados = "", timeoutMs = this.timeoutMs) {
    const socket = await this.conectar();
    const indice = this.proximoIndice();
    const pacote = montarPacoteLumen({ indice, comando, dados });

    return new Promise<RespostaLumen>((resolve, reject) => {
      let recebido = Buffer.alloc(0);
      const timer = setTimeout(() => {
        cleanup();
        socket.destroy();
        if (this.socket === socket) {
          this.socket = null;
        }
        reject(new Error("Tempo limite aguardando resposta da catraca Henry Lumen."));
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
        if (!pacoteCompleto(recebido)) {
          return;
        }

        cleanup();
        try {
          const resposta = parsePacoteLumen(recebido);

          if (!statusLumenOk(resposta.status)) {
            throw new Error(mensagemStatusLumen(resposta.status));
          }

          resolve(resposta);
        } catch (error) {
          reject(error);
        }
      };

      socket.on("data", onData);
      socket.once("error", onError);
      socket.write(pacote);
    });
  }

  async testarConexao(): Promise<ResultadoSaudeRelogioPonto> {
    try {
      const usuarios = await this.enviarComando("RQ", "U")
        .then((resposta) => parseNumeroLumen(resposta.dados))
        .catch(() => null);
      const digitais = await this.enviarComando("RQ", "D")
        .then((resposta) => parseNumeroLumen(resposta.dados))
        .catch(() => null);
      const registros = await this.enviarComando("RQ", "R")
        .then((resposta) => parseNumeroLumen(resposta.dados))
        .catch(() => null);
      const naoColetados = await this.enviarComando("RQ", "RNC")
        .then((resposta) => parseNumeroLumen(resposta.dados))
        .catch(() => null);
      const dataHora = await this.enviarComando("RH")
        .then((resposta) => resposta.dados || null)
        .catch(() => null);

      return {
        status: "ONLINE",
        mensagem: "Catraca Henry Lumen respondeu aos comandos Primme Acesso.",
        dataHoraConsulta: new Date(),
        quantidadeUsuarios: usuarios,
        quantidadeDigitais: digitais,
        quantidadeRegistros: registros,
        detalhes: {
          protocolo: "HENRY_LUMEN_BALCAO",
          modelo: this.conexao.modelo,
          codigo: this.conexao.codigo,
          registrosNaoColetados: naoColetados,
          dataHoraEquipamento: dataHora,
          usuarioConfigurado: Boolean(this.usuario),
          senhaConfigurada: Boolean(this.senha),
        },
      };
    } catch (error) {
      return {
        status: "OFFLINE",
        mensagem:
          error instanceof Error
            ? error.message
            : "Nao foi possivel consultar a catraca Henry Lumen.",
        dataHoraConsulta: new Date(),
        detalhes: {
          protocolo: "HENRY_LUMEN_BALCAO",
          modelo: this.conexao.modelo,
          codigo: this.conexao.codigo,
        },
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
      const resposta = await this.enviarComando(
        "RR",
        `T]${params.nsrInicial}]${quantidade}`,
        Math.min(Math.max(this.timeoutMs, quantidade * 300), 90000),
      );
      const resultado = parseMarcacoesLumen(resposta.dados);

      return {
        marcacoes: resultado.marcacoes,
        proximoNsr: resultado.proximoNsr,
        mensagem: `${resultado.marcacoes.length} evento(s) coletado(s) da catraca Henry Lumen.`,
        payload: {
          protocolo: "HENRY_LUMEN_BALCAO",
          quantidadeLida: resultado.quantidadeLida,
          linhasRecebidas: resultado.linhasRecebidas,
          resposta: resposta.dados,
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
            mensagem: "Cadastro sem template biometrico.",
          });
          continue;
        }

        const respostaUsuario = await this.enviarComando(
          "EU",
          montarPayloadUsuarioLumen(servidor),
        );
        const respostaBiometria = await this.enviarComando(
          "ED",
          montarPayloadBiometriaLumen(servidor),
        );
        enviados += 1;
        detalhes.push({
          matricula: servidor.matricula,
          status: normalizarStatusItem(respostaBiometria.status),
          mensagem: `Usuario: ${mensagemStatusLumen(
            respostaUsuario.status,
          )} Biometria: ${mensagemStatusLumen(respostaBiometria.status)}`,
        });
      }

      return {
        sucesso: rejeitados === 0,
        mensagem: `${enviados} cadastro(s) biometrico(s) enviado(s) para Henry Lumen.`,
        enviados,
        rejeitados,
        detalhes,
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
      const respostaUsuarios = await this.enviarComando(
        "RU",
        `${quantidade}]${indiceInicial}`,
        Math.min(Math.max(this.timeoutMs, quantidade * 350), 120000),
      );
      const resultadoUsuarios = parseUsuariosLumen(respostaUsuarios.dados);
      let cadastros = resultadoUsuarios.cadastros;
      let matriculasComBiometria: string[] = [];

      if (params?.incluirTemplates) {
        const respostaLista = await this.enviarComando(
          "RD",
          `L]${quantidade}}${indiceInicial}`,
          Math.min(Math.max(this.timeoutMs, quantidade * 350), 120000),
        ).catch(() => null);
        matriculasComBiometria = respostaLista
          ? parseListaBiometriasLumen(respostaLista.dados)
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
            this.timeoutMs,
          ).catch(() => null);

          if (!respostaTemplate) {
            continue;
          }

          const biometria = parseTemplatesBiometriaLumen(respostaTemplate.dados);
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
        mensagem: `${cadastros.length} cadastro(s) lido(s) da catraca Henry Lumen.`,
        payload: {
          protocolo: "HENRY_LUMEN_BALCAO",
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

  async configurarEventosOnline() {
    return {
      sucesso: false,
      mensagem:
        "Configuracao REON/online da Henry Lumen Balcao LT exige validacao em bancada antes de gravar parametros.",
      payload: {
        protocolo: "HENRY_LUMEN_BALCAO",
      },
    };
  }

  encerrar() {
    this.socket?.destroy();
    this.socket = null;
  }
}
