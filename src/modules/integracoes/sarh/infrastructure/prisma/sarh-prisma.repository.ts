import type { prisma as prismaClient } from "@/shared/infrastructure/database/prisma";
import { garantirJornadaPadraoServidorService } from "@/modules/jornadas/application/services/garantir-jornada-padrao-servidor.service";

import type {
  OperacaoRegistroSarhDb,
  ResultadoItemSarh,
  SarhAfastamentoDto,
  SarhCalendarioDto,
  SarhCargoDto,
  SarhChefiaDto,
  SarhEmpresaDto,
  SarhEndpointKey,
  SarhLotacaoDto,
  SarhLotacaoServidorDto,
  SarhServidorDto,
  SarhTipoAfastamentoDto,
  TipoEndpointSarhDb,
  TipoExecucaoSarh,
  TipoRegistroSarhDb,
} from "../../domain/sarh.types";
import {
  endpointDbFromKey,
  gerarHashRegistro,
  isLotacaoServidorDesligado,
  limparTexto,
  normalizarCpf,
  normalizarDataSarh,
  normalizarMatricula,
  obterChaveExterna,
  tipoRegistroDbFromEndpoint,
} from "../../domain/sarh-normalizer";
import {
  mapearCargoSarh,
  mapearOrgaoSarh,
  mapearServidorSarh,
  mapearUnidadeSarh,
  mapearUsuarioServidorSarh,
} from "../../application/sarh-mapper";

type PrismaLike = typeof prismaClient;

type PrismaUniqueConstraintError = {
  code: "P2002";
};

type Execucao = {
  id: string;
  iniciadoEm: Date;
};

type ContadoresExecucao = {
  totalRecebidos: number;
  totalCriados: number;
  totalAtualizados: number;
  totalInativados: number;
  totalIgnorados: number;
  totalErros: number;
  totalConflitos: number;
};

type ServidorAfastamentoSarh = {
  id: string;
  matricula: string;
  cpf: string | null;
};

type TipoAfastamentoSarhExistente = {
  id: string;
  codigoExternoSarh: number;
};

type AfastamentoSarhExistente = Awaited<
  ReturnType<PrismaLike["afastamentoSarh"]["findUnique"]>
>;

export type CacheAfastamentosSarh = {
  servidoresPorMatricula: Map<string, ServidorAfastamentoSarh>;
  servidoresPorCpf: Map<string, ServidorAfastamentoSarh>;
  tiposPorCodigo: Map<number, TipoAfastamentoSarhExistente>;
  afastamentosPorCodigo: Map<string, NonNullable<AfastamentoSarhExistente>>;
};

type JsonInputValue =
  string | number | boolean | JsonInputObject | JsonInputArray;

type JsonInputObject = {
  [key: string]: JsonInputValue | null;
};

type JsonInputArray = Array<JsonInputValue | null>;

const CONTADORES_ZERO: ContadoresExecucao = {
  totalRecebidos: 0,
  totalCriados: 0,
  totalAtualizados: 0,
  totalInativados: 0,
  totalIgnorados: 0,
  totalErros: 0,
  totalConflitos: 0,
};

function isPrismaUniqueConstraintError(
  error: unknown,
): error is PrismaUniqueConstraintError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function toJsonInput(valor: unknown): JsonInputValue | undefined {
  if (valor === undefined || valor === null) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(valor)) as JsonInputValue;
}

function jsonObject(valor: unknown): JsonInputObject {
  const convertido = toJsonInput(valor);

  if (
    convertido &&
    typeof convertido === "object" &&
    !Array.isArray(convertido)
  ) {
    return convertido;
  }

  return {};
}

function gerarCodigoUnidadeSarhAlternativo(
  codigoBase: string,
  codigoExternoSarh: number,
) {
  const sufixo = `-${codigoExternoSarh}`;
  return `${codigoBase.slice(0, 80 - sufixo.length)}${sufixo}`;
}

function normalizarBooleanoSarh(valor: string | boolean | null | undefined) {
  if (typeof valor === "boolean") {
    return valor;
  }

  if (valor === null || valor === undefined) {
    return null;
  }

  const texto = String(valor).trim().toUpperCase();

  if (["S", "SIM", "1", "TRUE"].includes(texto)) {
    return true;
  }

  if (["N", "NAO", "NÃO", "0", "FALSE"].includes(texto)) {
    return false;
  }

  return null;
}

function fimAfastamentoParaConsulta(dataFim: Date | null) {
  if (!dataFim) {
    return null;
  }

  const fim = new Date(dataFim);
  fim.setUTCDate(fim.getUTCDate() + 1);
  return fim;
}

export class SarhPrismaRepository {
  constructor(
    private readonly prisma: PrismaLike,
    private readonly orgaoId?: string | null,
  ) {}

  async obterOuCriarIntegracaoSarh() {
    const existente = await this.prisma.integracaoSistema.findFirst({
      where: {
        tipo: "SARH",
        orgaoId: this.orgaoId ?? null,
      },
      orderBy: { atualizadoEm: "desc" },
    });

    if (existente) return existente;

    return this.prisma.integracaoSistema.create({
      data: {
        nome: "SARH - Sistema de Gestão de Recursos Humanos",
        orgaoId: this.orgaoId ?? null,
        tipo: "SARH",
        status: "NAO_CONFIGURADA",
        direcao: "ENTRADA",
        baseUrl: null,
        ativo: true,
        descricao:
          "Integração para sincronizar empresas, lotações, cargos, servidores e vínculos de lotação do SARH.",
        configuracao: {
          endpoints: {
            empresas: "/empresas",
            lotacoes: "/lotacao",
            cargos: "/cargos",
            servidores: "/servidores/",
            lotacoesServidores: "/lotacao-servidor/",
            tiposAfastamento: "/tipo-afastamento/",
            afastamentos: "/afastamentos/",
          },
          provider: "oracle",
          siglaLocalidade:
            process.env.SARH_SIGLA_LOCALIDADE ??
            process.env.SIGLA_LOCALIDADE ??
            "AM",
        },
      },
    });
  }

  async criarExecucao(params: {
    integracaoId: string;
    tipo: TipoExecucaoSarh;
    modoSimulacao: boolean;
    iniciadoPorUsuarioId?: string | null;
    metadados?: Record<string, unknown>;
  }): Promise<Execucao> {
    return this.prisma.integracaoSarhExecucao.create({
      data: {
        integracaoId: params.integracaoId,
        iniciadoPorUsuarioId: params.iniciadoPorUsuarioId ?? null,
        tipo: params.tipo,
        status: "EM_EXECUCAO",
        modoSimulacao: params.modoSimulacao,
        metadados: jsonObject(params.metadados),
      },
    });
  }

  async finalizarExecucao(params: {
    execucaoId: string;
    iniciadoEm: Date;
    contadores: ContadoresExecucao;
    erro?: string;
  }) {
    const finalizadoEm = new Date();
    const duracaoMs = finalizadoEm.getTime() - params.iniciadoEm.getTime();
    const status = params.erro
      ? "FALHOU"
      : params.contadores.totalErros > 0 || params.contadores.totalConflitos > 0
        ? "CONCLUIDA_COM_ERROS"
        : "CONCLUIDA";

    return this.prisma.integracaoSarhExecucao.update({
      where: { id: params.execucaoId },
      data: {
        status,
        ...params.contadores,
        totalErros: params.erro
          ? params.contadores.totalErros + 1
          : params.contadores.totalErros,
        mensagemErro: params.erro ?? null,
        finalizadoEm,
        duracaoMs,
      },
    });
  }

  async registrarLog(params: {
    integracaoId: string;
    status: "SUCESSO" | "ERRO" | "PENDENTE" | "IGNORADO";
    mensagem?: string;
    erro?: string;
    payloadEntrada?: unknown;
    payloadSaida?: unknown;
    metadados?: Record<string, unknown>;
    iniciadoEm?: Date;
  }) {
    const iniciadoEm = params.iniciadoEm ?? new Date();
    const finalizadoEm = new Date();

    const payloadEntrada = toJsonInput(params.payloadEntrada);
    const payloadSaida = toJsonInput(params.payloadSaida);

    return this.prisma.logIntegracao.create({
      data: {
        integracaoId: params.integracaoId,
        tipo: "SARH",
        direcao: "ENTRADA",
        status: params.status,
        entidade: "IntegracaoSarhExecucao",
        mensagem: params.mensagem,
        erro: params.erro,
        ...(payloadEntrada !== undefined ? { payloadEntrada } : {}),
        ...(payloadSaida !== undefined ? { payloadSaida } : {}),
        metadados: jsonObject(params.metadados),
        iniciadoEm,
        finalizadoEm,
        duracaoMs: finalizadoEm.getTime() - iniciadoEm.getTime(),
      },
    });
  }

  async registrarPayloadBruto(params: {
    execucaoId: string;
    endpoint: SarhEndpointKey;
    payload: unknown;
  }) {
    const endpoint = endpointDbFromKey(params.endpoint);
    const tipoRegistro = tipoRegistroDbFromEndpoint(params.endpoint);
    const chaveExterna = obterChaveExterna(params.endpoint, params.payload);
    const hashRegistro = gerarHashRegistro(params.payload);
    const payload = toJsonInput(params.payload) ?? {};

    try {
      return await this.prisma.registroBrutoSarh.create({
        data: {
          execucaoId: params.execucaoId,
          endpoint,
          tipoRegistro,
          chaveExterna,
          hashRegistro,
          payload,
        },
      });
    } catch (error: unknown) {
      if (isPrismaUniqueConstraintError(error)) {
        return this.prisma.registroBrutoSarh.findFirst({
          where: { tipoRegistro, chaveExterna, hashRegistro },
        });
      }

      throw error;
    }
  }

  async registrarItem(
    execucaoId: string,
    endpoint: TipoEndpointSarhDb,
    item: ResultadoItemSarh,
    registroBrutoId?: string | null,
  ) {
    const dadosAntes = toJsonInput(item.dadosAntes);
    const dadosDepois = toJsonInput(item.dadosDepois);

    return this.prisma.integracaoSarhItem.create({
      data: {
        execucaoId,
        registroBrutoId: registroBrutoId ?? null,
        endpoint,
        tipoRegistro: item.tipoRegistro,
        chaveExterna: item.chaveExterna,
        operacao: item.operacao,
        status: item.status,
        entidadeInterna: item.entidadeInterna,
        entidadeInternaId: item.entidadeInternaId,
        mensagem: item.mensagem,
        erro: item.erro,
        ...(dadosAntes !== undefined ? { dadosAntes } : {}),
        ...(dadosDepois !== undefined ? { dadosDepois } : {}),
        metadados: jsonObject(item.metadados),
      },
    });
  }

  async processarTipoAfastamento(params: {
    execucaoId: string;
    payload: SarhTipoAfastamentoDto;
    modoSimulacao: boolean;
    registroBrutoId?: string | null;
  }) {
    const endpoint: TipoEndpointSarhDb = "TIPOS_AFASTAMENTO";
    const chaveExterna = String(params.payload.codigo);
    const existente = await this.prisma.tipoAfastamentoSarh.findUnique({
      where: { codigoExternoSarh: params.payload.codigo },
    });
    const data = {
      codigoExternoSarh: params.payload.codigo,
      descricao:
        limparTexto(params.payload.descricao) ??
        `Tipo de afastamento SARH ${params.payload.codigo}`,
      categoria: limparTexto(params.payload.categoria) ?? "OUTRO",
      remunerada: normalizarBooleanoSarh(params.payload.remunerada),
      aplicavelServidor: normalizarBooleanoSarh(params.payload.servidor),
      aplicavelJuiz: normalizarBooleanoSarh(params.payload.juiz),
      dataInicioVigencia: normalizarDataSarh(params.payload.dataInicioVigencia),
      dataFimVigencia: normalizarDataSarh(params.payload.dataFimVigencia),
      origemSarh: true,
      payloadSarh: toJsonInput(params.payload),
      ultimaSincronizacaoSarh: new Date(),
    };
    const operacao: OperacaoRegistroSarhDb = existente ? "ATUALIZAR" : "CRIAR";

    if (params.modoSimulacao) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "TIPO_AFASTAMENTO",
          chaveExterna,
          operacao,
          status: "PROCESSADO",
          entidadeInterna: "TipoAfastamentoSarh",
          entidadeInternaId: existente?.id,
          mensagem: `Simulação: tipo de afastamento ${chaveExterna} seria ${
            existente ? "atualizado" : "criado"
          }.`,
          dadosAntes: existente,
          dadosDepois: data,
          metadados: { modoSimulacao: true },
        },
        params.registroBrutoId,
      );

      return operacao;
    }

    const salvo = existente
      ? await this.prisma.tipoAfastamentoSarh.update({
          where: { id: existente.id },
          data,
        })
      : await this.prisma.tipoAfastamentoSarh.create({ data });

    await this.upsertMapeamento(
      "TIPO_AFASTAMENTO",
      chaveExterna,
      "TipoAfastamentoSarh",
      salvo.id,
      gerarHashRegistro(params.payload),
    );

    await this.registrarItem(
      params.execucaoId,
      endpoint,
      {
        tipoRegistro: "TIPO_AFASTAMENTO",
        chaveExterna,
        operacao,
        status: "PROCESSADO",
        entidadeInterna: "TipoAfastamentoSarh",
        entidadeInternaId: salvo.id,
        dadosAntes: existente,
        dadosDepois: salvo,
      },
      params.registroBrutoId,
    );

    return operacao;
  }

  async processarAfastamento(params: {
    execucaoId: string;
    payload: SarhAfastamentoDto;
    modoSimulacao: boolean;
    registroBrutoId?: string | null;
    cache?: {
      servidorId?: string | null;
      tipoAfastamentoId?: string | null;
      existente?: AfastamentoSarhExistente;
    };
  }) {
    const endpoint: TipoEndpointSarhDb = "AFASTAMENTOS";
    const chaveExterna = String(params.payload.id);
    const dataInicio = normalizarDataSarh(params.payload.dataInicio);

    if (!dataInicio) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "AFASTAMENTO",
          chaveExterna,
          operacao: "IGNORAR",
          status: "IGNORADO",
          mensagem: "Afastamento SARH sem data inicial.",
          dadosDepois: params.payload,
        },
        params.registroBrutoId,
      );

      return "IGNORAR" as OperacaoRegistroSarhDb;
    }

    const matricula = params.payload.matricula
      ? normalizarMatricula(params.payload.matricula)
      : null;
    const cpf = normalizarCpf(params.payload.cpf);
    const servidorIdCache = params.cache?.servidorId;
    const filtrosServidor =
      servidorIdCache === undefined
        ? [
            ...(matricula ? [{ matricula }] : []),
            ...(cpf ? [{ cpf }] : []),
          ]
        : [];
    const servidor =
      servidorIdCache !== undefined
        ? servidorIdCache
          ? { id: servidorIdCache }
          : null
        : filtrosServidor.length
          ? await this.prisma.servidor.findFirst({
              where: { OR: filtrosServidor },
              select: { id: true },
            })
          : null;
    const tipoCodigo = params.payload.tipoCodigo
      ? String(params.payload.tipoCodigo)
      : null;
    const tipoAfastamentoIdCache = params.cache?.tipoAfastamentoId;
    const tipoAfastamento =
      tipoAfastamentoIdCache !== undefined
        ? tipoAfastamentoIdCache
          ? { id: tipoAfastamentoIdCache }
          : null
        : tipoCodigo
          ? await this.prisma.tipoAfastamentoSarh.findUnique({
              where: { codigoExternoSarh: Number(tipoCodigo) || -1 },
              select: { id: true },
            })
          : null;
    const existente =
      params.cache && "existente" in params.cache
        ? params.cache.existente
        : await this.prisma.afastamentoSarh.findUnique({
            where: { codigoExternoSarh: chaveExterna },
          });
    const dataFim = normalizarDataSarh(params.payload.dataFim);
    const fimConsulta = fimAfastamentoParaConsulta(dataFim);
    const data = {
      codigoExternoSarh: chaveExterna,
      servidorId: servidor?.id ?? null,
      tipoAfastamentoId: tipoAfastamento?.id ?? null,
      categoria: limparTexto(params.payload.categoria) ?? "OUTRO",
      tipoCodigo,
      tipoDescricao: limparTexto(params.payload.tipoDescricao),
      matricula,
      cpf,
      nome: limparTexto(params.payload.nome),
      dataInicio,
      dataFim,
      dias: params.payload.dias,
      exercicio: params.payload.exercicio,
      processo: limparTexto(params.payload.processo),
      observacao: limparTexto(params.payload.observacao),
      origemTabela: limparTexto(params.payload.origemTabela) ?? "SARH",
      ativo: fimConsulta === null || fimConsulta >= new Date(),
      origemSarh: true,
      payloadSarh: toJsonInput(params.payload),
      ultimaSincronizacaoSarh: new Date(),
    };
    const operacao: OperacaoRegistroSarhDb = existente ? "ATUALIZAR" : "CRIAR";

    if (params.modoSimulacao) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "AFASTAMENTO",
          chaveExterna,
          operacao,
          status: "PROCESSADO",
          entidadeInterna: "AfastamentoSarh",
          entidadeInternaId: existente?.id,
          mensagem: `Simulação: afastamento ${chaveExterna} seria ${
            existente ? "atualizado" : "criado"
          }.`,
          dadosAntes: existente,
          dadosDepois: data,
          metadados: {
            modoSimulacao: true,
            servidorEncontrado: Boolean(servidor),
            tipoEncontrado: Boolean(tipoAfastamento),
          },
        },
        params.registroBrutoId,
      );

      return operacao;
    }

    const salvo = existente
      ? await this.prisma.afastamentoSarh.update({
          where: { id: existente.id },
          data,
        })
      : await this.prisma.afastamentoSarh.create({ data });

    await this.upsertMapeamento(
      "AFASTAMENTO",
      chaveExterna,
      "AfastamentoSarh",
      salvo.id,
      gerarHashRegistro(params.payload),
    );

    await this.registrarItem(
      params.execucaoId,
      endpoint,
      {
        tipoRegistro: "AFASTAMENTO",
        chaveExterna,
        operacao,
        status: "PROCESSADO",
        entidadeInterna: "AfastamentoSarh",
        entidadeInternaId: salvo.id,
        dadosAntes: existente,
        dadosDepois: salvo,
        metadados: {
          servidorEncontrado: Boolean(servidor),
          tipoEncontrado: Boolean(tipoAfastamento),
        },
      },
      params.registroBrutoId,
    );

    return operacao;
  }

  async processarCalendario(params: {
    execucaoId: string;
    payload: SarhCalendarioDto;
    modoSimulacao: boolean;
    registroBrutoId?: string | null;
  }) {
    const endpoint: TipoEndpointSarhDb = "CALENDARIOS";
    const chaveExterna = params.payload.id;
    const dataReferencia = normalizarDataSarh(params.payload.data);

    if (!dataReferencia) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "CALENDARIO",
          chaveExterna,
          operacao: "IGNORAR",
          status: "IGNORADO",
          mensagem: "Calendário SARH sem data de referência.",
          dadosDepois: params.payload,
        },
        params.registroBrutoId,
      );

      return "IGNORAR" as OperacaoRegistroSarhDb;
    }

    const orgao = await this.obterOrgaoPadrao();
    const observacaoOrigem = `Origem SARH: ${params.payload.origemTabela}; Código: ${chaveExterna}`;
    const mapeamento = await this.prisma.mapeamentoExterno.findUnique({
      where: {
        sistema_tipoRegistro_codigoExterno: {
          sistema: "SARH",
          tipoRegistro: "CALENDARIO",
          codigoExterno: chaveExterna,
        },
      },
    });
    const existente =
      mapeamento?.entidadeInternaId
        ? await this.prisma.calendarioInstitucional.findUnique({
            where: { id: mapeamento.entidadeInternaId },
          })
        : await this.prisma.calendarioInstitucional.findFirst({
            where: {
              dataReferencia,
              descricao: limparTexto(params.payload.descricao) ?? "Calendário SARH",
              observacao: { contains: observacaoOrigem },
            },
          });
    const data = {
      dataReferencia,
      descricao: limparTexto(params.payload.descricao) ?? "Calendário SARH",
      tipo: params.payload.tipo,
      abrangencia: params.payload.abrangencia,
      uf: limparTexto(params.payload.uf),
      municipio: null,
      municipioIbge: null,
      orgaoId:
        params.payload.abrangencia === "ORGAO" ||
        params.payload.abrangencia === "UNIDADE"
          ? orgao.id
          : null,
      unidadeId: null,
      contaComoDiaUtil: false,
      geraApuracaoRegular: false,
      janelaInicio: null,
      janelaFim: null,
      dataOriginal: null,
      dataSubstituida: false,
      observacao: observacaoOrigem,
      ativo: params.payload.ativo,
    };
    const operacao: OperacaoRegistroSarhDb = existente ? "ATUALIZAR" : "CRIAR";

    if (params.modoSimulacao) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "CALENDARIO",
          chaveExterna,
          operacao,
          status: "PROCESSADO",
          entidadeInterna: "CalendarioInstitucional",
          entidadeInternaId: existente?.id,
          mensagem: `Simulação: calendário ${data.descricao} em ${params.payload.data} seria ${
            existente ? "atualizado" : "criado"
          }.`,
          dadosAntes: existente,
          dadosDepois: data,
          metadados: {
            modoSimulacao: true,
            origemTabela: params.payload.origemTabela,
            metadadosSarh: params.payload.metadados,
          },
        },
        params.registroBrutoId,
      );

      return operacao;
    }

    const salvo = existente
      ? await this.prisma.calendarioInstitucional.update({
          where: { id: existente.id },
          data,
        })
      : await this.prisma.calendarioInstitucional.create({ data });

    await this.upsertMapeamento(
      "CALENDARIO",
      chaveExterna,
      "CalendarioInstitucional",
      salvo.id,
      gerarHashRegistro(params.payload),
    );

    await this.registrarItem(
      params.execucaoId,
      endpoint,
      {
        tipoRegistro: "CALENDARIO",
        chaveExterna,
        operacao,
        status: "PROCESSADO",
        entidadeInterna: "CalendarioInstitucional",
        entidadeInternaId: salvo.id,
        dadosAntes: existente,
        dadosDepois: salvo,
        metadados: {
          origemTabela: params.payload.origemTabela,
          metadadosSarh: params.payload.metadados,
        },
      },
      params.registroBrutoId,
    );

    return operacao;
  }

  async prepararCacheAfastamentos(
    afastamentos: SarhAfastamentoDto[],
  ): Promise<CacheAfastamentosSarh> {
    const orgao = await this.obterOrgaoPadrao();
    const matriculas = new Set<string>();
    const cpfs = new Set<string>();
    const tipos = new Set<number>();
    const codigosExternos = new Set<string>();

    for (const afastamento of afastamentos) {
      const matricula = afastamento.matricula
        ? normalizarMatricula(afastamento.matricula)
        : null;
      const cpf = normalizarCpf(afastamento.cpf);
      const tipoCodigo = afastamento.tipoCodigo
        ? Number(afastamento.tipoCodigo)
        : null;

      if (matricula) matriculas.add(matricula);
      if (cpf) cpfs.add(cpf);
      if (tipoCodigo && Number.isFinite(tipoCodigo)) tipos.add(tipoCodigo);
      codigosExternos.add(String(afastamento.id));
    }

    const [servidores, tiposAfastamento, afastamentosExistentes] =
      await Promise.all([
        matriculas.size || cpfs.size
          ? this.prisma.servidor.findMany({
              where: {
                orgaoId: orgao.id,
                OR: [
                  ...(matriculas.size
                    ? [{ matricula: { in: Array.from(matriculas) } }]
                    : []),
                  ...(cpfs.size ? [{ cpf: { in: Array.from(cpfs) } }] : []),
                ],
              },
              select: { id: true, matricula: true, cpf: true },
            })
          : [],
        tipos.size
          ? this.prisma.tipoAfastamentoSarh.findMany({
              where: { codigoExternoSarh: { in: Array.from(tipos) } },
              select: { id: true, codigoExternoSarh: true },
            })
          : [],
        codigosExternos.size
          ? this.prisma.afastamentoSarh.findMany({
              where: { codigoExternoSarh: { in: Array.from(codigosExternos) } },
            })
          : [],
      ]);

    const servidoresPorMatricula = new Map<string, ServidorAfastamentoSarh>();
    const servidoresPorCpf = new Map<string, ServidorAfastamentoSarh>();

    for (const servidor of servidores) {
      servidoresPorMatricula.set(servidor.matricula, servidor);

      if (servidor.cpf) {
        servidoresPorCpf.set(servidor.cpf, servidor);
      }
    }

    return {
      servidoresPorMatricula,
      servidoresPorCpf,
      tiposPorCodigo: new Map(
        tiposAfastamento.map((tipo) => [tipo.codigoExternoSarh, tipo]),
      ),
      afastamentosPorCodigo: new Map(
        afastamentosExistentes.map((afastamento) => [
          afastamento.codigoExternoSarh,
          afastamento,
        ]),
      ),
    };
  }

  async processarChefia(params: {
    execucaoId: string;
    payload: SarhChefiaDto;
    modoSimulacao: boolean;
    registroBrutoId?: string | null;
  }) {
    const endpoint: TipoEndpointSarhDb = "CHEFIAS";
    const chaveExterna = `${params.payload.lotacaoId}:${params.payload.idFuncaoLotacao}`;
    const orgao = await this.obterOrgaoPadrao();
    const unidade = await this.prisma.unidadeOrganizacional.findFirst({
      where: { orgaoId: orgao.id, codigoExternoSarh: params.payload.lotacaoId },
      select: { id: true, sigla: true },
    });

    if (!unidade) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "CHEFIA",
          chaveExterna,
          operacao: "ERRO",
          status: "ERRO",
          erro: `Unidade SARH ${params.payload.lotacaoId} não encontrada para vincular chefia.`,
          dadosDepois: params.payload,
        },
        params.registroBrutoId,
      );

      return "ERRO" as OperacaoRegistroSarhDb;
    }

    const matricula = params.payload.matricula
      ? normalizarMatricula(params.payload.matricula)
      : null;
    const flagAtiva = normalizarBooleanoSarh(params.payload.flagAtiva);
    const flagOcupado = normalizarBooleanoSarh(params.payload.flagOcupado);
    const situacao = limparTexto(params.payload.situacao)?.toUpperCase() ?? "";
    const chefiaVigente =
      Boolean(matricula) &&
      flagAtiva !== false &&
      flagOcupado !== false &&
      (!situacao || situacao.includes("TITULAR"));
    const gestorTitularAtual = await this.prisma.gestorUnidade.findFirst({
      where: {
        unidadeId: unidade.id,
        papel: "GESTOR_TITULAR",
        ativo: true,
      },
      include: { servidor: { select: { matricula: true } } },
    });

    if (!chefiaVigente || !matricula) {
      const operacao: OperacaoRegistroSarhDb = gestorTitularAtual
        ? "INATIVAR"
        : "IGNORAR";

      if (!params.modoSimulacao && gestorTitularAtual) {
        await this.prisma.gestorUnidade.update({
          where: { id: gestorTitularAtual.id },
          data: { ativo: false, dataFim: new Date() },
        });
      }

      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "CHEFIA",
          chaveExterna,
          operacao,
          status: operacao === "IGNORAR" ? "IGNORADO" : "PROCESSADO",
          entidadeInterna: "GestorUnidade",
          entidadeInternaId: gestorTitularAtual?.id,
          mensagem: gestorTitularAtual
            ? `Chefia titular da unidade ${unidade.sigla} seria encerrada por ausencia de titular vigente no SARH.`
            : `Chefia SARH ${chaveExterna} ignorada por ausencia de titular vigente.`,
          dadosAntes: gestorTitularAtual,
          dadosDepois: params.payload,
          metadados: { modoSimulacao: params.modoSimulacao },
        },
        params.registroBrutoId,
      );

      return operacao;
    }

    const servidor = await this.prisma.servidor.findFirst({
      where: { matricula, orgaoId: orgao.id },
      select: { id: true, matricula: true },
    });

    if (!servidor) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "CHEFIA",
          chaveExterna,
          operacao: "ERRO",
          status: "ERRO",
          erro: `Servidor ${matricula} não encontrado para vincular chefia da unidade ${unidade.sigla}.`,
          dadosDepois: params.payload,
        },
        params.registroBrutoId,
      );

      return "ERRO" as OperacaoRegistroSarhDb;
    }

    const mesmaChefia = gestorTitularAtual?.servidorId === servidor.id;
    const operacao: OperacaoRegistroSarhDb = gestorTitularAtual
      ? "ATUALIZAR"
      : "CRIAR";
    const dataInicio =
      normalizarDataSarh(params.payload.dataInicio) ?? new Date();

    if (params.modoSimulacao) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "CHEFIA",
          chaveExterna,
          operacao,
          status: "PROCESSADO",
          entidadeInterna: "GestorUnidade",
          entidadeInternaId: gestorTitularAtual?.id,
          mensagem: mesmaChefia
            ? `Simulação: chefia titular de ${unidade.sigla} seria conferida/atualizada.`
            : `Simulação: chefia titular de ${unidade.sigla} seria definida para ${matricula}.`,
          dadosAntes: gestorTitularAtual,
          dadosDepois: {
            unidadeId: unidade.id,
            servidorId: servidor.id,
            papel: "GESTOR_TITULAR",
            dataInicio,
          },
          metadados: { modoSimulacao: true, mesmaChefia },
        },
        params.registroBrutoId,
      );

      return operacao;
    }

    if (gestorTitularAtual && !mesmaChefia) {
      await this.prisma.gestorUnidade.update({
        where: { id: gestorTitularAtual.id },
        data: { ativo: false, dataFim: new Date() },
      });
    }

    const gestorExistenteDoServidor = await this.prisma.gestorUnidade.findFirst({
      where: {
        unidadeId: unidade.id,
        servidorId: servidor.id,
        papel: "GESTOR_TITULAR",
      },
      orderBy: { criadoEm: "desc" },
    });
    const gestor = gestorExistenteDoServidor
      ? await this.prisma.gestorUnidade.update({
          where: { id: gestorExistenteDoServidor.id },
          data: {
            ativo: true,
            dataInicio,
            dataFim: null,
          },
        })
      : await this.prisma.gestorUnidade.create({
          data: {
            unidadeId: unidade.id,
            servidorId: servidor.id,
            papel: "GESTOR_TITULAR",
            ativo: true,
            dataInicio,
          },
        });

    await this.upsertMapeamento(
      "CHEFIA",
      chaveExterna,
      "GestorUnidade",
      gestor.id,
      gerarHashRegistro(params.payload),
    );

    await this.registrarItem(
      params.execucaoId,
      endpoint,
      {
        tipoRegistro: "CHEFIA",
        chaveExterna,
        operacao,
        status: "PROCESSADO",
        entidadeInterna: "GestorUnidade",
        entidadeInternaId: gestor.id,
        dadosAntes: gestorTitularAtual,
        dadosDepois: gestor,
        metadados: {
          mesmaChefia,
          funcao: params.payload.funcaoDescricao,
          categoria: params.payload.funcaoCategoria,
        },
      },
      params.registroBrutoId,
    );

    return operacao;
  }

  async encerrarChefiasAusentesServidorSarh(params: {
    execucaoId: string;
    matricula: string;
    lotacoesVigentesSarh: number[];
    modoSimulacao: boolean;
  }) {
    const matricula = normalizarMatricula(params.matricula);
    const orgao = await this.obterOrgaoPadrao();
    const servidor = await this.prisma.servidor.findFirst({
      where: { matricula, orgaoId: orgao.id },
      select: { id: true },
    });

    if (!servidor) {
      return [] as OperacaoRegistroSarhDb[];
    }

    const gestoresAtivos = await this.prisma.gestorUnidade.findMany({
      where: {
        servidorId: servidor.id,
        papel: "GESTOR_TITULAR",
        ativo: true,
        unidade: { orgaoId: orgao.id, codigoExternoSarh: { not: null } },
      },
      include: { unidade: true },
    });
    const codigosVigentes = new Set(params.lotacoesVigentesSarh);
    const operacoes: OperacaoRegistroSarhDb[] = [];

    for (const gestor of gestoresAtivos) {
      if (
        gestor.unidade.codigoExternoSarh &&
        codigosVigentes.has(gestor.unidade.codigoExternoSarh)
      ) {
        continue;
      }

      if (!params.modoSimulacao) {
        await this.prisma.gestorUnidade.update({
          where: { id: gestor.id },
          data: { ativo: false, dataFim: new Date() },
        });
      }

      await this.registrarItem(
        params.execucaoId,
        "CHEFIAS",
        {
          tipoRegistro: "CHEFIA",
          chaveExterna: `${gestor.unidade.codigoExternoSarh ?? gestor.unidadeId}:ausente:${matricula}`,
          operacao: "INATIVAR",
          status: "PROCESSADO",
          entidadeInterna: "GestorUnidade",
          entidadeInternaId: gestor.id,
          mensagem: `Chefia titular de ${matricula} encerrada porque não consta mais como vigente no SARH.`,
          dadosAntes: gestor,
          metadados: { modoSimulacao: params.modoSimulacao },
        },
        null,
      );
      operacoes.push("INATIVAR");
    }

    return operacoes;
  }

  async processarCargo(params: {
    execucaoId: string;
    payload: SarhCargoDto;
    modoSimulacao: boolean;
    registroBrutoId?: string | null;
  }) {
    const endpoint: TipoEndpointSarhDb = "CARGOS";
    const chaveExterna = String(params.payload.id);
    const existente = await this.prisma.cargo.findUnique({
      where: { codigoExternoSarh: params.payload.id },
    });
    const data = mapearCargoSarh(params.payload);
    const operacao: OperacaoRegistroSarhDb = existente ? "ATUALIZAR" : "CRIAR";

    if (params.modoSimulacao) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "CARGO",
          chaveExterna,
          operacao,
          status: "PROCESSADO",
          entidadeInterna: "Cargo",
          entidadeInternaId: existente?.id,
          mensagem: `Simulação: cargo seria ${
            existente ? "atualizado" : "criado"
          }.`,
          dadosAntes: existente,
          dadosDepois: data,
          metadados: { modoSimulacao: true },
        },
        params.registroBrutoId,
      );

      return operacao;
    }

    const salvo = existente
      ? await this.prisma.cargo.update({ where: { id: existente.id }, data })
      : await this.prisma.cargo.create({ data });

    await this.upsertMapeamento(
      "CARGO",
      chaveExterna,
      "Cargo",
      salvo.id,
      gerarHashRegistro(params.payload),
    );

    await this.registrarItem(
      params.execucaoId,
      endpoint,
      {
        tipoRegistro: "CARGO",
        chaveExterna,
        operacao,
        status: "PROCESSADO",
        entidadeInterna: "Cargo",
        entidadeInternaId: salvo.id,
        dadosAntes: existente,
        dadosDepois: salvo,
      },
      params.registroBrutoId,
    );

    return operacao;
  }

  async processarEmpresa(params: {
    execucaoId: string;
    payload: SarhEmpresaDto;
    modoSimulacao: boolean;
    registroBrutoId?: string | null;
  }) {
    const endpoint: TipoEndpointSarhDb = "EMPRESAS";
    const chaveExterna = String(params.payload.id);
    const sigla =
      limparTexto(params.payload.sigla) ?? `SARH-${params.payload.id}`;
    const existente = await this.prisma.orgao.findFirst({
      where: { OR: [{ codigoExternoSarh: params.payload.id }, { sigla }] },
    });
    const data = mapearOrgaoSarh(params.payload);
    const operacao: OperacaoRegistroSarhDb = existente ? "ATUALIZAR" : "CRIAR";

    if (params.modoSimulacao) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "EMPRESA",
          chaveExterna,
          operacao,
          status: "PROCESSADO",
          entidadeInterna: "Orgao",
          entidadeInternaId: existente?.id,
          mensagem: `Simulação: órgão ${sigla} seria ${
            existente ? "atualizado" : "criado"
          }.`,
          dadosAntes: existente,
          dadosDepois: data,
          metadados: { modoSimulacao: true },
        },
        params.registroBrutoId,
      );

      return operacao;
    }

    const salvo = existente
      ? await this.prisma.orgao.update({ where: { id: existente.id }, data })
      : await this.prisma.orgao.create({ data });

    await this.upsertMapeamento(
      "EMPRESA",
      chaveExterna,
      "Orgao",
      salvo.id,
      gerarHashRegistro(params.payload),
    );

    await this.registrarItem(
      params.execucaoId,
      endpoint,
      {
        tipoRegistro: "EMPRESA",
        chaveExterna,
        operacao,
        status: "PROCESSADO",
        entidadeInterna: "Orgao",
        entidadeInternaId: salvo.id,
        dadosAntes: existente,
        dadosDepois: salvo,
      },
      params.registroBrutoId,
    );

    return operacao;
  }

  async processarUnidade(params: {
    execucaoId: string;
    payload: SarhLotacaoDto;
    modoSimulacao: boolean;
    registroBrutoId?: string | null;
  }) {
    const endpoint: TipoEndpointSarhDb = "LOTACOES";
    const chaveExterna = String(params.payload.id);
    const orgao = await this.obterOrgaoPadrao();
    const pai = params.payload.idPai
      ? await this.prisma.unidadeOrganizacional.findFirst({
          where: {
            orgaoId: orgao.id,
            codigoExternoSarh: params.payload.idPai,
          },
        })
      : null;

    const existentePorCodigoExterno =
      await this.prisma.unidadeOrganizacional.findFirst({
        where: { orgaoId: orgao.id, codigoExternoSarh: params.payload.id },
      });
    const codigoMapeado =
      limparTexto(params.payload.sigla) ?? `SARH-${params.payload.id}`;
    const candidatosSemVinculo =
      await this.prisma.unidadeOrganizacional.findMany({
        where: {
          orgaoId: orgao.id,
          codigo: codigoMapeado,
          codigoExternoSarh: null,
        },
        take: 2,
      });

    if (
      existentePorCodigoExterno &&
      candidatosSemVinculo.length === 1 &&
      !params.modoSimulacao
    ) {
      await this.consolidarUnidadeDuplicada(
        candidatosSemVinculo[0].id,
        existentePorCodigoExterno.id,
      );
    }

    const existente =
      existentePorCodigoExterno ??
      (candidatosSemVinculo.length === 1 ? candidatosSemVinculo[0] : null);
    const dataMapeada = mapearUnidadeSarh(
      params.payload,
      orgao.id,
      pai?.id ?? null,
    );
    const unidadeComMesmoCodigo =
      await this.prisma.unidadeOrganizacional.findUnique({
        where: {
          orgaoId_codigo: {
            orgaoId: orgao.id,
            codigo: dataMapeada.codigo,
          },
        },
        select: { id: true },
      });
    const codigo =
      unidadeComMesmoCodigo && unidadeComMesmoCodigo.id !== existente?.id
        ? gerarCodigoUnidadeSarhAlternativo(
            dataMapeada.codigo,
            params.payload.id,
          )
        : dataMapeada.codigo;
    const data = { ...dataMapeada, codigo };
    const operacao: OperacaoRegistroSarhDb = existente ? "ATUALIZAR" : "CRIAR";

    if (params.modoSimulacao) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "LOTACAO",
          chaveExterna,
          operacao,
          status: "PROCESSADO",
          entidadeInterna: "UnidadeOrganizacional",
          entidadeInternaId: existente?.id,
          mensagem: `Simulação: unidade ${data.sigla} seria ${
            existente ? "atualizada" : "criada"
          }.`,
          dadosAntes: existente,
          dadosDepois: data,
          metadados: {
            modoSimulacao: true,
            paiEncontrado: Boolean(pai),
            codigoOriginal: dataMapeada.codigo,
            codigoAlternativo: codigo !== dataMapeada.codigo,
          },
        },
        params.registroBrutoId,
      );

      return operacao;
    }

    const salvo = existente
      ? await this.prisma.unidadeOrganizacional.update({
          where: { id: existente.id },
          data: data as Parameters<
            typeof this.prisma.unidadeOrganizacional.update
          >[0]["data"],
        })
      : await this.prisma.unidadeOrganizacional.create({
          data: data as Parameters<
            typeof this.prisma.unidadeOrganizacional.create
          >[0]["data"],
        });

    await this.upsertMapeamento(
      "LOTACAO",
      chaveExterna,
      "UnidadeOrganizacional",
      salvo.id,
      gerarHashRegistro(params.payload),
    );

    await this.registrarItem(
      params.execucaoId,
      endpoint,
      {
        tipoRegistro: "LOTACAO",
        chaveExterna,
        operacao,
        status: "PROCESSADO",
        entidadeInterna: "UnidadeOrganizacional",
        entidadeInternaId: salvo.id,
        dadosAntes: existente,
        dadosDepois: salvo,
        metadados: {
          paiEncontrado: Boolean(pai),
          idPaiSarh: params.payload.idPai,
          codigoOriginal: dataMapeada.codigo,
          codigoAlternativo: codigo !== dataMapeada.codigo,
        },
      },
      params.registroBrutoId,
    );

    return operacao;
  }

  async corrigirPaisDasUnidadesSarh() {
    const orgao = await this.obterOrgaoPadrao();
    const unidadesSemPai = await this.prisma.unidadeOrganizacional.findMany({
      where: {
        orgaoId: orgao.id,
        origemSarh: true,
        codigoExternoPaiSarh: { not: null },
      },
      select: {
        id: true,
        codigoExternoSarh: true,
        codigoExternoPaiSarh: true,
        unidadePaiId: true,
      },
    });

    for (const unidade of unidadesSemPai) {
      if (!unidade.codigoExternoPaiSarh || unidade.codigoExternoPaiSarh === 4) {
        continue;
      }

      const pai = await this.prisma.unidadeOrganizacional.findFirst({
        where: {
          orgaoId: orgao.id,
          codigoExternoSarh: unidade.codigoExternoPaiSarh,
        },
        select: { id: true },
      });

      if (pai && unidade.unidadePaiId !== pai.id) {
        await this.prisma.unidadeOrganizacional.update({
          where: { id: unidade.id },
          data: { unidadePaiId: pai.id },
        });
      }
    }
  }

  async processarServidor(params: {
    execucaoId: string;
    payload: SarhServidorDto;
    modoSimulacao: boolean;
    registroBrutoId?: string | null;
  }) {
    const endpoint: TipoEndpointSarhDb = "SERVIDORES";
    const matricula = normalizarMatricula(params.payload.matricula);
    const chaveExterna = matricula;
    const orgao = await this.obterOrgaoPadrao();
    const cargo = params.payload.cargoId
      ? await this.prisma.cargo.findUnique({
          where: { codigoExternoSarh: params.payload.cargoId },
        })
      : null;

    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { matricula },
    });
    const servidorExistente = await this.prisma.servidor.findUnique({
      where: { matricula },
    });
    const usuarioData = mapearUsuarioServidorSarh(params.payload);
    const servidorBaseData = mapearServidorSarh(
      params.payload,
      usuarioExistente?.id ?? "__USUARIO_A_CRIAR__",
      orgao.id,
      cargo?.id ?? null,
    );
    const operacao: OperacaoRegistroSarhDb = servidorExistente
      ? "ATUALIZAR"
      : "CRIAR";

    if (params.modoSimulacao) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "SERVIDOR",
          chaveExterna,
          operacao,
          status: "PROCESSADO",
          entidadeInterna: "Servidor",
          entidadeInternaId: servidorExistente?.id,
          mensagem: `Simulação: servidor ${matricula} seria ${
            servidorExistente ? "atualizado" : "criado"
          }.`,
          dadosAntes: {
            usuario: usuarioExistente,
            servidor: servidorExistente,
          },
          dadosDepois: {
            usuario: usuarioData,
            servidor: servidorBaseData,
          },
          metadados: {
            modoSimulacao: true,
            cargoEncontrado: Boolean(cargo),
          },
        },
        params.registroBrutoId,
      );

      return operacao;
    }

    const usuario = usuarioExistente
      ? await this.prisma.usuario.update({
          where: { id: usuarioExistente.id },
          data: usuarioData as Parameters<
            typeof this.prisma.usuario.update
          >[0]["data"],
        })
      : await this.prisma.usuario.create({
          data: usuarioData as Parameters<
            typeof this.prisma.usuario.create
          >[0]["data"],
        });

    const servidorData = mapearServidorSarh(
      params.payload,
      usuario.id,
      orgao.id,
      cargo?.id ?? null,
    );

    const servidorUpdateData = Object.fromEntries(
      Object.entries(servidorData).filter(
        ([campo]) => campo !== "nomeFuncional",
      ),
    ) as Omit<typeof servidorData, "nomeFuncional">;

    const servidor = servidorExistente
      ? await this.prisma.servidor.update({
          where: { id: servidorExistente.id },
          data: servidorUpdateData as Parameters<
            typeof this.prisma.servidor.update
          >[0]["data"],
        })
      : await this.prisma.servidor.create({
          data: {
            ...servidorData,
            nomeFuncional: usuario.nome,
          } as Parameters<typeof this.prisma.servidor.create>[0]["data"],
        });

    await this.vincularPerfilServidor(usuario.id);
    await garantirJornadaPadraoServidorService(this.prisma, servidor.id);

    await this.upsertMapeamento(
      "SERVIDOR",
      chaveExterna,
      "Servidor",
      servidor.id,
      gerarHashRegistro(params.payload),
    );

    await this.registrarItem(
      params.execucaoId,
      endpoint,
      {
        tipoRegistro: "SERVIDOR",
        chaveExterna,
        operacao,
        status: "PROCESSADO",
        entidadeInterna: "Servidor",
        entidadeInternaId: servidor.id,
        dadosAntes: {
          usuario: usuarioExistente,
          servidor: servidorExistente,
        },
        dadosDepois: {
          usuario,
          servidor,
        },
        metadados: {
          cargoEncontrado: Boolean(cargo),
          cargoIdSarh: params.payload.cargoId,
        },
      },
      params.registroBrutoId,
    );

    return operacao;
  }

  async processarLotacaoServidor(params: {
    execucaoId: string;
    payload: SarhLotacaoServidorDto;
    modoSimulacao: boolean;
    registroBrutoId?: string | null;
  }) {
    const endpoint: TipoEndpointSarhDb = "LOTACOES_SERVIDORES";
    const matricula = normalizarMatricula(params.payload.matricula);
    const chaveExterna = `${matricula}:${
      params.payload.lotacaoId ?? "sem-lotacao"
    }`;
    const orgao = await this.obterOrgaoPadrao();
    const servidor = await this.prisma.servidor.findFirst({
      where: { matricula, orgaoId: orgao.id },
      include: { usuario: true },
    });

    if (!servidor) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "LOTACAO_SERVIDOR",
          chaveExterna,
          operacao: "ERRO",
          status: "ERRO",
          erro: `Servidor ${matricula} não encontrado para vincular lotação.`,
          metadados: {
            matricula,
            lotacaoId: params.payload.lotacaoId,
          },
        },
        params.registroBrutoId,
      );

      return "ERRO" as OperacaoRegistroSarhDb;
    }

    if (isLotacaoServidorDesligado(params.payload)) {
      if (!params.modoSimulacao) {
        await this.prisma.usuario.update({
          where: { id: servidor.usuarioId },
          data: { ativo: false },
        });

        await this.prisma.servidor.update({
          where: { id: servidor.id },
          data: { ativo: false },
        });

        await this.prisma.lotacao.updateMany({
          where: {
            servidorId: servidor.id,
            status: "ATIVO",
          },
          data: {
            status: "INATIVO",
            dataFim: new Date(),
          },
        });
      }

      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "LOTACAO_SERVIDOR",
          chaveExterna,
          operacao: "INATIVAR",
          status: "PROCESSADO",
          entidadeInterna: "Servidor",
          entidadeInternaId: servidor.id,
          mensagem: `Servidor ${matricula} identificado como desligado no SARH.`,
          metadados: { modoSimulacao: params.modoSimulacao },
        },
        params.registroBrutoId,
      );

      return "INATIVAR";
    }

    if (!params.payload.lotacaoId) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "LOTACAO_SERVIDOR",
          chaveExterna,
          operacao: "IGNORAR",
          status: "IGNORADO",
          mensagem: `Lotação vazia para servidor ${matricula}.`,
        },
        params.registroBrutoId,
      );

      return "IGNORAR";
    }

    const unidade = await this.prisma.unidadeOrganizacional.findFirst({
      where: { orgaoId: orgao.id, codigoExternoSarh: params.payload.lotacaoId },
    });

    if (!unidade) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "LOTACAO_SERVIDOR",
          chaveExterna,
          operacao: "ERRO",
          status: "ERRO",
          erro: `Unidade SARH ${params.payload.lotacaoId} não encontrada para o servidor ${matricula}.`,
        },
        params.registroBrutoId,
      );

      return "ERRO";
    }

    const cargo = params.payload.cargoId
      ? await this.prisma.cargo.findUnique({
          where: { codigoExternoSarh: params.payload.cargoId },
        })
      : null;

    const lotacaoAtiva = await this.prisma.lotacao.findFirst({
      where: {
        servidorId: servidor.id,
        status: "ATIVO",
        tipo: "TITULAR",
      },
    });

    const mesmaLotacao = lotacaoAtiva?.unidadeId === unidade.id;
    const operacao: OperacaoRegistroSarhDb = lotacaoAtiva
      ? "ATUALIZAR"
      : "CRIAR";

    if (params.modoSimulacao) {
      await this.registrarItem(
        params.execucaoId,
        endpoint,
        {
          tipoRegistro: "LOTACAO_SERVIDOR",
          chaveExterna,
          operacao,
          status: "PROCESSADO",
          entidadeInterna: "Lotacao",
          entidadeInternaId: lotacaoAtiva?.id,
          mensagem: mesmaLotacao
            ? `Simulação: lotação ativa de ${matricula} seria conferida/atualizada.`
            : `Simulação: lotação ativa de ${matricula} seria alterada para ${unidade.sigla}.`,
          dadosAntes: lotacaoAtiva,
          dadosDepois: {
            servidorId: servidor.id,
            unidadeId: unidade.id,
            cargoId: cargo?.id ?? null,
          },
          metadados: { modoSimulacao: true },
        },
        params.registroBrutoId,
      );

      return operacao;
    }

    let lotacaoSalva;

    if (mesmaLotacao && lotacaoAtiva) {
      lotacaoSalva = await this.prisma.lotacao.update({
        where: { id: lotacaoAtiva.id },
        data: {
          cargoId: cargo?.id ?? null,
          codigoLotacaoSarh: params.payload.lotacaoId,
          codigoCargoSarh: params.payload.cargoId,
          origemSarh: true,
          payloadSarh: toJsonInput(params.payload) ?? {},
          sincronizadoSarhEm: new Date(),
        },
      });
    } else {
      await this.prisma.lotacao.updateMany({
        where: {
          servidorId: servidor.id,
          status: "ATIVO",
          tipo: "TITULAR",
        },
        data: {
          status: "INATIVO",
          dataFim: new Date(),
        },
      });

      lotacaoSalva = await this.prisma.lotacao.create({
        data: {
          servidorId: servidor.id,
          unidadeId: unidade.id,
          cargoId: cargo?.id ?? null,
          codigoLotacaoSarh: params.payload.lotacaoId,
          codigoCargoSarh: params.payload.cargoId,
          origemSarh: true,
          payloadSarh: toJsonInput(params.payload) ?? {},
          sincronizadoSarhEm: new Date(),
          tipo: "TITULAR",
          status: "ATIVO",
          dataInicio: new Date(),
        },
      });
    }

    await this.upsertMapeamento(
      "LOTACAO_SERVIDOR",
      chaveExterna,
      "Lotacao",
      lotacaoSalva.id,
      gerarHashRegistro(params.payload),
    );

    await garantirJornadaPadraoServidorService(this.prisma, servidor.id);

    await this.registrarItem(
      params.execucaoId,
      endpoint,
      {
        tipoRegistro: "LOTACAO_SERVIDOR",
        chaveExterna,
        operacao,
        status: "PROCESSADO",
        entidadeInterna: "Lotacao",
        entidadeInternaId: lotacaoSalva.id,
        dadosAntes: lotacaoAtiva,
        dadosDepois: lotacaoSalva,
      },
      params.registroBrutoId,
    );

    return operacao;
  }

  novoContadores(): ContadoresExecucao {
    return { ...CONTADORES_ZERO };
  }

  incrementar(
    contadores: ContadoresExecucao,
    operacao: OperacaoRegistroSarhDb,
  ) {
    contadores.totalRecebidos += 1;

    if (operacao === "CRIAR") contadores.totalCriados += 1;
    if (operacao === "ATUALIZAR") contadores.totalAtualizados += 1;
    if (operacao === "INATIVAR") contadores.totalInativados += 1;
    if (operacao === "IGNORAR") contadores.totalIgnorados += 1;
    if (operacao === "ERRO") contadores.totalErros += 1;
    if (operacao === "CONFLITO") contadores.totalConflitos += 1;
  }

  private async obterOrgaoPadrao() {
    if (this.orgaoId) {
      const orgaoEscopo = await this.prisma.orgao.findUnique({
        where: { id: this.orgaoId },
      });

      if (orgaoEscopo) {
        return orgaoEscopo;
      }
    }

    const codigoSarh = Number(process.env.SARH_ORGAO_CODIGO_EXTERNO ?? 4);
    const sigla = process.env.SARH_ORGAO_SIGLA ?? "SJAM";

    const orgao = await this.prisma.orgao.findFirst({
      where: {
        OR: [{ codigoExternoSarh: codigoSarh }, { sigla }],
      },
    });

    if (!orgao) {
      return this.prisma.orgao.create({
        data: {
          sigla,
          nome: "SEÇÃO JUDICIÁRIA DO AMAZONAS",
          ativo: true,
          codigoExternoSarh: codigoSarh,
          ultimaSincronizacaoSarh: new Date(),
        },
      });
    }

    if (!orgao.codigoExternoSarh) {
      return this.prisma.orgao.update({
        where: { id: orgao.id },
        data: { codigoExternoSarh: codigoSarh },
      });
    }

    return orgao;
  }

  private async consolidarUnidadeDuplicada(
    unidadeDuplicadaId: string,
    unidadeSarhId: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.unidadeOrganizacional.updateMany({
        where: { unidadePaiId: unidadeDuplicadaId },
        data: { unidadePaiId: unidadeSarhId },
      });
      await tx.lotacao.updateMany({
        where: { unidadeId: unidadeDuplicadaId },
        data: { unidadeId: unidadeSarhId },
      });
      await tx.gestorUnidade.updateMany({
        where: { unidadeId: unidadeDuplicadaId },
        data: { unidadeId: unidadeSarhId },
      });
      await tx.solicitacao.updateMany({
        where: { unidadeId: unidadeDuplicadaId },
        data: { unidadeId: unidadeSarhId },
      });
      await tx.fechamentoMensalUnidade.updateMany({
        where: { unidadeId: unidadeDuplicadaId },
        data: { unidadeId: unidadeSarhId },
      });
      await tx.boletimFrequencia.updateMany({
        where: { unidadeId: unidadeDuplicadaId },
        data: { unidadeId: unidadeSarhId },
      });
      await tx.equipamentoBiometrico.updateMany({
        where: { unidadeId: unidadeDuplicadaId },
        data: { unidadeId: unidadeSarhId },
      });
      await tx.unidadeOrganizacional.delete({
        where: { id: unidadeDuplicadaId },
      });
    });
  }

  private async vincularPerfilServidor(usuarioId: string) {
    const [perfil, servidor] = await Promise.all([
      this.prisma.perfil.findUnique({
        where: { codigo: "SERVIDOR" },
      }),
      this.prisma.servidor.findUnique({
        where: { usuarioId },
        select: { orgaoId: true },
      }),
    ]);

    if (!perfil) return;

    const orgaoId = servidor?.orgaoId ?? null;
    const usuarioPerfil = await this.prisma.usuarioPerfil.findFirst({
      where: {
        usuarioId,
        perfilId: perfil.id,
        orgaoId,
      },
    });

    if (usuarioPerfil) {
      await this.prisma.usuarioPerfil.update({
        where: { id: usuarioPerfil.id },
        data: { ativo: true, orgaoId },
      });
      return;
    }

    await this.prisma.usuarioPerfil.create({
      data: {
        usuarioId,
        perfilId: perfil.id,
        orgaoId,
        ativo: true,
      },
    });
  }

  private async upsertMapeamento(
    tipoRegistro: TipoRegistroSarhDb,
    codigoExterno: string,
    entidadeInterna: string,
    entidadeInternaId: string,
    hashAtual: string,
  ) {
    const integracao = await this.obterOuCriarIntegracaoSarh();

    return this.prisma.mapeamentoExterno.upsert({
      where: {
        sistema_tipoRegistro_codigoExterno: {
          sistema: "SARH",
          tipoRegistro,
          codigoExterno,
        },
      },
      update: {
        entidadeInterna,
        entidadeInternaId,
        hashAtual,
        ativo: true,
      },
      create: {
        integracaoId: integracao.id,
        sistema: "SARH",
        tipoRegistro,
        codigoExterno,
        entidadeInterna,
        entidadeInternaId,
        hashAtual,
        ativo: true,
      },
    });
  }
}
