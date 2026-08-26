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

type RespostaHenryRep = {
  indice: string;
  comando: string;
  status: string;
  dados: string;
  bruto: Buffer;
  checksumValido: boolean;
};

type ConfigHenryRep = {
  timeoutMs?: unknown;
  protocolo?: unknown;
  quantidadeMaximaColeta?: unknown;
};

const START_BYTE = 0x02;
const END_BYTE = 0x03;
const STATUS_OK = new Set(["0", "00", "000", "1", "01", "001"]);

const STATUS_HENRY_REP: Record<string, string> = {
  "000": "Comando executado com sucesso.",
  "001": "Nao ha dados.",
  "010": "Comando desconhecido.",
  "012": "Parametros invalidos.",
  "013": "Erro de checksum.",
  "022": "Usuario nao cadastrado.",
  "028": "Equipamento nao possui eventos.",
  "111": "NSR invalido.",
  "113": "Registro nao encontrado.",
};

function xorChecksum(buffer: Buffer) {
  let checksum = 0;

  for (const byte of buffer) {
    checksum ^= byte;
  }

  return checksum;
}

function montarPacote(payload: string) {
  const corpo = Buffer.from(payload, "latin1");
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

function parsePacote(buffer: Buffer): RespostaHenryRep {
  if (buffer[0] !== START_BYTE) {
    throw new Error("Pacote Henry REP Web Server invalido: start byte ausente.");
  }

  const tamanho = buffer.readUInt16LE(1);
  const fim = tamanho + 4;

  if (buffer.length < fim + 1 || buffer[fim] !== END_BYTE) {
    throw new Error("Pacote Henry REP Web Server invalido: delimitador final ausente.");
  }

  const corpoBuffer = buffer.subarray(3, 3 + tamanho);
  const checksumRecebido = buffer[3 + tamanho];
  const checksumCalculado = xorChecksum(buffer.subarray(1, 3 + tamanho));
  const corpo = corpoBuffer.toString("latin1").replace(/\0+$/g, "");
  const [indice = "", comando = "", status = "", ...restante] = corpo.split("+");

  return {
    indice,
    comando,
    status,
    dados: restante.join("+"),
    bruto: buffer.subarray(0, fim + 1),
    checksumValido: checksumRecebido === checksumCalculado,
  };
}

function normalizarStatus(status: string) {
  const limpo = status.replace(/^0+(?=\d)/, "");
  return limpo || "0";
}

function statusOk(status: string) {
  return STATUS_OK.has(status) || STATUS_OK.has(normalizarStatus(status));
}

function mensagemStatus(status: string) {
  return (
    STATUS_HENRY_REP[status] ??
    STATUS_HENRY_REP[normalizarStatus(status)] ??
    `Status Henry REP Web Server ${status}.`
  );
}

function lerConfig(configuracao: unknown): ConfigHenryRep {
  return configuracao && typeof configuracao === "object"
    ? (configuracao as ConfigHenryRep)
    : {};
}

function valorNumero(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function somenteDigitos(valor: string | null | undefined) {
  return (valor ?? "").replace(/\D/g, "");
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

function normalizarIdentificadorAfdLegado(valor: string) {
  const digitos = somenteDigitos(valor);
  const semZeroInicial = digitos.replace(/^0+/, "") || digitos;
  const cpfCandidato =
    digitos.length === 12 && digitos.startsWith("0") ? digitos.slice(1) : digitos;

  if (cpfValido(cpfCandidato)) {
    return { cpf: cpfCandidato, pis: null, matricula: null };
  }

  if (semZeroInicial.length >= 10 && semZeroInicial.length <= 12) {
    return { cpf: null, pis: semZeroInicial, matricula: null };
  }

  return digitos
    ? { cpf: null, pis: null, matricula: digitos }
    : { cpf: null, pis: null, matricula: null };
}

function parseDataHoraAfdLegado(linha: string) {
  const tipo = linha.slice(9, 10);
  const base = tipo === "3" || tipo === "5" ? linha.slice(10, 22) : "";
  const match = base.match(/^(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, dia, mes, ano, hora, minuto] = match;
  const data = new Date(
    Number(ano),
    Number(mes) - 1,
    Number(dia),
    Number(hora),
    Number(minuto),
  );

  return Number.isNaN(data.getTime()) ? null : data;
}

function parseLinhaAfdLegado(linha: string): MarcacaoRelogioPonto | null {
  const original = linha.replace(/\r?\n/g, "");

  if (original.length < 34) {
    return null;
  }

  const nsr = original.slice(0, 9);
  const tipoRegistro = original.slice(9, 10);

  if (tipoRegistro !== "3") {
    return null;
  }

  const dataHora = parseDataHoraAfdLegado(original);

  if (!dataHora) {
    return null;
  }

  const identificador = original.slice(22, 34);
  const { cpf, pis, matricula } = normalizarIdentificadorAfdLegado(identificador);

  if (!cpf && !pis && !matricula) {
    return null;
  }

  return {
    nsr,
    cpf,
    pis,
    matricula,
    dataHora,
    codigoExterno: nsr,
    linhaOriginal: linha,
    payload: {
      formato: "AFD_LEGADO_HENRY",
      tipoRegistro,
      identificador,
    },
  };
}

function parseRegistroAfd(linha: string): MarcacaoRelogioPonto | null {
  const afdAtual = parseLinhaAfd(linha);

  if (afdAtual) {
    return {
      nsr: afdAtual.nsr,
      cpf: afdAtual.cpf,
      pis: afdAtual.pis,
      dataHora: afdAtual.dataHora,
      codigoExterno: afdAtual.nsr,
      linhaOriginal: linha,
      payload: afdAtual,
    };
  }

  return parseLinhaAfdLegado(linha);
}

function separarRegistrosAfd(dados: string) {
  const separadorQuantidade = dados.indexOf("]");
  const quantidadeLida =
    separadorQuantidade >= 0 ? Number(dados.slice(0, separadorQuantidade)) : null;
  const registrosTexto =
    separadorQuantidade >= 0 ? dados.slice(separadorQuantidade + 1) : dados;
  const linhas = registrosTexto
    .split(/\r\n|\n|\r/)
    .map((linha) => linha.trimEnd())
    .filter((linha) => linha.trim());

  return {
    quantidadeLida: Number.isFinite(quantidadeLida) ? quantidadeLida : null,
    linhas,
  };
}

function parseMarcacoesAfd(dados: string) {
  const { quantidadeLida, linhas } = separarRegistrosAfd(dados);
  const marcacoes = linhas
    .map(parseRegistroAfd)
    .filter((marcacao): marcacao is MarcacaoRelogioPonto => Boolean(marcacao));
  const nsrs = linhas
    .map((linha) => Number(linha.match(/^(\d{1,9})/)?.[1]))
    .filter((nsr) => Number.isFinite(nsr));
  const maiorNsr = nsrs.length > 0 ? Math.max(...nsrs) : null;

  return {
    quantidadeLida,
    linhasRecebidas: linhas.length,
    marcacoes,
    proximoNsr: maiorNsr === null ? null : String(maiorNsr + 1),
  };
}

function resolverProximoNsr(params: {
  nsrInicial: string | number;
  proximoNsrColetado: string | null;
}) {
  const inicial = Number(params.nsrInicial);
  const coletado = Number(params.proximoNsrColetado);

  if (!Number.isFinite(coletado)) {
    return Number.isFinite(inicial) ? String(inicial) : params.proximoNsrColetado;
  }

  if (!Number.isFinite(inicial)) {
    return String(coletado);
  }

  return String(Math.max(inicial, coletado));
}

function parseNumeroResposta(dados: string) {
  const numero = Number(dados.split("]").at(-1));
  return Number.isFinite(numero) ? numero : null;
}

function parseDataHoraResposta(dados: string) {
  const match = dados.match(
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

function parseEmpregador(dados: string) {
  const [indice, cnpj, cei, razaoSocial, local] = dados.split("]");

  return {
    indice: indice || null,
    cnpj: cnpj || null,
    cei: cei?.trim() || null,
    razaoSocial: razaoSocial || null,
    local: local || null,
  };
}

export class HenryRepWebServerClient implements RelogioPontoProvider {
  private socket: net.Socket | null = null;
  private indice = 1;
  private readonly timeoutMs: number;
  private readonly quantidadeMaximaColeta: number;

  constructor(private readonly conexao: DadosConexaoRelogioPonto) {
    const config = lerConfig(conexao.configuracao);
    this.timeoutMs =
      conexao.timeoutMs ??
      valorNumero(config.timeoutMs) ??
      Number(process.env.HENRY_REP_WEB_TIMEOUT_MS ?? process.env.HENRY_TIMEOUT_MS ?? 10000);
    this.quantidadeMaximaColeta = Math.min(
      Math.max(valorNumero(config.quantidadeMaximaColeta) ?? 50, 1),
      500,
    );
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
        reject(new Error("Tempo limite ao conectar no Henry REP Web Server."));
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

  private async enviarComando(
    comando: string,
    dados = "",
    timeoutMs = this.timeoutMs,
  ) {
    const socket = await this.conectar();
    const indice = this.proximoIndice();
    const payload = `${indice}+${comando}+00${dados ? `+${dados}` : ""}`;
    const pacote = montarPacote(payload);

    return new Promise<RespostaHenryRep>((resolve, reject) => {
      let recebido = Buffer.alloc(0);
      const timer = setTimeout(() => {
        cleanup();
        socket.destroy();
        if (this.socket === socket) {
          this.socket = null;
        }
        reject(new Error("Tempo limite aguardando resposta do Henry REP Web Server."));
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
          const resposta = parsePacote(recebido);

          if (!statusOk(resposta.status)) {
            throw new Error(mensagemStatus(resposta.status));
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
      const consultar = async <T>(
        consulta: () => Promise<T>,
      ): Promise<{ ok: boolean; valor: T | null; erro: unknown }> => {
        try {
          return { ok: true, valor: await consulta(), erro: null };
        } catch (error) {
          return { ok: false, valor: null, erro: error };
        }
      };
      const usuariosResultado = await consultar(() =>
        this.enviarComando("RQ", "U").then((resposta) =>
          parseNumeroResposta(resposta.dados),
        ),
      );
      const registrosResultado = await consultar(() =>
        this.enviarComando("RQ", "R").then((resposta) =>
          parseNumeroResposta(resposta.dados),
        ),
      );
      const dataHoraResultado = await consultar(() =>
        this.enviarComando("RH").then((resposta) => resposta.dados || null),
      );
      const empregadorResultado = await consultar(() =>
        this.enviarComando("RE", "T]1").then((resposta) =>
          parseEmpregador(resposta.dados),
        ),
      );
      const consultas = [
        usuariosResultado,
        registrosResultado,
        dataHoraResultado,
        empregadorResultado,
      ];

      if (!consultas.some((consulta) => consulta.ok)) {
        const primeiroErro = consultas.find((consulta) => consulta.erro)?.erro;
        throw primeiroErro instanceof Error
          ? primeiroErro
          : new Error("Henry REP Web Server nao respondeu aos comandos de status.");
      }

      const usuarios = usuariosResultado.valor;
      const registros = registrosResultado.valor;
      const dataHoraEquipamento = dataHoraResultado.valor;
      const empregador = empregadorResultado.valor;
      const dataHora = dataHoraEquipamento
        ? parseDataHoraResposta(dataHoraEquipamento)
        : null;

      return {
        status: consultas.every((consulta) => consulta.ok)
          ? "ONLINE"
          : "DEGRADADO",
        mensagem: consultas.every((consulta) => consulta.ok)
          ? "Henry REP Web Server respondeu aos comandos de status."
          : "Henry REP Web Server respondeu parcialmente aos comandos de status.",
        dataHoraConsulta: new Date(),
        quantidadeUsuarios: usuarios,
        quantidadeRegistros: registros,
        detalhes: {
          protocolo: "HENRY_REP_WEB_SERVER",
          modelo: this.conexao.modelo,
          codigo: this.conexao.codigo,
          dataHoraEquipamento,
          dataHoraEquipamentoIso: dataHora?.toISOString() ?? null,
          empregador,
          consultas: {
            usuarios: usuariosResultado.ok,
            registros: registrosResultado.ok,
            dataHora: dataHoraResultado.ok,
            empregador: empregadorResultado.ok,
          },
        },
      };
    } catch (error) {
      return {
        status: "OFFLINE",
        mensagem:
          error instanceof Error
            ? error.message
            : "Nao foi possivel consultar o Henry REP Web Server.",
        dataHoraConsulta: new Date(),
        detalhes: {
          protocolo: "HENRY_REP_WEB_SERVER",
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
      const quantidade = Math.min(
        Math.max(Number(params.quantidade ?? this.quantidadeMaximaColeta), 1),
        this.quantidadeMaximaColeta,
      );
      const timeoutColetaMs = Math.min(
        Math.max(30000, this.timeoutMs, quantidade * 350),
        120000,
      );
      const resposta = await this.enviarComando(
        "RR",
        `N]${quantidade}]${params.nsrInicial}`,
        timeoutColetaMs,
      );
      const resultado = parseMarcacoesAfd(resposta.dados);
      const proximoNsr = resolverProximoNsr({
        nsrInicial: params.nsrInicial,
        proximoNsrColetado: resultado.proximoNsr,
      });

      return {
        marcacoes: resultado.marcacoes,
        proximoNsr,
        mensagem: `${resultado.marcacoes.length} marcacao(oes) AFD coletada(s) do Henry REP Web Server.`,
        payload: {
          protocolo: "HENRY_REP_WEB_SERVER",
          quantidadeSolicitada: quantidade,
          quantidadeInformada: resultado.quantidadeLida,
          linhasRecebidas: resultado.linhasRecebidas,
          checksumValido: resposta.checksumValido,
          resposta: resposta.dados,
        },
      };
    } finally {
      this.encerrar();
    }
  }

  async analisarAfdDesdeNsr(params: {
    nsrInicial: string | number;
    quantidade?: number;
  }) {
    const resultado = await this.coletarMarcacoesDesdeNsr(params);

    return {
      registros: resultado.marcacoes.map((marcacao) => ({
        nsr: marcacao.nsr ?? "",
        dataHora: marcacao.dataHora,
        tipoRegistro: "MARCACAO" as const,
        identificador:
          marcacao.cpf ?? marcacao.pis ?? marcacao.matricula ?? "",
        tipoIdentificador: marcacao.cpf
          ? ("CPF" as const)
          : marcacao.pis
            ? ("PIS" as const)
            : ("DESCONHECIDO" as const),
        cpf: marcacao.cpf ?? null,
        pis: marcacao.pis ?? null,
        linhaOriginal: marcacao.linhaOriginal ?? null,
      })),
      proximoNsr: resultado.proximoNsr,
      mensagem: resultado.mensagem,
      payload: resultado.payload,
    };
  }

  async enviarBiometrias(
    servidores: BiometriaServidorRelogioPonto[],
  ): Promise<ResultadoEnvioBiometriaRelogioPonto> {
    void servidores;

    return {
      sucesso: false,
      mensagem:
        "Envio de biometrias para Henry REP Web Server ainda nao foi homologado.",
      enviados: 0,
      rejeitados: 0,
      detalhes: {
        protocolo: "HENRY_REP_WEB_SERVER",
      },
    };
  }

  async listarCadastrosBiometricos(): Promise<{
    cadastros: CadastroBiometricoEquipamento[];
    mensagem: string;
    payload?: unknown;
  }> {
    return {
      cadastros: [],
      mensagem:
        "Leitura de cadastros biometricos do Henry REP Web Server ainda nao foi homologada.",
      payload: {
        protocolo: "HENRY_REP_WEB_SERVER",
      },
    };
  }

  async configurarEventosOnline() {
    return {
      sucesso: false,
      mensagem:
        "Configuracao de eventos online do Henry REP Web Server ainda nao foi homologada.",
      payload: {
        protocolo: "HENRY_REP_WEB_SERVER",
      },
    };
  }

  encerrar() {
    this.socket?.destroy();
    this.socket = null;
  }
}
