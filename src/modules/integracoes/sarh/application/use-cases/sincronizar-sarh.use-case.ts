import type { SarhResumoExecucao } from "../../domain/sarh.types";
import { endpointDbFromKey } from "../../domain/sarh-normalizer";
import {
  ENDPOINTS_PADRAO_SARH,
  type SincronizarSarhInput,
} from "../sarh-sync.dto";
import { SarhHttpClient } from "../../infrastructure/http/sarh-http-client";
import { SarhPrismaRepository } from "../../infrastructure/prisma/sarh-prisma.repository";

type PrismaLike = ConstructorParameters<typeof SarhPrismaRepository>[0];

export class SincronizarSarhUseCase {
  constructor(
    private readonly prisma: PrismaLike,
    private readonly sarhClient = new SarhHttpClient(),
  ) {}

  async execute(input: SincronizarSarhInput = {}): Promise<SarhResumoExecucao> {
    const repository = new SarhPrismaRepository(this.prisma);
    const integracao = await repository.obterOuCriarIntegracaoSarh();

    const tipo =
      input.tipo ??
      (input.modoSimulacao ? "SIMULACAO" : "SINCRONIZACAO_COMPLETA");

    const modoSimulacao = input.modoSimulacao ?? true;

    const endpoints = input.endpoints?.length
      ? input.endpoints
      : ENDPOINTS_PADRAO_SARH;

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
          codigoCargoSarh: input.codigoCargoSarh,
        },
      },
    });

    const contadores = repository.novoContadores();
    const iniciadoEm = execucao.iniciadoEm;

    try {
      if (endpoints.includes("empresas")) {
        const empresas = await this.sarhClient.buscarEmpresas();

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
        }
      }

      if (endpoints.includes("lotacoes")) {
        const lotacoes = await this.sarhClient.buscarLotacoes();

        const filtradas = input.codigoUnidadeSarh
          ? lotacoes.filter(
              (lotacao) =>
                lotacao.id === input.codigoUnidadeSarh ||
                lotacao.idPai === input.codigoUnidadeSarh,
            )
          : lotacoes;

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
        }

        if (!modoSimulacao) {
          await repository.corrigirPaisDasUnidadesSarh();
        }
      }

      if (endpoints.includes("cargos")) {
        const cargos = await this.sarhClient.buscarCargos();

        const filtrados = input.codigoCargoSarh
          ? cargos.filter((cargo) => cargo.id === input.codigoCargoSarh)
          : cargos;

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
        }
      }

      if (endpoints.includes("servidores")) {
        const servidores = await this.sarhClient.buscarServidores();

        const matriculaFiltro = input.matricula?.toUpperCase();

        const filtrados = matriculaFiltro
          ? servidores.filter(
              (servidor) =>
                servidor.matricula.toUpperCase() === matriculaFiltro,
            )
          : servidores;

        for (const servidor of filtrados) {
          const bruto = await repository.registrarPayloadBruto({
            execucaoId: execucao.id,
            endpoint: "servidores",
            payload: servidor,
          });

          const operacao = await repository.processarServidor({
            execucaoId: execucao.id,
            payload: servidor,
            modoSimulacao,
            registroBrutoId: bruto?.id,
          });

          repository.incrementar(contadores, operacao);
        }
      }

      if (endpoints.includes("lotacoesServidores")) {
        const lotacoesServidores =
          await this.sarhClient.buscarLotacoesServidores();

        const matriculaFiltro = input.matricula?.toUpperCase();

        const filtradas = matriculaFiltro
          ? lotacoesServidores.filter(
              (item) => item.matricula.toUpperCase() === matriculaFiltro,
            )
          : lotacoesServidores;

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
        }
      }

      await repository.finalizarExecucao({
        execucaoId: execucao.id,
        iniciadoEm,
        contadores,
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
      const mensagem = error instanceof Error ? error.message : String(error);

      await repository.finalizarExecucao({
        execucaoId: execucao.id,
        iniciadoEm,
        contadores,
        erro: mensagem,
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
