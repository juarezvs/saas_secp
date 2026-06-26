import net from "node:net";
import type {
  BiometriaServidorRelogioPonto,
  RelogioPontoProvider,
  ResultadoColetaRelogioPonto,
  ResultadoEnvioBiometriaRelogioPonto,
  ResultadoSaudeRelogioPonto,
  DadosConexaoRelogioPonto,
} from "@/modules/integracoes/domain/relogio-ponto.types";

type ConfigDimepSmartPrint = {
  timeoutMs?: unknown;
  protocolo?: unknown;
  numeroSerie?: unknown;
  chaveRsaFingerprint?: unknown;
};

function lerConfig(configuracao: unknown): ConfigDimepSmartPrint {
  if (!configuracao || typeof configuracao !== "object") {
    return {};
  }

  return configuracao as ConfigDimepSmartPrint;
}

function valorNumero(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function valorTexto(valor: unknown) {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function testarPortaTcp({
  host,
  porta,
  timeoutMs,
}: {
  host: string;
  porta: number;
  timeoutMs: number;
}) {
  const inicio = Date.now();

  return new Promise<{ latenciaMs: number }>((resolve, reject) => {
    const socket = net.createConnection({
      host,
      port: porta,
      timeout: timeoutMs,
    });

    const cleanup = () => {
      socket.off("connect", onConnect);
      socket.off("error", onError);
      socket.off("timeout", onTimeout);
    };

    const onConnect = () => {
      cleanup();
      socket.destroy();
      resolve({ latenciaMs: Date.now() - inicio });
    };

    const onError = (error: Error) => {
      cleanup();
      socket.destroy();
      reject(error);
    };

    const onTimeout = () => {
      cleanup();
      socket.destroy();
      reject(new Error("Tempo limite ao conectar no REP Dimep Smart Print."));
    };

    socket.once("connect", onConnect);
    socket.once("error", onError);
    socket.once("timeout", onTimeout);
  });
}

export class DimepSmartPrintClient implements RelogioPontoProvider {
  private readonly timeoutMs: number;
  private readonly config: ConfigDimepSmartPrint;

  constructor(private readonly conexao: DadosConexaoRelogioPonto) {
    this.config = lerConfig(conexao.configuracao);
    this.timeoutMs =
      conexao.timeoutMs ??
      valorNumero(this.config.timeoutMs) ??
      Number(process.env.DIMEP_SMART_PRINT_TIMEOUT_MS ?? 10000);
  }

  async testarConexao(): Promise<ResultadoSaudeRelogioPonto> {
    try {
      const resultado = await testarPortaTcp({
        host: this.conexao.ip,
        porta: this.conexao.porta,
        timeoutMs: this.timeoutMs,
      });

      return {
        status: "DEGRADADO",
        mensagem:
          "REP Dimep Smart Print acessivel na rede. Protocolo de dados requer SDK/protocolo oficial Dimep.",
        dataHoraConsulta: new Date(),
        detalhes: {
          protocolo: "DIMEP_SMART_PRINT",
          modelo: this.conexao.modelo,
          codigo: this.conexao.codigo,
          porta: this.conexao.porta,
          latenciaMs: resultado.latenciaMs,
          numeroSerie: valorTexto(this.config.numeroSerie),
          chaveRsaFingerprint: valorTexto(this.config.chaveRsaFingerprint),
          integracaoDados: "PENDENTE_SDK_OFICIAL",
        },
      };
    } catch (error) {
      return {
        status: "OFFLINE",
        mensagem:
          error instanceof Error
            ? error.message
            : "Nao foi possivel conectar ao REP Dimep Smart Print.",
        dataHoraConsulta: new Date(),
        detalhes: {
          protocolo: "DIMEP_SMART_PRINT",
          modelo: this.conexao.modelo,
          codigo: this.conexao.codigo,
          porta: this.conexao.porta,
        },
      };
    }
  }

  async coletarMarcacoesDesdeNsr(): Promise<ResultadoColetaRelogioPonto> {
    throw new Error(
      "Coleta TCP/IP do Dimep Smart Print depende do SDK/protocolo oficial. Use importacao AFD ou configure o modo Client REST quando o contrato for fornecido.",
    );
  }

  async enviarBiometrias(
    servidores: BiometriaServidorRelogioPonto[],
  ): Promise<ResultadoEnvioBiometriaRelogioPonto> {
    return {
      sucesso: false,
      mensagem:
        "Envio de biometrias para Dimep Smart Print depende do SDK/protocolo oficial e do formato de template homologado.",
      enviados: 0,
      rejeitados: servidores.length,
      detalhes: {
        protocolo: "DIMEP_SMART_PRINT",
        motivo: "Templates proprietarios nao sao convertidos sem SDK/matcher do fabricante.",
      },
    };
  }

  async configurarEventosOnline() {
    return {
      sucesso: false,
      mensagem:
        "Modo Client REST/TCP do Dimep Smart Print exige contrato de endpoints/payloads do fabricante antes de gravar configuracao.",
      payload: {
        protocolo: "DIMEP_SMART_PRINT",
      },
    };
  }
}
