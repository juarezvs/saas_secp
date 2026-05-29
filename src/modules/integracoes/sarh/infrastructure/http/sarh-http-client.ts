import type {
  SarhCargoDto,
  SarhEmpresaDto,
  SarhLotacaoDto,
  SarhLotacaoServidorDto,
  SarhPayloadCompleto,
  SarhServidorDto,
} from "../../domain/sarh.types";

export type SarhHttpClientOptions = {
  baseUrl?: string;
  timeoutMs?: number;
  headers?: HeadersInit;
};

export class SarhHttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly headers?: HeadersInit;

  constructor(options: SarhHttpClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? process.env.SARH_BASE_URL ?? "http://sarh.integracao.am.trf1.gov.br").replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? Number(process.env.SARH_TIMEOUT_MS ?? 30000);
    this.headers = options.headers;
  }

  async buscarEmpresas(): Promise<SarhEmpresaDto[]> {
    return this.getJson<SarhEmpresaDto[]>("/empresas");
  }

  async buscarLotacoes(): Promise<SarhLotacaoDto[]> {
    return this.getJson<SarhLotacaoDto[]>("/lotacao");
  }

  async buscarCargos(): Promise<SarhCargoDto[]> {
    return this.getJson<SarhCargoDto[]>("/cargos");
  }

  async buscarServidores(): Promise<SarhServidorDto[]> {
    return this.getJson<SarhServidorDto[]>("/servidores/");
  }

  async buscarLotacoesServidores(): Promise<SarhLotacaoServidorDto[]> {
    return this.getJson<SarhLotacaoServidorDto[]>("/lotacao-servidor/");
  }

  async buscarTudo(): Promise<SarhPayloadCompleto> {
    const [empresas, lotacoes, cargos, servidores, lotacoesServidores] = await Promise.all([
      this.buscarEmpresas(),
      this.buscarLotacoes(),
      this.buscarCargos(),
      this.buscarServidores(),
      this.buscarLotacoesServidores(),
    ]);

    return { empresas, lotacoes, cargos, servidores, lotacoesServidores };
  }

  private async getJson<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "GET",
        headers: this.headers,
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`SARH respondeu ${response.status} ${response.statusText} em ${path}. ${body}`.trim());
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
