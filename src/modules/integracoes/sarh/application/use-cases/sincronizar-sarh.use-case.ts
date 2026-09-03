import type {
  SarhAfastamentoDto,
  SarhEndpointKey,
  SarhLotacaoDto,
  SarhLotacaoServidorDto,
  SarhResumoExecucao,
  SarhSyncProgress,
} from "../../domain/sarh.types";
import {
  endpointDbFromKey,
  normalizarCpf,
  normalizarCodigoLotacaoServidor,
  normalizarMatricula,
} from "../../domain/sarh-normalizer";
import {
  ENDPOINTS_PADRAO_SARH,
  type SincronizarSarhInput,
} from "../sarh-sync.dto";
import { obterIntegracaoSarhConfigurada } from "../services/sarh-oracle-config.service";
import { SarhOracleClient } from "../../infrastructure/oracle/sarh-oracle-client";
import { SarhPrismaRepository } from "../../infrastructure/prisma/sarh-prisma.repository";

type PrismaLike = ConstructorParameters<typeof SarhPrismaRepository>[0];

function ehPessoaExternaPontoSarh(matricula: string) {
  return /(?:ES|PS|VO)$/i.test(matricula.trim());
}

function endpointPessoaSarh(
  matricula: string,
): Extract<
  SarhEndpointKey,
  "servidores" | "estagiarios" | "prestadores" | "voluntarios"
> {
  const normalizada = normalizarMatricula(matricula);

  if (normalizada.endsWith("ES")) return "estagiarios";
  if (normalizada.endsWith("PS")) return "prestadores";
  if (normalizada.endsWith("VO")) return "voluntarios";

  return "servidores";
}

function rotuloEndpointPessoaSarh(endpoint: SarhEndpointKey) {
  const rotulos: Partial<Record<SarhEndpointKey, string>> = {
    servidores: "servidores",
    estagiarios: "estagiarios",
    prestadores: "prestadores",
    voluntarios: "voluntarios",
  };

  return rotulos[endpoint] ?? "pessoas";
}

function textoNormalizadoSarh(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
}

function afastamentoSarhEhFerias(afastamento: SarhAfastamentoDto) {
  return [
    afastamento.id,
    afastamento.categoria,
    afastamento.tipoDescricao,
    afastamento.origemTabela,
  ].some((valor) =>
    textoNormalizadoSarh(String(valor ?? "")).includes("FERIAS"),
  );
}

export class SarhSyncCanceladoError extends Error {
  constructor(message = "Sincronizacao SARH cancelada pelo usuario.") {
    super(message);
    this.name = "SarhSyncCanceladoError";
  }
}

export class SincronizarSarhUseCase {
  constructor(
    private readonly prisma: PrismaLike,
    private readonly sarhClient?: {
      buscarEmpresas: SarhOracleClient["buscarEmpresas"];
      buscarLotacoes: SarhOracleClient["buscarLotacoes"];
      buscarCargos: SarhOracleClient["buscarCargos"];
      buscarServidores: SarhOracleClient["buscarServidores"];
      buscarLotacoesServidores: SarhOracleClient["buscarLotacoesServidores"];
      buscarTiposAfastamento: SarhOracleClient["buscarTiposAfastamento"];
      buscarAfastamentos: SarhOracleClient["buscarAfastamentos"];
      buscarChefias: SarhOracleClient["buscarChefias"];
      buscarSubstituicoes: SarhOracleClient["buscarSubstituicoes"];
      buscarCalendarios: SarhOracleClient["buscarCalendarios"];
    },
  ) {}

  async execute(input: SincronizarSarhInput = {}): Promise<SarhResumoExecucao> {
    const { integracao, config } = await obterIntegracaoSarhConfigurada(
      input.orgaoId,
    );
    const repository = new SarhPrismaRepository(this.prisma, input.orgaoId);
    const sarhClient =
      this.sarhClient ??
      new SarhOracleClient({
        username: config.username,
        password: config.password,
        connectString: config.connectString,
        oracleHome: config.oracleHome,
        siglaLocalidade: config.siglaLocalidade,
      });

    const tipo =
      input.tipo ??
      (input.modoSimulacao ? "SIMULACAO" : "SINCRONIZACAO_COMPLETA");

    const modoSimulacao = input.modoSimulacao ?? true;

    const endpoints = input.endpoints?.length
      ? input.endpoints
      : ENDPOINTS_PADRAO_SARH;
    const codigosRaizUnidadesSarh = input.codigoUnidadeSarh
      ? [input.codigoUnidadeSarh]
      : (input.codigosUnidadesSarhPermitidos ?? []);
    const possuiFiltroUnidadeSarh = codigosRaizUnidadesSarh.length > 0;
    let lotacoesSarhCache: SarhLotacaoDto[] | null = null;
    let servidoresSarhCache: Awaited<
      ReturnType<SarhOracleClient["buscarServidores"]>
    > | null = null;
    let codigosLotacoesPermitidasCache: Set<number> | null | undefined;
    let lotacoesServidoresSarhCache: SarhLotacaoServidorDto[] | null = null;
    let matriculasPermitidasCache: Set<string> | null | undefined;

    const execucao = await repository.criarExecucao({
      integracaoId: integracao.id,
      tipo,
      modoSimulacao,
      iniciadoPorUsuarioId: input.iniciadoPorUsuarioId,
      metadados: {
        endpoints,
        filtros: {
          matricula: input.matricula,
          codigoUnidadeSarh: input.codigoUnidadeSarh,
          codigosUnidadesSarhPermitidos: input.codigosUnidadesSarhPermitidos,
          codigoCargoSarh: input.codigoCargoSarh,
        },
      },
    });

    const contadores = repository.novoContadores();
    const iniciadoEm = execucao.iniciadoEm;
    const totalEndpoints = endpoints.length;
    const verificarCancelamento = async () => {
      const cancelada =
        (await input.verificarCancelamento?.(execucao.id)) ??
        (
          await this.prisma.integracaoSarhExecucao.findUnique({
            where: { id: execucao.id },
            select: { status: true },
          })
        )?.status === "CANCELADA";

      if (cancelada) {
        throw new SarhSyncCanceladoError();
      }
    };

    const publicarProgresso = async (params: {
      endpointAtual: SarhEndpointKey | null;
      endpointIndice: number;
      percentualEndpoint: number;
      etapa: string;
      status?: SarhSyncProgress["status"];
    }) => {
      await verificarCancelamento();

      const percentualEndpoint = Math.max(
        0,
        Math.min(100, Math.round(params.percentualEndpoint)),
      );
      const percentualGeral =
        params.endpointIndice > 0 && totalEndpoints > 0
          ? Math.round(
              ((params.endpointIndice - 1 + percentualEndpoint / 100) /
                totalEndpoints) *
                100,
            )
          : 0;

      await input.atualizarProgresso?.({
        execucaoId: execucao.id,
        percentualGeral: Math.max(0, Math.min(100, percentualGeral)),
        percentualEndpoint,
        endpointAtual: params.endpointAtual,
        endpointIndice: params.endpointIndice,
        totalEndpoints,
        etapa: params.etapa,
        status: params.status ?? "EM_EXECUCAO",
        contadores: { ...contadores },
      });
    };

    const buscarLotacoesSarh = async () => {
      lotacoesSarhCache ??= await sarhClient.buscarLotacoes();
      return lotacoesSarhCache;
    };

    const buscarServidoresSarh = async () => {
      servidoresSarhCache ??= await sarhClient.buscarServidores({
        matricula: input.matricula,
      });
      return servidoresSarhCache;
    };

    const buscarLotacoesServidoresSarh = async () => {
      lotacoesServidoresSarhCache ??= await sarhClient.buscarLotacoesServidores(
        {
          matricula: input.matricula,
        },
      );
      return lotacoesServidoresSarhCache;
    };

    const resolverCodigosLotacoesPermitidas = async () => {
      if (!possuiFiltroUnidadeSarh) {
        return null;
      }

      if (codigosLotacoesPermitidasCache !== undefined) {
        return codigosLotacoesPermitidasCache;
      }

      const lotacoes = await buscarLotacoesSarh();
      const permitidas = new Set(codigosRaizUnidadesSarh);
      let adicionou = true;

      while (adicionou) {
        adicionou = false;

        for (const lotacao of lotacoes) {
          if (
            lotacao.idPai &&
            permitidas.has(lotacao.idPai) &&
            !permitidas.has(lotacao.id)
          ) {
            permitidas.add(lotacao.id);
            adicionou = true;
          }
        }
      }

      codigosLotacoesPermitidasCache = permitidas;
      return permitidas;
    };

    const codigoLotacaoPermitido = (
      codigo: number | null | undefined,
      permitidas: Set<number> | null,
    ) => !permitidas || (Boolean(codigo) && permitidas.has(Number(codigo)));

    const resolverMatriculasPermitidas = async () => {
      const codigosPermitidos = await resolverCodigosLotacoesPermitidas();

      if (!codigosPermitidos) {
        return null;
      }

      if (matriculasPermitidasCache !== undefined) {
        return matriculasPermitidasCache;
      }

      const lotacoesServidores = await buscarLotacoesServidoresSarh();
      matriculasPermitidasCache = new Set(
        lotacoesServidores
          .filter((item) =>
            codigoLotacaoPermitido(item.lotacaoId, codigosPermitidos),
          )
          .map((item) => normalizarMatricula(item.matricula))
          .filter(Boolean),
      );

      return matriculasPermitidasCache;
    };

    const publicarProgressoEndpoint = async (
      endpoint: SarhEndpointKey,
      processados: number,
      total: number,
      etapa: string,
    ) => {
      const intervalo = Number(process.env.SARH_SYNC_PROGRESS_BATCH ?? "100");

      if (
        processados > 0 &&
        total > 0 &&
        processados < total &&
        intervalo > 1 &&
        processados % intervalo !== 0
      ) {
        return;
      }

      const indice = endpoints.indexOf(endpoint) + 1;
      const percentualEndpoint = total > 0 ? (processados / total) * 100 : 100;

      await publicarProgresso({
        endpointAtual: endpoint,
        endpointIndice: indice,
        percentualEndpoint,
        etapa,
      });
    };

    try {
      if (endpoints.includes("empresas")) {
        await publicarProgressoEndpoint("empresas", 0, 1, "Buscando empresas");
        const empresas = await sarhClient.buscarEmpresas();
        let processados = 0;

        for (const empresa of empresas) {
          const bruto = await repository.registrarPayloadBruto({
            execucaoId: execucao.id,
            endpoint: "empresas",
            payload: empresa,
          });

          const operacao = await repository.processarEmpresa({
            execucaoId: execucao.id,
            payload: empresa,
            modoSimulacao,
            registroBrutoId: bruto?.id,
          });

          repository.incrementar(contadores, operacao);
          processados += 1;
          await publicarProgressoEndpoint(
            "empresas",
            processados,
            empresas.length,
            "Processando empresas",
          );
        }
      }

      if (endpoints.includes("lotacoes")) {
        await publicarProgressoEndpoint("lotacoes", 0, 1, "Buscando lotacoes");
        const lotacoes = await buscarLotacoesSarh();
        const codigosPermitidos = await resolverCodigosLotacoesPermitidas();

        const filtradas = codigosPermitidos
          ? lotacoes.filter((lotacao) => codigosPermitidos.has(lotacao.id))
          : lotacoes;
        let processados = 0;

        for (const lotacao of filtradas) {
          const bruto = await repository.registrarPayloadBruto({
            execucaoId: execucao.id,
            endpoint: "lotacoes",
            payload: lotacao,
          });

          const operacao = await repository.processarUnidade({
            execucaoId: execucao.id,
            payload: lotacao,
            modoSimulacao,
            registroBrutoId: bruto?.id,
          });

          repository.incrementar(contadores, operacao);
          processados += 1;
          await publicarProgressoEndpoint(
            "lotacoes",
            processados,
            filtradas.length,
            "Processando lotacoes",
          );
        }

        if (!modoSimulacao) {
          await repository.corrigirPaisDasUnidadesSarh();
        }
      }

      if (endpoints.includes("cargos")) {
        await publicarProgressoEndpoint("cargos", 0, 1, "Buscando cargos");
        const cargos = await sarhClient.buscarCargos();

        const filtrados = input.codigoCargoSarh
          ? cargos.filter((cargo) => cargo.id === input.codigoCargoSarh)
          : cargos;
        let processados = 0;

        for (const cargo of filtrados) {
          const bruto = await repository.registrarPayloadBruto({
            execucaoId: execucao.id,
            endpoint: "cargos",
            payload: cargo,
          });

          const operacao = await repository.processarCargo({
            execucaoId: execucao.id,
            payload: cargo,
            modoSimulacao,
            registroBrutoId: bruto?.id,
          });

          repository.incrementar(contadores, operacao);
          processados += 1;
          await publicarProgressoEndpoint(
            "cargos",
            processados,
            filtrados.length,
            "Processando cargos",
          );
        }
      }

      const endpointsPessoas = endpoints.filter((endpoint) =>
        ["servidores", "estagiarios", "prestadores", "voluntarios"].includes(
          endpoint,
        ),
      );

      for (const endpointPessoa of endpointsPessoas) {
        const rotuloPessoa = rotuloEndpointPessoaSarh(endpointPessoa);

        await publicarProgressoEndpoint(
          endpointPessoa,
          0,
          1,
          `Buscando ${rotuloPessoa}`,
        );
        const servidores = await buscarServidoresSarh();

        const matriculaFiltro = input.matricula?.toUpperCase();
        const codigosPermitidos = await resolverCodigosLotacoesPermitidas();
        const matriculasPermitidas = await resolverMatriculasPermitidas();

        const filtrados = servidores.filter((servidor) => {
          const matricula = normalizarMatricula(servidor.matricula);

          if (endpointPessoaSarh(matricula) !== endpointPessoa) {
            return false;
          }

          if (matriculaFiltro && matricula !== matriculaFiltro) {
            return false;
          }

          const codigoLotacao = normalizarCodigoLotacaoServidor(servidor);

          if (!codigosPermitidos) {
            return true;
          }

          if (!codigoLotacao && ehPessoaExternaPontoSarh(matricula)) {
            return true;
          }

          return (
            codigoLotacaoPermitido(codigoLotacao, codigosPermitidos) ||
            Boolean(matriculasPermitidas?.has(matricula))
          );
        });
        let processados = 0;

        for (const servidor of filtrados) {
          const bruto = await repository.registrarPayloadBruto({
            execucaoId: execucao.id,
            endpoint: endpointPessoa,
            payload: servidor,
          });

          const operacao = await repository.processarServidor({
            execucaoId: execucao.id,
            payload: servidor,
            modoSimulacao,
            registroBrutoId: bruto?.id,
          });

          repository.incrementar(contadores, operacao);
          processados += 1;
          await publicarProgressoEndpoint(
            endpointPessoa,
            processados,
            filtrados.length,
            `Processando ${rotuloPessoa}`,
          );
        }
      }

      if (endpoints.includes("lotacoesServidores")) {
        await publicarProgressoEndpoint(
          "lotacoesServidores",
          0,
          1,
          "Buscando lotacoes dos servidores",
        );
        const lotacoesServidores = await buscarLotacoesServidoresSarh();

        const matriculaFiltro = input.matricula?.toUpperCase();
        const codigosPermitidos = await resolverCodigosLotacoesPermitidas();

        const filtradas = lotacoesServidores.filter((item) => {
          if (
            matriculaFiltro &&
            normalizarMatricula(item.matricula) !== matriculaFiltro
          ) {
            return false;
          }

          return codigoLotacaoPermitido(item.lotacaoId, codigosPermitidos);
        });
        let processados = 0;

        for (const lotacaoServidor of filtradas) {
          const bruto = await repository.registrarPayloadBruto({
            execucaoId: execucao.id,
            endpoint: "lotacoesServidores",
            payload: lotacaoServidor,
          });

          const operacao = await repository.processarLotacaoServidor({
            execucaoId: execucao.id,
            payload: lotacaoServidor,
            modoSimulacao,
            registroBrutoId: bruto?.id,
          });

          repository.incrementar(contadores, operacao);
          processados += 1;
          await publicarProgressoEndpoint(
            "lotacoesServidores",
            processados,
            filtradas.length,
            "Processando lotacoes dos servidores",
          );
        }
      }

      if (endpoints.includes("tiposAfastamento")) {
        await publicarProgressoEndpoint(
          "tiposAfastamento",
          0,
          1,
          "Buscando tipos de afastamento",
        );
        const tiposAfastamento = await sarhClient.buscarTiposAfastamento();
        let processados = 0;

        for (const tipoAfastamento of tiposAfastamento) {
          const bruto = await repository.registrarPayloadBruto({
            execucaoId: execucao.id,
            endpoint: "tiposAfastamento",
            payload: tipoAfastamento,
          });

          const operacao = await repository.processarTipoAfastamento({
            execucaoId: execucao.id,
            payload: tipoAfastamento,
            modoSimulacao,
            registroBrutoId: bruto?.id,
          });

          repository.incrementar(contadores, operacao);
          processados += 1;
          await publicarProgressoEndpoint(
            "tiposAfastamento",
            processados,
            tiposAfastamento.length,
            "Processando tipos de afastamento",
          );
        }
      }

      const processarAfastamentosSarh = async (
        endpoint: "afastamentos" | "ferias",
        somenteFerias: boolean,
      ) => {
        await publicarProgressoEndpoint(
          endpoint,
          0,
          1,
          somenteFerias ? "Buscando férias" : "Buscando afastamentos",
        );
        const afastamentos = await sarhClient.buscarAfastamentos({
          matricula: input.matricula,
        });
        const matriculaFiltro = input.matricula?.toUpperCase();
        const matriculasPermitidas = await resolverMatriculasPermitidas();
        const filtrados = afastamentos.filter((afastamento) => {
          const ehFerias = afastamentoSarhEhFerias(afastamento);

          if (somenteFerias !== ehFerias) {
            return false;
          }

          const matricula = afastamento.matricula
            ? normalizarMatricula(afastamento.matricula)
            : null;

          if (matriculaFiltro && matricula !== matriculaFiltro) {
            return false;
          }

          return (
            !matriculasPermitidas ||
            Boolean(matricula && matriculasPermitidas.has(matricula))
          );
        });
        let processados = 0;
        const cacheAfastamentos =
          await repository.prepararCacheAfastamentos(filtrados);
        const concorrenciaAfastamentos = Math.max(
          1,
          Math.min(
            25,
            Number(process.env.SARH_AFASTAMENTOS_SYNC_CONCURRENCY ?? "8") || 8,
          ),
        );

        for (
          let inicioLote = 0;
          inicioLote < filtrados.length;
          inicioLote += concorrenciaAfastamentos
        ) {
          const lote = filtrados.slice(
            inicioLote,
            inicioLote + concorrenciaAfastamentos,
          );
          const operacoes = await Promise.all(
            lote.map(async (afastamento) => {
              const bruto = await repository.registrarPayloadBruto({
                execucaoId: execucao.id,
                endpoint: "afastamentos",
                payload: afastamento,
              });
              const matricula = afastamento.matricula
                ? normalizarMatricula(afastamento.matricula)
                : null;
              const cpf = normalizarCpf(afastamento.cpf);
              const tipoCodigo = afastamento.tipoCodigo
                ? Number(afastamento.tipoCodigo)
                : null;
              const servidor =
                (matricula
                  ? cacheAfastamentos.servidoresPorMatricula.get(matricula)
                  : null) ??
                (cpf ? cacheAfastamentos.servidoresPorCpf.get(cpf) : null);
              const tipoAfastamento =
                tipoCodigo && Number.isFinite(tipoCodigo)
                  ? cacheAfastamentos.tiposPorCodigo.get(tipoCodigo)
                  : null;

              return repository.processarAfastamento({
                execucaoId: execucao.id,
                payload: afastamento,
                modoSimulacao,
                registroBrutoId: bruto?.id,
                cache: {
                  servidorId: servidor?.id ?? null,
                  tipoAfastamentoId: tipoAfastamento?.id ?? null,
                  existente:
                    cacheAfastamentos.afastamentosPorCodigo.get(
                      String(afastamento.id),
                    ) ?? null,
                },
              });
            }),
          );

          for (const operacao of operacoes) {
            repository.incrementar(contadores, operacao);
          }

          processados += lote.length;
          await publicarProgressoEndpoint(
            endpoint,
            processados,
            filtrados.length,
            somenteFerias ? "Processando férias" : "Processando afastamentos",
          );
        }
      };

      if (endpoints.includes("afastamentos")) {
        await processarAfastamentosSarh("afastamentos", false);
      }

      if (endpoints.includes("ferias")) {
        await processarAfastamentosSarh("ferias", true);
      }

      if (endpoints.includes("chefias")) {
        await publicarProgressoEndpoint("chefias", 0, 1, "Buscando chefias");
        const chefias = await sarhClient.buscarChefias();
        const matriculaFiltro = input.matricula?.toUpperCase();
        const codigosPermitidos = await resolverCodigosLotacoesPermitidas();
        const filtradas = chefias.filter((chefia) => {
          if (
            matriculaFiltro &&
            normalizarMatricula(chefia.matricula ?? "") !== matriculaFiltro
          ) {
            return false;
          }

          return codigoLotacaoPermitido(chefia.lotacaoId, codigosPermitidos);
        });
        let processados = 0;

        for (const chefia of filtradas) {
          const bruto = await repository.registrarPayloadBruto({
            execucaoId: execucao.id,
            endpoint: "chefias",
            payload: chefia,
          });

          const operacao = await repository.processarChefia({
            execucaoId: execucao.id,
            payload: chefia,
            modoSimulacao,
            registroBrutoId: bruto?.id,
          });

          repository.incrementar(contadores, operacao);
          processados += 1;
          await publicarProgressoEndpoint(
            "chefias",
            processados,
            filtradas.length,
            "Processando chefias",
          );
        }

        if (matriculaFiltro) {
          const operacoes =
            await repository.encerrarChefiasAusentesServidorSarh({
              execucaoId: execucao.id,
              matricula: matriculaFiltro,
              lotacoesVigentesSarh: filtradas.map((chefia) => chefia.lotacaoId),
              modoSimulacao,
            });

          for (const operacao of operacoes) {
            repository.incrementar(contadores, operacao);
          }
        }
      }

      if (endpoints.includes("substituicoes")) {
        await publicarProgressoEndpoint(
          "substituicoes",
          0,
          1,
          "Buscando substituições de função",
        );
        const substituicoes = await sarhClient.buscarSubstituicoes();
        const matriculaFiltro = input.matricula?.toUpperCase();
        const codigosPermitidos = await resolverCodigosLotacoesPermitidas();
        const filtradas = substituicoes.filter((substituicao) => {
          const titular = substituicao.titularMatricula
            ? normalizarMatricula(substituicao.titularMatricula)
            : null;
          const substituto = substituicao.substitutoMatricula
            ? normalizarMatricula(substituicao.substitutoMatricula)
            : null;

          if (
            matriculaFiltro &&
            titular !== matriculaFiltro &&
            substituto !== matriculaFiltro
          ) {
            return false;
          }

          return codigoLotacaoPermitido(
            substituicao.lotacaoId,
            codigosPermitidos,
          );
        });
        let processados = 0;

        for (const substituicao of filtradas) {
          const bruto = await repository.registrarPayloadBruto({
            execucaoId: execucao.id,
            endpoint: "substituicoes",
            payload: substituicao,
          });

          const operacao = await repository.processarSubstituicaoFuncao({
            execucaoId: execucao.id,
            payload: substituicao,
            modoSimulacao,
            registroBrutoId: bruto?.id,
          });

          repository.incrementar(contadores, operacao);
          processados += 1;
          await publicarProgressoEndpoint(
            "substituicoes",
            processados,
            filtradas.length,
            "Processando substituições de função",
          );
        }
      }

      if (endpoints.includes("calendarios")) {
        await publicarProgressoEndpoint(
          "calendarios",
          0,
          1,
          "Buscando calendários institucionais",
        );
        const calendarios = await sarhClient.buscarCalendarios();
        let processados = 0;

        for (const calendario of calendarios) {
          const bruto = await repository.registrarPayloadBruto({
            execucaoId: execucao.id,
            endpoint: "calendarios",
            payload: calendario,
          });

          const operacao = await repository.processarCalendario({
            execucaoId: execucao.id,
            payload: calendario,
            modoSimulacao,
            registroBrutoId: bruto?.id,
          });

          repository.incrementar(contadores, operacao);
          processados += 1;
          await publicarProgressoEndpoint(
            "calendarios",
            processados,
            calendarios.length,
            "Processando calendários institucionais",
          );
        }
      }

      await repository.finalizarExecucao({
        execucaoId: execucao.id,
        iniciadoEm,
        contadores,
      });
      await publicarProgresso({
        endpointAtual: null,
        endpointIndice: totalEndpoints,
        percentualEndpoint: 100,
        etapa: "Sincronizacao concluida",
        status: "CONCLUIDA",
      });

      await repository.registrarLog({
        integracaoId: integracao.id,
        status:
          contadores.totalErros > 0 || contadores.totalConflitos > 0
            ? "ERRO"
            : "SUCESSO",
        mensagem: `Sincronização SARH finalizada. Modo simulação: ${
          modoSimulacao ? "sim" : "não"
        }.`,
        payloadEntrada: input,
        payloadSaida: contadores,
        metadados: {
          execucaoId: execucao.id,
          endpoints: endpoints.map(endpointDbFromKey),
        },
        iniciadoEm,
      });

      const finalizadoEm = new Date();

      return {
        execucaoId: execucao.id,
        modoSimulacao,
        ...contadores,
        iniciadoEm,
        finalizadoEm,
        duracaoMs: finalizadoEm.getTime() - iniciadoEm.getTime(),
      };
    } catch (error) {
      if (error instanceof SarhSyncCanceladoError) {
        await repository.finalizarExecucao({
          execucaoId: execucao.id,
          iniciadoEm,
          contadores,
          cancelada: true,
        });
        await input.atualizarProgresso?.({
          execucaoId: execucao.id,
          percentualGeral: 100,
          percentualEndpoint: 100,
          endpointAtual: null,
          endpointIndice: totalEndpoints,
          totalEndpoints,
          etapa: error.message,
          status: "CANCELADA",
          contadores: { ...contadores },
        });

        await repository.registrarLog({
          integracaoId: integracao.id,
          status: "IGNORADO",
          mensagem: error.message,
          payloadEntrada: input,
          metadados: {
            execucaoId: execucao.id,
          },
          iniciadoEm,
        });

        return {
          execucaoId: execucao.id,
          modoSimulacao,
          ...contadores,
          iniciadoEm,
          finalizadoEm: new Date(),
          duracaoMs: Date.now() - iniciadoEm.getTime(),
        };
      }

      const mensagem = error instanceof Error ? error.message : String(error);

      await repository.finalizarExecucao({
        execucaoId: execucao.id,
        iniciadoEm,
        contadores,
        erro: mensagem,
      });
      await publicarProgresso({
        endpointAtual: null,
        endpointIndice: totalEndpoints,
        percentualEndpoint: 100,
        etapa: mensagem,
        status: "FALHOU",
      });

      await repository.registrarLog({
        integracaoId: integracao.id,
        status: "ERRO",
        mensagem: "Falha na sincronização SARH.",
        erro: mensagem,
        payloadEntrada: input,
        metadados: {
          execucaoId: execucao.id,
        },
        iniciadoEm,
      });

      throw error;
    }
  }
}
