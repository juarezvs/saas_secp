import type { prisma as prismaClient } from "@/shared/infrastructure/database/prisma";

import type {
  OperacaoRegistroSarhDb,
  ResultadoItemSarh,
  SarhCargoDto,
  SarhEmpresaDto,
  SarhEndpointKey,
  SarhLotacaoDto,
  SarhLotacaoServidorDto,
  SarhServidorDto,
  TipoEndpointSarhDb,
  TipoExecucaoSarh,
  TipoRegistroSarhDb,
} from "../../domain/sarh.types";
import {
  endpointDbFromKey,
  gerarHashRegistro,
  isLotacaoServidorDesligado,
  limparTexto,
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

type JsonInputValue =
  | string
  | number
  | boolean
  | JsonInputObject
  | JsonInputArray;

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

export class SarhPrismaRepository {
  constructor(private readonly prisma: PrismaLike) {}

  async obterOuCriarIntegracaoSarh() {
    const existente = await this.prisma.integracaoSistema.findFirst({
      where: {
        tipo: "SARH",
        nome: "SARH - Sistema de Gestão de Recursos Humanos",
      },
    });

    if (existente) return existente;

    return this.prisma.integracaoSistema.create({
      data: {
        nome: "SARH - Sistema de Gestão de Recursos Humanos",
        tipo: "SARH",
        status: "ATIVA",
        direcao: "ENTRADA",
        baseUrl:
          process.env.SARH_BASE_URL ?? "http://sarh.integracao.am.trf1.gov.br",
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
          },
          timeoutMs: Number(process.env.SARH_TIMEOUT_MS ?? 30000),
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

    const existente = await this.prisma.unidadeOrganizacional.findFirst({
      where: { orgaoId: orgao.id, codigoExternoSarh: params.payload.id },
    });
    const data = mapearUnidadeSarh(params.payload, orgao.id, pai?.id ?? null);
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
          metadados: { modoSimulacao: true, paiEncontrado: Boolean(pai) },
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

    const servidor = servidorExistente
      ? await this.prisma.servidor.update({
          where: { id: servidorExistente.id },
          data: servidorData as Parameters<
            typeof this.prisma.servidor.update
          >[0]["data"],
        })
      : await this.prisma.servidor.create({
          data: servidorData as Parameters<
            typeof this.prisma.servidor.create
          >[0]["data"],
        });

    await this.vincularPerfilServidor(usuario.id);

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
    const servidor = await this.prisma.servidor.findUnique({
      where: { matricula },
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
      where: { codigoExternoSarh: params.payload.lotacaoId },
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

  private async vincularPerfilServidor(usuarioId: string) {
    const perfil = await this.prisma.perfil.findUnique({
      where: { codigo: "SERVIDOR" },
    });

    if (!perfil) return;

    await this.prisma.usuarioPerfil.upsert({
      where: {
        usuarioId_perfilId: {
          usuarioId,
          perfilId: perfil.id,
        },
      },
      update: { ativo: true },
      create: {
        usuarioId,
        perfilId: perfil.id,
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
