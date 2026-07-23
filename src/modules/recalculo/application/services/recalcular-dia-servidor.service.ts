import { prisma } from "@/shared/infrastructure/database/prisma";
import { calcularApuracaoDiaria } from "@/modules/apuracao/application/services/calcular-apuracao-diaria.service";
import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import { resolverExpedienteUnidade } from "@/modules/apuracao/application/services/expediente.service";
import { resolverDispensaPontoEletronico } from "@/modules/apuracao/application/services/dispensa-ponto-eletronico.service";
import { verificarPeriodoHomologado } from "@/modules/boletim-frequencia/application/services/bloquear-periodo-homologado.service";
import {
  classificarDiaInstitucional,
  type CalendarioInstitucionalPrecarregado,
} from "@/modules/calendario-institucional/application/services/classificar-dia-institucional.service";
import { normalizarMarcacoesSemIntervaloService } from "@/modules/marcacoes/application/services/normalizar-marcacoes-sem-intervalo.service";
import { buscarRegulamentacaoPontoServidor } from "@/modules/regulamentacao-ponto/application/services/regulamentacao-ponto.service";
import { resolverFusoHorarioUnidade } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { servidorExigeDedicacaoIntegral } from "@/modules/jornadas/application/services/dedicacao-integral.service";
import { resolverPrevisaoJornadaDia } from "@/modules/jornadas/application/services/resolver-previsao-jornada-dia.service";
import { aplicarSolicitacoesDeferidasApuracao } from "@/modules/solicitacoes/application/services/aplicar-solicitacoes-deferidas-apuracao.service";
import { TIPOS_SOLICITACAO_COM_EFEITO_APURACAO } from "@/modules/solicitacoes/application/services/periodo-solicitacao.service";

export type RecalcularDiaServidorParams = {
  servidorId: string;
  dataReferencia: Date;
  usuarioIdAuditoria?: string;
  origem?: string;
  ignorarBloqueioHomologacao?: boolean;
  calendario?: CalendarioInstitucionalPrecarregado;
};

export async function recalcularDiaServidorService(
  params: RecalcularDiaServidorParams,
) {
  const {
    servidorId,
    dataReferencia,
    usuarioIdAuditoria,
    origem = "RECALCULO_SERVICO",
  } = params;

  const dataNormalizada = normalizarDataReferencia(dataReferencia);
  const fimDoDia = new Date(dataNormalizada);
  fimDoDia.setUTCDate(fimDoDia.getUTCDate() + 1);

  if (!params.ignorarBloqueioHomologacao) {
    await verificarPeriodoHomologado({
      servidorId,
      dataReferencia: dataNormalizada,
    });
  }

  const [
    marcacoes,
    jornadaServidor,
    lotacaoVigente,
    servidor,
    dispensaAdministrativa,
    solicitacoesDeferidas,
    diaInstitucional,
  ] =
    await Promise.all([
      prisma.marcacao.findMany({
        where: {
          servidorId,
          dataReferencia: dataNormalizada,
          status: {
            in: ["VALIDA", "PENDENTE", "AJUSTADA"],
          },
        },
        orderBy: {
          dataHora: "asc",
        },
      }),

      prisma.jornadaServidor.findFirst({
        where: {
          servidorId,
          ativo: true,
          status: "ATIVO",
          dataInicio: {
            lte: dataNormalizada,
          },
          OR: [
            {
              dataFim: null,
            },
            {
              dataFim: {
                gte: dataNormalizada,
              },
            },
          ],
        },
        include: {
          escala: {
            include: {
              dias: true,
            },
          },
          jornada: {
            include: {
              dias: {
                include: {
                  faixas: {
                    orderBy: {
                      ordem: "asc",
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          dataInicio: "desc",
        },
      }),
      prisma.lotacao.findFirst({
        where: {
          servidorId,
          status: "ATIVO",
          dataInicio: {
            lte: dataNormalizada,
          },
          OR: [
            {
              dataFim: null,
            },
            {
              dataFim: {
                gte: dataNormalizada,
              },
            },
          ],
        },
        include: {
          unidade: {
            include: {
              orgao: {
                select: {
                  fusoHorario: true,
                },
              },
              unidadePai: {
                include: {
                  orgao: {
                    select: {
                      fusoHorario: true,
                    },
                  },
                  unidadePai: {
                    include: {
                      orgao: {
                        select: {
                          fusoHorario: true,
                        },
                      },
                    },
                  },
                },
              },
              equipamentosBiometricos: {
                where: {
                  ativo: true,
                },
                select: {
                  id: true,
                },
              },
            },
          },
        },
        orderBy: {
          dataInicio: "desc",
        },
      }),
      prisma.servidor.findUnique({
        where: {
          id: servidorId,
        },
        select: {
          orgaoId: true,
          funcaoAtualCategoriaSarh: true,
          funcaoAtualCodigoSarh: true,
          funcaoAtualDescricao: true,
          cargo: {
            select: {
              descricao: true,
            },
          },
        },
      }),
      prisma.dispensaPontoServidor.findFirst({
        where: {
          servidorId,
          dataInicio: {
            lte: dataNormalizada,
          },
          OR: [
            {
              dataFim: null,
            },
            {
              dataFim: {
                gte: dataNormalizada,
              },
            },
          ],
        },
        orderBy: {
          dataInicio: "desc",
        },
        select: {
          id: true,
          motivo: true,
          atoAutorizativo: true,
          processoSei: true,
          exigeFrequenciaManual: true,
          dataInicio: true,
          dataFim: true,
        },
      }),
      prisma.solicitacao.findMany({
        where: {
          servidorId,
          status: "DEFERIDA",
          tipo: {
            in: [...TIPOS_SOLICITACAO_COM_EFEITO_APURACAO],
          },
          OR: [
            {
              dataReferencia: dataNormalizada,
            },
            {
              dataInicio: {
                lt: fimDoDia,
              },
              dataFim: {
                gte: dataNormalizada,
              },
            },
          ],
        },
        select: {
          id: true,
          tipo: true,
          titulo: true,
          descricao: true,
          dataReferencia: true,
          dataInicio: true,
          dataFim: true,
          dadosSolicitados: true,
        },
      }),
      classificarDiaInstitucional(
        dataNormalizada,
        params.calendario,
        servidorId,
      ),
    ]);

  const expedienteUnidade = resolverExpedienteUnidade(
    lotacaoVigente?.unidade ?? null,
  );
  const fusoHorario = resolverFusoHorarioUnidade(lotacaoVigente?.unidade);
  const regulamentacao = await buscarRegulamentacaoPontoServidor(servidorId);
  const servidorDedicacaoIntegral = servidorExigeDedicacaoIntegral({
    descricaoCargoServidor:
      [
        servidor?.funcaoAtualCategoriaSarh,
        servidor?.funcaoAtualCodigoSarh,
        servidor?.funcaoAtualDescricao,
        servidor?.cargo?.descricao,
      ]
        .filter(Boolean)
        .join(" ") || null,
  });
  const quantidadeEquipamentosAtivosUnidade =
    lotacaoVigente?.unidade?.equipamentosBiometricos.length ?? null;
  const quantidadeEquipamentosAtivosOrgao =
    quantidadeEquipamentosAtivosUnidade === 0 && servidor?.orgaoId
      ? await prisma.equipamentoBiometrico.count({
          where: {
            ativo: true,
            orgaoId: servidor.orgaoId,
          },
        })
      : null;
  const dispensaPontoEletronico = resolverDispensaPontoEletronico({
    cargoDescricao: servidor?.cargo?.descricao,
    quantidadeEquipamentosAtivosUnidade,
    quantidadeEquipamentosAtivosOrgao,
    dispensaAdministrativa: dispensaAdministrativa
      ? {
          motivo: dispensaAdministrativa.motivo,
          exigeFrequenciaManual:
            dispensaAdministrativa.exigeFrequenciaManual,
        }
      : null,
  });
  const previsaoJornadaDia = jornadaServidor
    ? resolverPrevisaoJornadaDia({
        jornada: jornadaServidor.jornada,
        escala: jornadaServidor.escala,
        dataReferencia: dataNormalizada,
      })
    : null;
  const jornadaVigenteSnapshot = jornadaServidor
    ? {
        jornadaServidorId: jornadaServidor.id,
        jornadaId: jornadaServidor.jornadaId,
        escalaId: jornadaServidor.escalaId,
        tipoVinculacao: jornadaServidor.tipoVinculacao,
        dataInicio: jornadaServidor.dataInicio,
        dataFim: jornadaServidor.dataFim,
        jornada: {
          codigo: jornadaServidor.jornada.codigo,
          nome: jornadaServidor.jornada.nome,
          tipo: jornadaServidor.jornada.tipo,
          versao: jornadaServidor.jornada.versao,
          orgaoId: jornadaServidor.jornada.orgaoId,
          cargaDiariaMinutos: jornadaServidor.jornada.cargaDiariaMinutos,
          cargaSemanalMinutos: jornadaServidor.jornada.cargaSemanalMinutos,
          cargaMensalMinutos: jornadaServidor.jornada.cargaMensalMinutos,
          cargaMinimaDiariaMinutos:
            jornadaServidor.jornada.cargaMinimaDiariaMinutos,
          cargaMaximaDiariaMinutos:
            jornadaServidor.jornada.cargaMaximaDiariaMinutos,
          controlaHorario: jornadaServidor.jornada.controlaHorario,
          permiteFlexibilidade: jornadaServidor.jornada.permiteFlexibilidade,
          permiteBancoHoras: jornadaServidor.jornada.permiteBancoHoras,
          permiteHoraExtra: jornadaServidor.jornada.permiteHoraExtra,
          exigeIntervalo: jornadaServidor.jornada.exigeIntervalo,
          intervaloMinimoMinutos:
            jornadaServidor.jornada.intervaloMinimoMinutos,
          intervaloMaximoMinutos:
            jornadaServidor.jornada.intervaloMaximoMinutos,
          horarioDiferenciadoPermitido:
            jornadaServidor.jornada.horarioDiferenciadoPermitido,
          horarioDiferenciadoAutorizado:
            jornadaServidor.horarioDiferenciadoAutorizado,
          entradaMinimaDiferenciada:
            jornadaServidor.jornada.entradaMinimaDiferenciada,
          saidaMaximaDiferenciada:
            jornadaServidor.jornada.saidaMaximaDiferenciada,
          horarioEntradaPadrao:
            jornadaServidor.jornada.horarioEntradaPadrao,
          horarioSaidaPadrao: jornadaServidor.jornada.horarioSaidaPadrao,
          nucleoObrigatorioInicio:
            jornadaServidor.jornada.nucleoObrigatorioInicio,
          nucleoObrigatorioFim:
            jornadaServidor.jornada.nucleoObrigatorioFim,
          permanenciaMaximaMinutos:
            jornadaServidor.jornada.permanenciaMaximaMinutos,
          horarioLimiteVirada:
            jornadaServidor.jornada.horarioLimiteVirada,
          cruzaMeiaNoite: jornadaServidor.jornada.cruzaMeiaNoite,
          fundamentoNormativo:
            jornadaServidor.jornada.fundamentoNormativo,
          vigenciaInicio: jornadaServidor.jornada.vigenciaInicio,
          vigenciaFim: jornadaServidor.jornada.vigenciaFim,
        },
        previsaoDia: previsaoJornadaDia,
      }
    : null;

  const marcacoesNormalizadas =
    jornadaServidor && !jornadaServidor.jornada.exigeIntervalo
      ? await normalizarMarcacoesSemIntervaloService(prisma, marcacoes)
      : marcacoes;

  const calculoBase = calcularApuracaoDiaria({
    marcacoes: marcacoesNormalizadas,
    jornada: jornadaServidor
        ? {
          jornadaServidorId: jornadaServidor.id,
          cargaDiariaMinutos: jornadaServidor.jornada.cargaDiariaMinutos,
          cargaPrevistaMinutos:
            previsaoJornadaDia?.cargaPrevistaMinutos ??
            jornadaServidor.jornada.cargaDiariaMinutos,
          trabalhaNoDia: previsaoJornadaDia?.trabalha ?? true,
          controlaHorario: jornadaServidor.jornada.controlaHorario,
          janelaPrevista: previsaoJornadaDia?.janela
            ? {
                inicio: previsaoJornadaDia.janela.inicio,
                fim: previsaoJornadaDia.janela.fim,
                diferenciada:
                  jornadaServidor.jornada.horarioDiferenciadoPermitido &&
                  jornadaServidor.horarioDiferenciadoAutorizado,
              }
            : null,
          exigeIntervalo: jornadaServidor.jornada.exigeIntervalo,
          intervaloMinimoMinutos:
            jornadaServidor.jornada.intervaloMinimoMinutos,
          intervaloMaximoMinutos:
            jornadaServidor.jornada.intervaloMaximoMinutos,
          horarioDiferenciadoPermitido:
            jornadaServidor.jornada.horarioDiferenciadoPermitido,
          horarioDiferenciadoAutorizado:
            jornadaServidor.horarioDiferenciadoAutorizado,
          entradaMinimaDiferenciada:
            jornadaServidor.jornada.entradaMinimaDiferenciada,
          saidaMaximaDiferenciada:
            jornadaServidor.jornada.saidaMaximaDiferenciada,
          servidorDedicacaoIntegral,
        }
      : null,
    diaInstitucional,
    fusoHorario,
    regulamentacao,
    dispensaPontoEletronico: dispensaPontoEletronico.dispensado
      ? {
          ativa: true,
          motivos: dispensaPontoEletronico.motivos,
          exigeFrequenciaManual:
            dispensaPontoEletronico.exigeFrequenciaManual,
        }
      : null,
  });
  const { calculo, solicitacoesAplicadas } =
    aplicarSolicitacoesDeferidasApuracao({
      calculo: calculoBase,
      dataReferencia: dataNormalizada,
      jornada: jornadaServidor
        ? {
            cargaDiariaMinutos: jornadaServidor.jornada.cargaDiariaMinutos,
          }
        : null,
      solicitacoes: solicitacoesDeferidas as Array<{
        id: string;
        tipo: typeof TIPOS_SOLICITACAO_COM_EFEITO_APURACAO[number];
        titulo: string;
        descricao: string;
        dataReferencia: Date | null;
        dataInicio: Date | null;
        dataFim: Date | null;
        dadosSolicitados: unknown;
      }>,
      marcacoes: marcacoesNormalizadas,
      fusoHorario,
    });

  const apuracao = await prisma.$transaction(async (tx) => {
    const apuracaoAtualizada = await tx.apuracaoDiaria.upsert({
      where: {
        servidorId_dataReferencia: {
          servidorId,
          dataReferencia: dataNormalizada,
        },
      },
      update: {
        jornadaServidorId: jornadaServidor?.id ?? null,
        cargaPrevistaMinutos: calculo.cargaPrevistaMinutos,
        minutosTrabalhados: calculo.minutosTrabalhados,
        minutosIntervalo: calculo.minutosIntervalo,
        minutosCredito: calculo.minutosCredito,
        minutosDebito: calculo.minutosDebito,
        resultado: calculo.resultado,
        status: calculo.status,
        primeiraEntrada: calculo.primeiraEntrada,
        saidaIntervalo: calculo.saidaIntervalo,
        retornoIntervalo: calculo.retornoIntervalo,
        ultimaSaida: calculo.ultimaSaida,
        calculadaEm: new Date(),
        metadados: {
          origem,
          quantidadeMarcacoes: marcacoesNormalizadas.length,
          tipoDiaInstitucional: diaInstitucional.tipo,
          descricaoDiaInstitucional: diaInstitucional.descricao,
          fonteDiaInstitucional: diaInstitucional.fonte,
          contaComoDiaUtil: diaInstitucional.contaComoDiaUtil,
          geraApuracaoRegular: diaInstitucional.geraApuracaoRegular,
          eventoCalendarioId: diaInstitucional.eventoCalendarioId ?? null,
          janelaInstitucional:
            diaInstitucional.janelaInicio && diaInstitucional.janelaFim
              ? {
                  inicio: diaInstitucional.janelaInicio,
                  fim: diaInstitucional.janelaFim,
                }
              : null,
          dataOriginalEventoCalendario: diaInstitucional.dataOriginal ?? null,
          dataSubstituidaEventoCalendario:
            diaInstitucional.dataSubstituida ?? false,
          recessoForenseId: diaInstitucional.recessoForenseId ?? null,
          janelaExpediente: calculo.janelaExpediente,
          expedienteUnidade,
          fusoHorario,
          regulamentacaoPonto: regulamentacao,
          jornadaVigente: jornadaVigenteSnapshot,
          jornadaSnapshotApuracao: jornadaVigenteSnapshot,
          previsaoJornadaDia,
          minutosForaExpediente: calculo.minutosForaExpediente,
          dispensaPontoEletronico: calculo.dispensaPontoEletronico,
          dispensaPontoAdministrativa: dispensaAdministrativa,
          trabalhoRemoto: calculo.trabalhoRemoto,
          frequenciaManual: calculo.frequenciaManual,
          solicitacoesAplicadas,
        },
      },
      create: {
        servidorId,
        jornadaServidorId: jornadaServidor?.id ?? null,
        dataReferencia: dataNormalizada,
        cargaPrevistaMinutos: calculo.cargaPrevistaMinutos,
        minutosTrabalhados: calculo.minutosTrabalhados,
        minutosIntervalo: calculo.minutosIntervalo,
        minutosCredito: calculo.minutosCredito,
        minutosDebito: calculo.minutosDebito,
        resultado: calculo.resultado,
        status: calculo.status,
        primeiraEntrada: calculo.primeiraEntrada,
        saidaIntervalo: calculo.saidaIntervalo,
        retornoIntervalo: calculo.retornoIntervalo,
        ultimaSaida: calculo.ultimaSaida,
        calculadaEm: new Date(),
        metadados: {
          origem,
          quantidadeMarcacoes: marcacoesNormalizadas.length,
          tipoDiaInstitucional: diaInstitucional.tipo,
          descricaoDiaInstitucional: diaInstitucional.descricao,
          fonteDiaInstitucional: diaInstitucional.fonte,
          contaComoDiaUtil: diaInstitucional.contaComoDiaUtil,
          geraApuracaoRegular: diaInstitucional.geraApuracaoRegular,
          eventoCalendarioId: diaInstitucional.eventoCalendarioId ?? null,
          janelaInstitucional:
            diaInstitucional.janelaInicio && diaInstitucional.janelaFim
              ? {
                  inicio: diaInstitucional.janelaInicio,
                  fim: diaInstitucional.janelaFim,
                }
              : null,
          dataOriginalEventoCalendario: diaInstitucional.dataOriginal ?? null,
          dataSubstituidaEventoCalendario:
            diaInstitucional.dataSubstituida ?? false,
          recessoForenseId: diaInstitucional.recessoForenseId ?? null,
          janelaExpediente: calculo.janelaExpediente,
          expedienteUnidade,
          fusoHorario,
          regulamentacaoPonto: regulamentacao,
          jornadaVigente: jornadaVigenteSnapshot,
          jornadaSnapshotApuracao: jornadaVigenteSnapshot,
          previsaoJornadaDia,
          minutosForaExpediente: calculo.minutosForaExpediente,
          dispensaPontoEletronico: calculo.dispensaPontoEletronico,
          dispensaPontoAdministrativa: dispensaAdministrativa,
          trabalhoRemoto: calculo.trabalhoRemoto,
          frequenciaManual: calculo.frequenciaManual,
          solicitacoesAplicadas,
        },
      },
    });

    await tx.ocorrenciaFrequencia.deleteMany({
      where: {
        apuracaoDiariaId: apuracaoAtualizada.id,
      },
    });

    if (calculo.ocorrencias.length > 0) {
      await tx.ocorrenciaFrequencia.createMany({
        data: calculo.ocorrencias.map((ocorrencia) => ({
          apuracaoDiariaId: apuracaoAtualizada.id,
          servidorId,
          tipo: ocorrencia.tipo,
          descricao: ocorrencia.descricao,
          minutos: ocorrencia.minutos,
        })),
      });
    }

    if (usuarioIdAuditoria) {
      await tx.auditoriaEvento.create({
        data: {
          usuarioId: usuarioIdAuditoria,
          entidade: "ApuracaoDiaria",
          entidadeId: apuracaoAtualizada.id,
          acao: "APURACAO_DIARIA_RECALCULADA",
          dadosDepois: {
            servidorId,
            dataReferencia: dataNormalizada,
            resultado: calculo.resultado,
            status: calculo.status,
            tipoDiaInstitucional: diaInstitucional.tipo,
            minutosTrabalhados: calculo.minutosTrabalhados,
            minutosCredito: calculo.minutosCredito,
            minutosDebito: calculo.minutosDebito,
            janelaExpediente: calculo.janelaExpediente,
            expedienteUnidade,
            minutosForaExpediente: calculo.minutosForaExpediente,
            dispensaPontoEletronico: calculo.dispensaPontoEletronico,
            dispensaPontoAdministrativa: dispensaAdministrativa,
            trabalhoRemoto: calculo.trabalhoRemoto,
            frequenciaManual: calculo.frequenciaManual,
            origem,
            regulamentacaoPonto: regulamentacao,
          },
        },
      });
    }

    return apuracaoAtualizada;
  });

  return {
    apuracao,
    calculo,
  };
}
