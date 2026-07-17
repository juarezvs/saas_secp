import { prisma } from "@/shared/infrastructure/database/prisma";
import { criarMarcacaoBrutaService } from "@/modules/marcacoes-brutas/application/services/criar-marcacao-bruta.service";
import { processarMarcacaoBrutaService } from "@/modules/marcacoes-brutas/application/services/processar-marcacao-bruta.service";
import type {
  CadastroBiometricoEquipamento,
  DadosConexaoRelogioPonto,
  FabricanteRelogioPonto,
  FormatoTemplateBiometricoRelogio,
  MarcacaoRelogioPonto,
} from "@/modules/integracoes/domain/relogio-ponto.types";
import { criarRelogioPontoProvider } from "./relogio-ponto-provider.service";

type ConfiguracaoEquipamento = {
  usuario?: unknown;
  senha?: unknown;
  usuarioDados?: unknown;
  senhaDados?: unknown;
  usuarioConfiguracao?: unknown;
  senhaConfiguracao?: unknown;
  timeoutMs?: unknown;
  ultimoNsrColetado?: unknown;
  proximoNsrColeta?: unknown;
  webhookToken?: unknown;
  eventosOnline?: unknown;
};

type ResultadoSincronizacaoBiometria = {
  origem: {
    equipamentoId: string;
    codigo: string;
    nome: string;
  };
  destinos: Array<{
    equipamentoId: string;
    codigo: string;
    nome: string;
    sucesso: boolean;
    mensagem: string;
    enviados: number;
    rejeitados: number;
  }>;
  lidos: number;
  comTemplate: number;
  ignoradosSemTemplate: number;
};

type RelogioPontoLocksGlobal = typeof globalThis & {
  __secpRelogioPontoLocks?: Map<string, Promise<void>>;
};

function somenteDigitos(valor: string | null | undefined) {
  return (valor ?? "").replace(/\D/g, "");
}

function aguardar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function erroTransienteRelogio(error: unknown) {
  if (!(error instanceof Error)) return false;

  return (
    error.message.includes("Tempo limite") ||
    error.message.includes("Resposta RA do Henry") ||
    error.message.includes("ocupado") ||
    error.message.includes("Status Henry 017") ||
    error.message.includes("Status Henry 050") ||
    error.message.includes("Status Henry 102")
  );
}

async function executarComLockEquipamento<T>(
  equipamentoId: string,
  operacao: () => Promise<T>,
) {
  const globalLocks = globalThis as RelogioPontoLocksGlobal;
  globalLocks.__secpRelogioPontoLocks ??= new Map();
  const locks = globalLocks.__secpRelogioPontoLocks;
  const lockAnterior = locks.get(equipamentoId) ?? Promise.resolve();

  let liberar!: () => void;
  const lockAtual = new Promise<void>((resolve) => {
    liberar = resolve;
  });

  const lockEncadeado = lockAnterior
    .catch(() => undefined)
    .then(() => lockAtual);
  locks.set(equipamentoId, lockEncadeado);

  await lockAnterior.catch(() => undefined);

  try {
    return await operacao();
  } finally {
    liberar();
    if (locks.get(equipamentoId) === lockEncadeado) {
      locks.delete(equipamentoId);
    }
  }
}

function lerConfiguracao(configuracao: unknown): ConfiguracaoEquipamento {
  if (!configuracao || typeof configuracao !== "object") {
    return {};
  }

  return configuracao as ConfiguracaoEquipamento;
}

function valorTexto(valor: unknown) {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function valorNumero(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function prefixoMatriculaPorSiglaOrgao(sigla: string | null | undefined) {
  const normalizada = sigla?.trim().toUpperCase();

  if (!normalizada) return null;

  if (/^SJ[A-Z]{2}$/.test(normalizada)) {
    return normalizada.slice(2);
  }

  return normalizada;
}

function normalizarMatriculaControlId(params: {
  matricula: string | null | undefined;
  fabricante: FabricanteRelogioPonto;
  siglaOrgao?: string | null;
  configuracao?: ConfiguracaoEquipamento;
}) {
  const matricula = params.matricula?.trim();

  if (!matricula || params.fabricante !== "CONTROL_ID") {
    return matricula ?? null;
  }

  if (!/^\d+$/.test(matricula)) {
    return matricula.toUpperCase();
  }

  const prefixoConfigurado = valorTexto(
    (params.configuracao as Record<string, unknown> | undefined)
      ?.prefixoMatriculaControlId,
  );
  const prefixo =
    prefixoConfigurado?.toUpperCase() ??
    prefixoMatriculaPorSiglaOrgao(params.siglaOrgao);
  const numero = matricula.replace(/^0+/, "") || "0";

  return prefixo ? `${prefixo}${numero}` : numero;
}

function normalizarFabricante(valor: string | null): FabricanteRelogioPonto {
  const fabricante = valor?.trim().toUpperCase();

  if (fabricante === "HENRY") {
    return "HENRY";
  }

  if (fabricante === "DIMEP") {
    return "DIMEP";
  }

  if (
    fabricante === "CONTROL_ID" ||
    fabricante === "CONTROLID" ||
    fabricante === "CONTROL ID" ||
    fabricante === "CONTROLI D" ||
    fabricante === "CONTROL-ID" ||
    fabricante === "IDFACE" ||
    fabricante === "IDCLASS" ||
    fabricante === "IDCLASS BIO"
  ) {
    return "CONTROL_ID";
  }

  return "GENERIC";
}

function protocoloConfigurado(configuracao: ConfiguracaoEquipamento) {
  return valorTexto(
    (configuracao as Record<string, unknown> | undefined)?.protocolo,
  )?.toUpperCase();
}

function portaPadraoEquipamento(params: {
  fabricante: FabricanteRelogioPonto;
  configuracao: ConfiguracaoEquipamento;
}) {
  if (params.fabricante === "CONTROL_ID") {
    return protocoloConfigurado(params.configuracao) === "CONTROL_ID_IDCLASS_BIO"
      ? 443
      : 80;
  }

  return 3000;
}

async function obterConexaoEquipamento(
  equipamentoId: string,
  perfilCredencial: "dados" | "configuracao" = "dados",
): Promise<DadosConexaoRelogioPonto> {
  const equipamento = await prisma.equipamentoBiometrico.findUnique({
    where: { id: equipamentoId },
  });

  if (!equipamento || !equipamento.ativo) {
    throw new Error("Equipamento nao cadastrado ou inativo.");
  }

  if (!equipamento.ip) {
    throw new Error("Equipamento sem IP configurado.");
  }

  const config = lerConfiguracao(equipamento.configuracao);
  const fabricante = normalizarFabricante(equipamento.fabricante);

  return {
    equipamentoId: equipamento.id,
    codigo: equipamento.codigo,
    fabricante,
    modelo: equipamento.modelo,
    ip: equipamento.ip,
    porta: equipamento.porta ?? portaPadraoEquipamento({ fabricante, configuracao: config }),
    usuario:
      perfilCredencial === "configuracao"
        ? (valorTexto(config.usuarioConfiguracao) ?? valorTexto(config.usuario))
        : (valorTexto(config.usuarioDados) ?? valorTexto(config.usuario)),
    senha:
      perfilCredencial === "configuracao"
        ? (valorTexto(config.senhaConfiguracao) ?? valorTexto(config.senha))
        : (valorTexto(config.senhaDados) ?? valorTexto(config.senha)),
    timeoutMs: valorNumero(config.timeoutMs),
    configuracao: equipamento.configuracao,
  };
}

export async function consultarSaudeRelogioPontoService(equipamentoId: string) {
  const conexao = await obterConexaoEquipamento(equipamentoId);
  const provider = criarRelogioPontoProvider(conexao);
  const resultado = await provider.testarConexao();

  await prisma.$transaction(async (tx) => {
    await tx.equipamentoBiometrico.update({
      where: { id: equipamentoId },
      data: {
        ultimoHeartbeatEm:
          resultado.status === "ONLINE" ? resultado.dataHoraConsulta : undefined,
      },
    });

    await tx.eventoEquipamentoBiometrico.create({
      data: {
        equipamentoId,
        tipoEvento: resultado.status === "ONLINE" ? "HEARTBEAT" : "ERRO",
        processado: true,
        processadoEm: new Date(),
        erro: resultado.status === "ONLINE" ? null : resultado.mensagem,
        payload: resultado as never,
      },
    });
  });

  return resultado;
}

export async function listarCadastrosBiometricosEquipamentoService(params: {
  equipamentoId: string;
  quantidade?: number | null;
  indiceInicial?: string | number | null;
  incluirTemplates?: boolean;
}) {
  return executarComLockEquipamento(params.equipamentoId, async () => {
    const conexao = await obterConexaoEquipamento(params.equipamentoId);
    const equipamento = await prisma.equipamentoBiometrico.findUnique({
      where: { id: params.equipamentoId },
      select: {
        configuracao: true,
        orgao: {
          select: {
            sigla: true,
          },
        },
        unidade: {
          select: {
            orgao: {
              select: {
                sigla: true,
              },
            },
          },
        },
      },
    });
    const provider = criarRelogioPontoProvider(conexao);

    if (!provider.listarCadastrosBiometricos) {
      throw new Error(
        "Este protocolo ainda nao possui leitura de cadastros biometricos.",
      );
    }

    const resultado = await provider.listarCadastrosBiometricos({
      quantidade: params.quantidade ?? undefined,
      indiceInicial: params.indiceInicial ?? undefined,
      incluirTemplates: params.incluirTemplates,
    });

    if (conexao.fabricante !== "CONTROL_ID") {
      return resultado;
    }

    const configuracao = lerConfiguracao(
      equipamento?.configuracao ?? conexao.configuracao,
    );

    return {
      ...resultado,
      cadastros: resultado.cadastros.map((cadastro) => {
        const matriculaNormalizada = normalizarMatriculaControlId({
          matricula: cadastro.matricula,
          fabricante: conexao.fabricante,
          siglaOrgao:
            equipamento?.orgao?.sigla ?? equipamento?.unidade?.orgao.sigla,
          configuracao,
        });

        return {
          ...cadastro,
          matricula: matriculaNormalizada ?? cadastro.matricula,
          payload: {
            ...(typeof cadastro.payload === "object" && cadastro.payload
              ? cadastro.payload
              : {}),
            matriculaOriginal: cadastro.matricula,
            matriculaNormalizada,
          },
        };
      }),
    };
  });
}

type ColetarMarcacoesRelogioPontoParams = {
  equipamentoId: string;
  nsrInicial?: string | number | null;
  quantidade?: number | null;
  usuarioIdAuditoria?: string | null;
  atualizarCursor?: boolean;
  filtroMarcacao?: (marcacao: MarcacaoRelogioPonto) => boolean;
};

async function coletarMarcacoesRelogioPontoSemLock(
  params: ColetarMarcacoesRelogioPontoParams,
) {
  const conexao = await obterConexaoEquipamento(params.equipamentoId);
  const equipamento = await prisma.equipamentoBiometrico.findUniqueOrThrow({
    where: { id: params.equipamentoId },
    include: {
      orgao: {
        select: {
          sigla: true,
        },
      },
      unidade: {
        select: {
          orgao: {
            select: {
              sigla: true,
            },
          },
        },
      },
    },
  });
  const configuracao = lerConfiguracao(equipamento.configuracao);
  const nsrInicial =
    params.nsrInicial ??
    valorNumero(configuracao.proximoNsrColeta) ??
    valorNumero(configuracao.ultimoNsrColetado) ??
    1;
  const provider = criarRelogioPontoProvider(conexao);
  const resultado = await provider.coletarMarcacoesDesdeNsr({
    nsrInicial,
    quantidade: params.quantidade ?? undefined,
  });

  let criadas = 0;
  let processadas = 0;
  let ignoradasPorFiltro = 0;

  for (const marcacao of resultado.marcacoes) {
    if (params.filtroMarcacao && !params.filtroMarcacao(marcacao)) {
      ignoradasPorFiltro += 1;
      continue;
    }

    const matriculaNormalizada = normalizarMatriculaControlId({
      matricula: marcacao.matricula,
      fabricante: conexao.fabricante,
      siglaOrgao: equipamento.orgao?.sigla ?? equipamento.unidade?.orgao.sigla,
      configuracao,
    });

    const bruta = await criarMarcacaoBrutaService({
      cpf: marcacao.cpf ? somenteDigitos(marcacao.cpf) : null,
      matricula: matriculaNormalizada,
      dataHora: marcacao.dataHora,
      equipamentoCodigo: equipamento.codigo,
      equipamentoId: equipamento.id,
      origem: "EQUIPAMENTO_BIOMETRICO",
      nsr: marcacao.nsr ?? null,
      codigoExterno: marcacao.codigoExterno ?? marcacao.nsr ?? null,
      payloadOriginal: {
        ...marcacao,
        matriculaOriginal: marcacao.matricula ?? null,
        matriculaNormalizada,
        fonte:
          conexao.fabricante === "CONTROL_ID"
            ? "CONTROL_ID_ACCESS_LOGS"
            : conexao.fabricante === "DIMEP"
              ? "DIMEP"
              : "HENRY_RR",
      },
    });

    if (bruta.criada) {
      criadas += 1;
    }

    const processamento = await processarMarcacaoBrutaService({
      marcacaoBrutaId: bruta.marcacaoBruta.id,
      usuarioIdAuditoria: params.usuarioIdAuditoria ?? undefined,
    });

    if (processamento.sucesso) {
      processadas += 1;
    }
  }

  const proximoNsr = resultado.proximoNsr ?? null;
  const ultimaSincronizacaoEm = new Date();
  const configuracaoAtualizada: Record<string, unknown> = {
    ...((equipamento.configuracao as object | null) ?? {}),
  };

  if (params.atualizarCursor !== false && proximoNsr) {
    configuracaoAtualizada.proximoNsrColeta = proximoNsr;
    configuracaoAtualizada.ultimoNsrColetado = Number(proximoNsr) - 1;
  }

  await prisma.$transaction(async (tx) => {
    await tx.equipamentoBiometrico.update({
      where: { id: equipamento.id },
      data: {
        ultimoHeartbeatEm: ultimaSincronizacaoEm,
        ultimaSincronizacaoEm,
        configuracao: configuracaoAtualizada as never,
      },
    });

    await tx.logIntegracao.create({
      data: {
        integracaoId: equipamento.integracaoId,
        tipo: "EQUIPAMENTO_BIOMETRICO",
        direcao: "ENTRADA",
        status: "SUCESSO",
        entidade: "EquipamentoBiometrico",
        entidadeId: equipamento.id,
        mensagem: `${criadas} marcacao(oes) bruta(s) criada(s), ${processadas} processada(s).`,
        payloadEntrada: {
          comando: "RR",
          nsrInicial,
          quantidade: params.quantidade,
          filtroAplicado: Boolean(params.filtroMarcacao),
        } as never,
        payloadSaida: resultado as never,
        finalizadoEm: ultimaSincronizacaoEm,
      },
    });
  });

  return {
    ...resultado,
    criadas,
    processadas,
    ignoradasPorFiltro,
  };
}

export async function coletarMarcacoesRelogioPontoService(
  params: ColetarMarcacoesRelogioPontoParams,
) {
  return executarComLockEquipamento(params.equipamentoId, () =>
    coletarMarcacoesRelogioPontoSemLock(params),
  );
}

export async function reprocessarMarcacoesRelogioPontoService(params: {
  equipamentoId: string;
  limite?: number | null;
  usuarioIdAuditoria?: string | null;
}) {
  const limite = Math.min(Math.max(Number(params.limite ?? 5000), 1), 50000);
  const pendentes = await prisma.marcacaoBruta.findMany({
    where: {
      equipamentoId: params.equipamentoId,
      origem: "EQUIPAMENTO_BIOMETRICO",
      processada: false,
    },
    select: {
      id: true,
    },
    orderBy: {
      criadoEm: "asc",
    },
    take: limite,
  });

  let processadas = 0;
  let aindaPendentes = 0;
  let erros = 0;

  for (const bruta of pendentes) {
    try {
      const resultado = await processarMarcacaoBrutaService({
        marcacaoBrutaId: bruta.id,
        usuarioIdAuditoria: params.usuarioIdAuditoria ?? undefined,
      });

      if (resultado.sucesso) {
        processadas += 1;
      } else {
        aindaPendentes += 1;
      }
    } catch {
      erros += 1;
    }
  }

  const pendentesRestantes = await prisma.marcacaoBruta.count({
    where: {
      equipamentoId: params.equipamentoId,
      origem: "EQUIPAMENTO_BIOMETRICO",
      processada: false,
    },
  });

  return {
    analisadas: pendentes.length,
    processadas,
    aindaPendentes,
    erros,
    pendentesRestantes,
  };
}

type CapturarTodasMarcacoesRelogioPontoParams = {
  equipamentoId: string;
  nsrInicial?: string | number | null;
  quantidadePorLote?: number | null;
  limiteLotes?: number | null;
  reprocessarAoFinal?: boolean | null;
  usuarioIdAuditoria?: string | null;
  atualizarCursor?: boolean;
  filtroMarcacao?: (marcacao: MarcacaoRelogioPonto) => boolean;
  onProgress?: (progresso: {
    lotesExecutados: number;
    limiteLotes: number;
    percentual: number;
    nsrAtual: string | number;
    proximoNsr: string | null;
    recebidas: number;
    criadas: number;
    processadas: number;
    ignoradasPorFiltro: number;
    etapa: string;
  }) => void | Promise<void>;
};

async function capturarTodasMarcacoesRelogioPontoSemLock(
  params: CapturarTodasMarcacoesRelogioPontoParams,
) {
  const quantidadePorLote = Math.min(
    Math.max(Number(params.quantidadePorLote ?? 100), 1),
    500,
  );
  const limiteLotes = Math.min(Math.max(Number(params.limiteLotes ?? 100), 1), 500);
  let nsrAtual = params.nsrInicial ?? 1;
  let lotesExecutados = 0;
  let recebidas = 0;
  let criadas = 0;
  let processadas = 0;
  let ignoradasPorFiltro = 0;
  let proximoNsr: string | null = null;

  while (lotesExecutados < limiteLotes) {
    let resultado: Awaited<ReturnType<typeof coletarMarcacoesRelogioPontoSemLock>>;

    try {
      resultado = await coletarMarcacoesRelogioPontoSemLock({
        equipamentoId: params.equipamentoId,
        nsrInicial: nsrAtual,
        quantidade: quantidadePorLote,
        usuarioIdAuditoria: params.usuarioIdAuditoria,
        atualizarCursor: params.atualizarCursor,
        filtroMarcacao: params.filtroMarcacao,
      });
    } catch (error) {
      if (!erroTransienteRelogio(error)) {
        throw error;
      }

      await params.onProgress?.({
        lotesExecutados,
        limiteLotes,
        percentual: Math.min(Math.round((lotesExecutados / limiteLotes) * 100), 99),
        nsrAtual,
        proximoNsr,
        recebidas,
        criadas,
        processadas,
        ignoradasPorFiltro,
        etapa: `Falha transitória no lote ${lotesExecutados + 1}. Tentando novamente.`,
      });

      await aguardar(1500);

      resultado = await coletarMarcacoesRelogioPontoSemLock({
        equipamentoId: params.equipamentoId,
        nsrInicial: nsrAtual,
        quantidade: quantidadePorLote,
        usuarioIdAuditoria: params.usuarioIdAuditoria,
        atualizarCursor: params.atualizarCursor,
        filtroMarcacao: params.filtroMarcacao,
      });
    }

    lotesExecutados += 1;
    recebidas += resultado.marcacoes.length;
    criadas += resultado.criadas;
    processadas += resultado.processadas;
    ignoradasPorFiltro += resultado.ignoradasPorFiltro;
    proximoNsr = resultado.proximoNsr ?? null;

    await params.onProgress?.({
      lotesExecutados,
      limiteLotes,
      percentual: Math.min(Math.round((lotesExecutados / limiteLotes) * 100), 100),
      nsrAtual,
      proximoNsr,
      recebidas,
      criadas,
      processadas,
      ignoradasPorFiltro,
      etapa: proximoNsr
        ? `Lote ${lotesExecutados} concluido. Proximo NSR ${proximoNsr}.`
        : "Coleta concluida pelo relogio.",
    });

    if (!proximoNsr) {
      break;
    }

    if (String(proximoNsr) === String(nsrAtual)) {
      break;
    }

    nsrAtual = proximoNsr;
  }

  const reprocessamento = params.reprocessarAoFinal
    ? await reprocessarMarcacoesRelogioPontoService({
        equipamentoId: params.equipamentoId,
        limite: Math.min(recebidas + criadas + 500, 50000),
        usuarioIdAuditoria: params.usuarioIdAuditoria,
      })
    : null;

  return {
    lotesExecutados,
    limiteLotes,
    quantidadePorLote,
    recebidas,
    criadas,
    processadas,
    ignoradasPorFiltro,
    proximoNsr,
    limiteAtingido:
      lotesExecutados >= limiteLotes && Boolean(proximoNsr),
    reprocessamento,
  };
}

export async function capturarTodasMarcacoesRelogioPontoService(
  params: CapturarTodasMarcacoesRelogioPontoParams,
) {
  return executarComLockEquipamento(params.equipamentoId, () =>
    capturarTodasMarcacoesRelogioPontoSemLock(params),
  );
}

export async function configurarEventosOnlineRelogioPontoService(params: {
  equipamentoId: string;
  habilitado: boolean;
  ipServidor?: string | null;
  portaServidor?: number | null;
}) {
  const conexao = await obterConexaoEquipamento(
    params.equipamentoId,
    "configuracao",
  );
  const equipamento = await prisma.equipamentoBiometrico.findUniqueOrThrow({
    where: { id: params.equipamentoId },
  });
  const provider = criarRelogioPontoProvider(conexao);
  const resultado = await provider.configurarEventosOnline(params);

  await prisma.equipamentoBiometrico.update({
    where: { id: params.equipamentoId },
    data: {
      configuracao: {
        ...((equipamento.configuracao as object | null) ?? {}),
        eventosOnline: {
          habilitado: params.habilitado,
          ipServidor: params.ipServidor ?? null,
          portaServidor: params.portaServidor ?? null,
          atualizadoEm: new Date().toISOString(),
        },
      } as never,
    },
  });

  return resultado;
}

export async function enviarBiometriaRelogioPontoService(params: {
  equipamentoId: string;
  matricula: string;
  cpf?: string | null;
  nome?: string | null;
  dedo?: string | number | null;
  template: string;
  formato?: FormatoTemplateBiometricoRelogio;
}) {
  const conexao = await obterConexaoEquipamento(params.equipamentoId);
  const provider = criarRelogioPontoProvider(conexao);

  return provider.enviarBiometrias([
    {
      matricula: params.matricula,
      cpf: params.cpf ?? null,
      nome: params.nome ?? null,
      templates: [
        {
          dedo: params.dedo ?? 1,
          template: params.template,
          formato: params.formato ?? "SUPREMA",
        },
      ],
    },
  ]);
}

function cadastroParaBiometriaServidor(
  cadastro: CadastroBiometricoEquipamento,
) {
  return {
    matricula: cadastro.matricula,
    cpf: cadastro.cpf ?? null,
    nome: cadastro.nome ?? null,
    templates: cadastro.templates ?? [],
  };
}

function formatosBiometricosSuportados(conexao: DadosConexaoRelogioPonto) {
  const configuracao =
    conexao.configuracao && typeof conexao.configuracao === "object"
      ? (conexao.configuracao as Record<string, unknown>)
      : {};
  const formatosConfigurados = Array.isArray(configuracao.formatosBiometricos)
    ? configuracao.formatosBiometricos
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.toUpperCase() as FormatoTemplateBiometricoRelogio)
    : [];

  if (formatosConfigurados.length > 0) {
    return new Set(formatosConfigurados);
  }

  if (conexao.fabricante === "HENRY") {
    return new Set<FormatoTemplateBiometricoRelogio>([
      "SUPREMA",
      "FS_SWIPE_SINATRA",
      "HENRY_RAW",
    ]);
  }

  if (conexao.fabricante === "DIMEP") {
    return new Set<FormatoTemplateBiometricoRelogio>([
      "DIMEP_RAW",
      "ISO_19794_2",
      "ANSI_378",
    ]);
  }

  return new Set<FormatoTemplateBiometricoRelogio>();
}

function filtrarServidoresPorFormatosCompativeis(
  servidores: ReturnType<typeof cadastroParaBiometriaServidor>[],
  formatos: Set<FormatoTemplateBiometricoRelogio>,
) {
  return servidores
    .map((servidor) => ({
      ...servidor,
      templates: servidor.templates.filter((template) => {
        const formato = template.formato ?? "SUPREMA";
        return formatos.has(formato);
      }),
    }))
    .filter((servidor) => servidor.templates.length > 0);
}

export async function sincronizarBiometriasEquipamentosOrgaoService(params: {
  equipamentoOrigemId: string;
  quantidade?: number | null;
  indiceInicial?: string | number | null;
}): Promise<ResultadoSincronizacaoBiometria> {
  const origem = await prisma.equipamentoBiometrico.findUnique({
    where: { id: params.equipamentoOrigemId },
    include: {
      orgao: {
        select: {
          id: true,
        },
      },
      unidade: {
        select: {
          orgaoId: true,
        },
      },
    },
  });

  if (!origem || !origem.ativo) {
    throw new Error("Equipamento de origem nao cadastrado ou inativo.");
  }

  const orgaoId = origem.orgaoId ?? origem.unidade?.orgaoId;

  if (!orgaoId) {
    throw new Error(
      "Vincule o equipamento de origem a um orgao antes de sincronizar.",
    );
  }

  const leitura = await listarCadastrosBiometricosEquipamentoService({
    equipamentoId: origem.id,
    quantidade: params.quantidade ?? 100,
    indiceInicial: params.indiceInicial ?? 0,
    incluirTemplates: true,
  });
  const cadastrosComTemplate = leitura.cadastros.filter(
    (cadastro) => (cadastro.templates?.length ?? 0) > 0,
  );
  const servidores = cadastrosComTemplate.map(cadastroParaBiometriaServidor);
  const destinos = await prisma.equipamentoBiometrico.findMany({
    where: {
      id: {
        not: origem.id,
      },
      ativo: true,
      fabricante: {
        equals: "HENRY",
        mode: "insensitive",
      },
      OR: [{ orgaoId }, { unidade: { orgaoId } }],
    },
    orderBy: {
      nome: "asc",
    },
  });
  const resultados: ResultadoSincronizacaoBiometria["destinos"] = [];

  for (const destino of destinos) {
    const destinoResultado = await executarComLockEquipamento(
      destino.id,
      async () => {
        const conexao = await obterConexaoEquipamento(destino.id, "dados");
        const formatos = formatosBiometricosSuportados(conexao);
        const servidoresCompativeis = filtrarServidoresPorFormatosCompativeis(
          servidores,
          formatos,
        );

        if (servidoresCompativeis.length === 0) {
          return {
            sucesso: false,
            mensagem:
              "Nenhum template compativel com o fabricante/formato do equipamento destino.",
            enviados: 0,
            rejeitados: servidores.length,
            detalhes: {
              formatosSuportados: Array.from(formatos),
            },
          };
        }

        const provider = criarRelogioPontoProvider(conexao);
        return provider.enviarBiometrias(servidoresCompativeis);
      },
    );

    resultados.push({
      equipamentoId: destino.id,
      codigo: destino.codigo,
      nome: destino.nome,
      sucesso: destinoResultado.sucesso,
      mensagem: destinoResultado.mensagem,
      enviados: destinoResultado.enviados,
      rejeitados: destinoResultado.rejeitados,
    });
  }

  await prisma.logIntegracao.create({
    data: {
      integracaoId: origem.integracaoId,
      tipo: "EQUIPAMENTO_BIOMETRICO",
      direcao: "SAIDA",
      status: resultados.every((resultado) => resultado.sucesso)
        ? "SUCESSO"
        : "ERRO",
      entidade: "EquipamentoBiometrico",
      entidadeId: origem.id,
      mensagem: `Sincronizacao de biometria: ${cadastrosComTemplate.length} cadastro(s) com template, ${destinos.length} destino(s).`,
      payloadEntrada: {
        equipamentoOrigemId: origem.id,
        orgaoId,
        quantidade: params.quantidade,
        indiceInicial: params.indiceInicial,
      } as never,
      payloadSaida: {
        leitura: leitura.payload,
        destinos: resultados,
      } as never,
      finalizadoEm: new Date(),
    },
  });

  return {
    origem: {
      equipamentoId: origem.id,
      codigo: origem.codigo,
      nome: origem.nome,
    },
    destinos: resultados,
    lidos: leitura.cadastros.length,
    comTemplate: cadastrosComTemplate.length,
    ignoradosSemTemplate: leitura.cadastros.length - cadastrosComTemplate.length,
  };
}
