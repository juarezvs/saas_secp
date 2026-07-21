import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  analisarAfdRelogioPontoService,
  listarCadastrosBiometricosEquipamentoService,
} from "@/modules/integracoes/application/services/relogios-ponto/relogio-ponto-operacoes.service";
import type { IdentificadorAfdRelogioPonto } from "@/modules/integracoes/domain/relogio-ponto.types";
import { gerarHashMarcacaoBruta } from "./gerar-hash-marcacao-bruta.service";
import { processarMarcacaoBrutaService } from "./processar-marcacao-bruta.service";

type ResultadoSaneamentoIdClassAfd = {
  modo: "SIMULACAO" | "APLICACAO";
  equipamentoId: string;
  nsrInicial: string | number;
  nsrFinal: string | number | null;
  quantidadePorLote: number;
  limiteLotes: number;
  lotesExecutados: number;
  registrosAfd: number;
  marcacoesAnalisadas: number;
  encontradasNoBanco: number;
  alteracoesDetectadas: number;
  saneadas: number;
  reprocessadas: number;
  pendentesAposReprocessamento: number;
  conflitosHash: number;
  ignoradasProcessadas: number;
  semMarcacaoBruta: number;
  semIdentificacao: number;
  pisResolvidosPorNome: number;
  pisSemCpf: number;
  erros: string[];
  proximoNsr: string | null;
};

function somenteDigitos(valor: string | null | undefined) {
  return valor?.replace(/\D/g, "") || null;
}

function normalizarNome(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function payloadComoObjeto(valor: unknown) {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

async function carregarCpfsPorNomeEquipamento(equipamentoId: string) {
  const cpfsPorNome = new Map<string, string>();
  let offset = 0;

  while (offset < 20000) {
    const leitura = await listarCadastrosBiometricosEquipamentoService({
      equipamentoId,
      indiceInicial: offset,
      quantidade: 500,
    });

    for (const cadastro of leitura.cadastros) {
      const cpf = somenteDigitos(cadastro.cpf);
      const nome = normalizarNome(cadastro.nome);

      if (cpf && nome && !cpfsPorNome.has(nome)) {
        cpfsPorNome.set(nome, cpf);
      }
    }

    if (leitura.cadastros.length < 500) {
      break;
    }

    offset += leitura.cadastros.length;
  }

  return cpfsPorNome;
}

function resolverIdentificacao(params: {
  registro: IdentificadorAfdRelogioPonto;
  nomePorIdentificador: Map<string, string>;
  cpfsPorNome: Map<string, string>;
}) {
  const cpf = somenteDigitos(params.registro.cpf);

  if (cpf) {
    return {
      cpf,
      pis: params.registro.pis ?? null,
      matricula: null,
      metodo: "CPF_AFD",
      nome: params.registro.nome ?? null,
    };
  }

  const nome =
    params.registro.nome ??
    params.nomePorIdentificador.get(params.registro.identificador) ??
    null;
  const cpfPorNome = params.cpfsPorNome.get(normalizarNome(nome));

  if (cpfPorNome) {
    return {
      cpf: cpfPorNome,
      pis: params.registro.pis ?? null,
      matricula: null,
      metodo: "PIS_RESOLVIDO_POR_NOME_CADASTRO_RELOGIO",
      nome,
    };
  }

  return {
    cpf: null,
    pis: params.registro.pis ?? null,
    matricula: null,
    metodo: params.registro.pis ? "PIS_SEM_CPF_COMPATIVEL" : "SEM_IDENTIFICACAO",
    nome,
  };
}

export async function sanearMarcacoesIdClassAfdService(params: {
  equipamentoId: string;
  nsrInicial?: string | number | null;
  nsrFinal?: string | number | null;
  quantidadePorLote?: number | null;
  limiteLotes?: number | null;
  aplicar?: boolean;
  reprocessar?: boolean;
  usuarioIdAuditoria?: string | null;
}): Promise<ResultadoSaneamentoIdClassAfd> {
  const quantidadePorLote = Math.min(
    Math.max(Number(params.quantidadePorLote ?? 500), 1),
    500,
  );
  const limiteLotes = Math.min(Math.max(Number(params.limiteLotes ?? 100), 1), 500);
  const nsrFinal =
    params.nsrFinal === null || params.nsrFinal === undefined
      ? null
      : Number(params.nsrFinal);
  const resumo: ResultadoSaneamentoIdClassAfd = {
    modo: params.aplicar ? "APLICACAO" : "SIMULACAO",
    equipamentoId: params.equipamentoId,
    nsrInicial: params.nsrInicial ?? 1,
    nsrFinal: params.nsrFinal ?? null,
    quantidadePorLote,
    limiteLotes,
    lotesExecutados: 0,
    registrosAfd: 0,
    marcacoesAnalisadas: 0,
    encontradasNoBanco: 0,
    alteracoesDetectadas: 0,
    saneadas: 0,
    reprocessadas: 0,
    pendentesAposReprocessamento: 0,
    conflitosHash: 0,
    ignoradasProcessadas: 0,
    semMarcacaoBruta: 0,
    semIdentificacao: 0,
    pisResolvidosPorNome: 0,
    pisSemCpf: 0,
    erros: [],
    proximoNsr: null,
  };
  const cpfsPorNome = await carregarCpfsPorNomeEquipamento(params.equipamentoId);
  const nomePorIdentificador = new Map<string, string>();
  let nsrAtual = params.nsrInicial ?? 1;

  while (resumo.lotesExecutados < limiteLotes) {
    const analise = await analisarAfdRelogioPontoService({
      equipamentoId: params.equipamentoId,
      nsrInicial: nsrAtual,
      quantidade: quantidadePorLote,
    });
    const registros = analise.registros.filter((registro) => {
      const nsr = Number(registro.nsr);
      return nsrFinal === null || !Number.isFinite(nsr) || nsr <= nsrFinal;
    });

    resumo.lotesExecutados += 1;
    resumo.registrosAfd += registros.length;
    resumo.proximoNsr = analise.proximoNsr ?? null;

    for (const registro of registros) {
      if (registro.tipoRegistro === "CADASTRO") {
        if (registro.nome) {
          nomePorIdentificador.set(registro.identificador, registro.nome);
        }
        continue;
      }

      resumo.marcacoesAnalisadas += 1;

      const brutas = await prisma.marcacaoBruta.findMany({
        where: {
          equipamentoId: params.equipamentoId,
          origem: "EQUIPAMENTO_BIOMETRICO",
          nsr: registro.nsr,
        },
        orderBy: {
          criadoEm: "asc",
        },
      });

      if (brutas.length === 0) {
        resumo.semMarcacaoBruta += 1;
        continue;
      }

      resumo.encontradasNoBanco += brutas.length;

      const identificacao = resolverIdentificacao({
        registro,
        nomePorIdentificador,
        cpfsPorNome,
      });

      if (!identificacao.cpf && !identificacao.pis && !identificacao.matricula) {
        resumo.semIdentificacao += 1;
      }

      if (identificacao.metodo === "PIS_RESOLVIDO_POR_NOME_CADASTRO_RELOGIO") {
        resumo.pisResolvidosPorNome += 1;
      }

      if (identificacao.metodo === "PIS_SEM_CPF_COMPATIVEL") {
        resumo.pisSemCpf += 1;
      }

      for (const bruta of brutas) {
        if (bruta.marcacaoId) {
          resumo.ignoradasProcessadas += 1;
          continue;
        }

        const cpfAtual = somenteDigitos(bruta.cpf);
        const pisAtual = somenteDigitos(bruta.pis);
        const matriculaAtual = bruta.matricula ?? null;
        const deveAlterar =
          cpfAtual !== identificacao.cpf ||
          pisAtual !== identificacao.pis ||
          matriculaAtual !== identificacao.matricula;

        if (!deveAlterar) {
          continue;
        }

        resumo.alteracoesDetectadas += 1;

        const novoHash = gerarHashMarcacaoBruta({
          cpf: identificacao.cpf,
          pis: identificacao.pis,
          matricula: identificacao.matricula,
          dataHora: bruta.dataHora,
          equipamentoCodigo: bruta.equipamentoCodigo,
          origem: bruta.origem,
          nsr: bruta.nsr,
          codigoExterno: bruta.codigoExterno,
        });
        const conflito = await prisma.marcacaoBruta.findUnique({
          where: {
            hashRegistro: novoHash,
          },
          select: {
            id: true,
          },
        });

        if (conflito && conflito.id !== bruta.id) {
          resumo.conflitosHash += 1;
          continue;
        }

        if (!params.aplicar) {
          continue;
        }

        try {
          await prisma.$transaction([
            prisma.marcacaoBruta.update({
              where: {
                id: bruta.id,
              },
              data: {
                cpf: identificacao.cpf,
                pis: identificacao.pis,
                matricula: identificacao.matricula,
                servidorId: null,
                processada: false,
                processadaEm: null,
                hashRegistro: novoHash,
                payloadOriginal: {
                  ...payloadComoObjeto(bruta.payloadOriginal),
                  saneamentoIdClassAfd: {
                    saneadoEm: new Date().toISOString(),
                    identificadorAfd: registro.identificador,
                    tipoIdentificadorAfd: registro.tipoIdentificador,
                    cpfAfd: registro.cpf ?? null,
                    pisAfd: registro.pis ?? null,
                    nomeAfd: identificacao.nome,
                    metodo: identificacao.metodo,
                    cpfAnterior: bruta.cpf,
                    pisAnterior: bruta.pis,
                    matriculaAnterior: bruta.matricula,
                    hashAnterior: bruta.hashRegistro,
                    hashAtual: novoHash,
                  },
                } as never,
              },
            }),
            prisma.auditoriaEvento.create({
              data: {
                usuarioId: params.usuarioIdAuditoria ?? null,
                entidade: "MarcacaoBruta",
                entidadeId: bruta.id,
                acao: "MARCACAO_BRUTA_IDENTIFICACAO_SANEADA_IDCLASS_AFD",
                dadosAntes: {
                  cpf: bruta.cpf,
                  pis: bruta.pis,
                  matricula: bruta.matricula,
                  hashRegistro: bruta.hashRegistro,
                  nsr: bruta.nsr,
                } as never,
                dadosDepois: {
                  cpf: identificacao.cpf,
                  pis: identificacao.pis,
                  matricula: identificacao.matricula,
                  hashRegistro: novoHash,
                  nsr: bruta.nsr,
                  identificadorAfd: registro.identificador,
                  tipoIdentificadorAfd: registro.tipoIdentificador,
                  pisAfd: registro.pis ?? null,
                  metodo: identificacao.metodo,
                } as never,
              },
            }),
          ]);

          resumo.saneadas += 1;

          if (params.reprocessar) {
            const processamento = await processarMarcacaoBrutaService({
              marcacaoBrutaId: bruta.id,
              usuarioIdAuditoria: params.usuarioIdAuditoria ?? undefined,
            });

            if (processamento.sucesso) {
              resumo.reprocessadas += 1;
            } else {
              resumo.pendentesAposReprocessamento += 1;
            }
          }
        } catch (error) {
          resumo.erros.push(
            error instanceof Error
              ? `${bruta.id}: ${error.message}`
              : `${bruta.id}: erro desconhecido`,
          );
        }
      }
    }

    if (!analise.proximoNsr || String(analise.proximoNsr) === String(nsrAtual)) {
      break;
    }

    if (nsrFinal !== null && Number(analise.proximoNsr) > nsrFinal) {
      break;
    }

    nsrAtual = analise.proximoNsr;
  }

  return resumo;
}
