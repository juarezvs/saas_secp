import { prisma } from "@/shared/infrastructure/database/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { MarcacaoRelogioPonto } from "@/modules/integracoes/domain/relogio-ponto.types";
import { capturarTodasMarcacoesRelogioPontoService } from "@/modules/integracoes/application/services/relogios-ponto/relogio-ponto-operacoes.service";
import { processarMarcacaoBrutaService } from "@/modules/marcacoes-brutas/application/services/processar-marcacao-bruta.service";
import { resolverFusoHorarioServidorNoBanco } from "@/modules/servidores/application/services/fuso-horario-servidor.service";

type Args = {
  servidor?: string;
  inicio?: string;
  fim?: string;
  fuso?: string;
  nsrInicial?: string;
  quantidade?: number;
  lotes?: number;
  equipamento?: string[];
  executar?: boolean;
};

function uso() {
  return `
Uso:
  npm run coletar:marcacoes-servidor -- --servidor=<matricula|cpf|pis|id> --inicio=YYYY-MM-DD --fim=YYYY-MM-DD --executar

Opcoes:
  --fuso=America/Fortaleza        Sobrescreve o fuso do servidor.
  --nsr-inicial=1                 NSR inicial da leitura. Padrao: 1.
  --quantidade=500                Marcacoes por lote. Padrao: 500.
  --lotes=500                     Limite de lotes por relogio. Padrao: 500.
  --equipamento=CODIGO_OU_ID      Restringe a um relogio. Aceita repeticao ou lista separada por virgula.

Sem --executar, a rotina apenas mostra o servidor, periodo e relogios que seriam usados.
`;
}

function parseArgs(argv: string[]): Args {
  return argv.reduce<Args>((acc, item) => {
    if (item === "--executar") {
      acc.executar = true;
      return acc;
    }

    const match = item.match(/^--([^=]+)=(.*)$/);
    if (!match) {
      return acc;
    }

    const [, chave, valor] = match;

    if (chave === "quantidade" || chave === "lotes") {
      acc[chave] = Number(valor);
      return acc;
    }

    if (chave === "equipamento") {
      acc.equipamento ??= [];
      acc.equipamento.push(
        ...valor
          .split(",")
          .map((parte) => parte.trim())
          .filter(Boolean),
      );
      return acc;
    }

    if (
      chave === "servidor" ||
      chave === "inicio" ||
      chave === "fim" ||
      chave === "fuso" ||
      chave === "nsrInicial"
    ) {
      acc[chave] = valor;
    }

    return acc;
  }, {});
}

function somenteDigitos(valor: string | null | undefined) {
  return (valor ?? "").replace(/\D/g, "");
}

function normalizarPis(valor: string | null | undefined) {
  const digitos = somenteDigitos(valor);
  if (!digitos) return null;

  const normalizado =
    digitos.length <= 11 ? digitos.padStart(11, "0") : digitos;

  return normalizado.length >= 11 && normalizado.length <= 12
    ? normalizado
    : null;
}

function normalizarMatricula(valor: string | null | undefined) {
  return valor?.trim().toUpperCase() || null;
}

function pareceUuid(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

function validarFuso(fuso: string) {
  try {
    Intl.DateTimeFormat("pt-BR", { timeZone: fuso }).format(new Date());
    return fuso;
  } catch {
    throw new Error(`Fuso horario invalido: ${fuso}`);
  }
}

function partesNoFuso(data: Date, fuso: string) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(data);
  const mapa = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value]),
  );

  return {
    year: Number(mapa.year),
    month: Number(mapa.month),
    day: Number(mapa.day),
    hour: Number(mapa.hour === "24" ? "0" : mapa.hour),
    minute: Number(mapa.minute),
    second: Number(mapa.second),
  };
}

function dataLocalParaUtc(params: {
  data: string;
  fimDoDia: boolean;
  fuso: string;
}) {
  if (params.data.includes("T")) {
    const data = new Date(params.data);
    if (Number.isNaN(data.getTime())) {
      throw new Error(`Data invalida: ${params.data}`);
    }
    return data;
  }

  const match = params.data.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Data invalida: ${params.data}. Use YYYY-MM-DD.`);
  }

  const [, ano, mes, dia] = match;
  const hora = params.fimDoDia ? 23 : 0;
  const minuto = params.fimDoDia ? 59 : 0;
  const segundo = params.fimDoDia ? 59 : 0;
  const milissegundo = params.fimDoDia ? 999 : 0;
  const tentativaUtc = new Date(
    Date.UTC(
      Number(ano),
      Number(mes) - 1,
      Number(dia),
      hora,
      minuto,
      segundo,
      milissegundo,
    ),
  );
  const local = partesNoFuso(tentativaUtc, params.fuso);
  const localComoUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
    milissegundo,
  );
  const alvoComoUtc = Date.UTC(
    Number(ano),
    Number(mes) - 1,
    Number(dia),
    hora,
    minuto,
    segundo,
    milissegundo,
  );
  const offset = localComoUtc - tentativaUtc.getTime();

  return new Date(alvoComoUtc - offset);
}

async function buscarServidor(busca: string) {
  const texto = busca.trim();
  const digitos = somenteDigitos(texto);
  const pis = normalizarPis(texto);

  return prisma.servidor.findFirst({
    where: {
      ativo: true,
      OR: [
        pareceUuid(texto) ? { id: texto } : undefined,
        digitos ? { cpf: digitos.padStart(11, "0").slice(-11) } : undefined,
        pis ? { pis } : undefined,
        texto
          ? { matricula: { equals: texto, mode: "insensitive" } }
          : undefined,
        digitos
          ? { usuario: { cpf: digitos.padStart(11, "0").slice(-11) } }
          : undefined,
        texto
          ? { usuario: { matricula: { equals: texto, mode: "insensitive" } } }
          : undefined,
      ].filter(Boolean) as Prisma.ServidorWhereInput[],
    },
    include: {
      orgao: true,
      usuario: {
        select: {
          cpf: true,
          matricula: true,
        },
      },
      lotacoes: {
        where: {
          status: "ATIVO",
          dataInicio: { lte: new Date() },
          OR: [{ dataFim: null }, { dataFim: { gte: new Date() } }],
        },
        include: {
          unidade: {
            include: {
              orgao: true,
            },
          },
        },
        orderBy: {
          dataInicio: "desc",
        },
        take: 1,
      },
    },
  });
}

function identificadoresServidor(
  servidor: NonNullable<Awaited<ReturnType<typeof buscarServidor>>>,
) {
  return {
    cpfs: new Set(
      [servidor.cpf, servidor.usuario?.cpf]
        .map((valor) => {
          const digitos = somenteDigitos(valor);
          return digitos ? digitos.padStart(11, "0").slice(-11) : null;
        })
        .filter((item): item is string => Boolean(item)),
    ),
    pises: new Set(
      [servidor.pis]
        .map((valor) => normalizarPis(valor))
        .filter((item): item is string => Boolean(item)),
    ),
    matriculas: new Set(
      [servidor.matricula, servidor.usuario?.matricula]
        .map(normalizarMatricula)
        .filter((item): item is string => Boolean(item)),
    ),
  };
}

function criarFiltroMarcacao(params: {
  inicioUtc: Date;
  fimUtc: Date;
  ids: ReturnType<typeof identificadoresServidor>;
}) {
  return (marcacao: MarcacaoRelogioPonto) => {
    if (
      marcacao.dataHora < params.inicioUtc ||
      marcacao.dataHora > params.fimUtc
    ) {
      return false;
    }

    const cpf = somenteDigitos(marcacao.cpf);
    const pis = normalizarPis(marcacao.pis);
    const matricula = normalizarMatricula(marcacao.matricula);

    return Boolean(
      (cpf && params.ids.cpfs.has(cpf.padStart(11, "0").slice(-11))) ||
      (pis && params.ids.pises.has(pis)) ||
      (matricula && params.ids.matriculas.has(matricula)),
    );
  };
}

async function listarEquipamentos(params: {
  orgaoId: string;
  filtro?: string[];
}) {
  const filtro =
    params.filtro?.map((item) => item.trim()).filter(Boolean) ?? [];
  const ids = filtro.filter(pareceUuid);
  const escopoSeccional: Prisma.EquipamentoBiometricoWhereInput = {
    OR: [{ orgaoId: params.orgaoId }, { unidade: { orgaoId: params.orgaoId } }],
  };
  const escopoFiltro: Prisma.EquipamentoBiometricoWhereInput | null =
    filtro.length > 0
      ? {
          OR: [
            ...(ids.length > 0 ? [{ id: { in: ids } }] : []),
            { codigo: { in: filtro } },
            { nome: { in: filtro } },
          ],
        }
      : null;

  return prisma.equipamentoBiometrico.findMany({
    where: {
      ativo: true,
      ip: { not: null },
      AND: escopoFiltro ? [escopoSeccional, escopoFiltro] : [escopoSeccional],
    },
    include: {
      orgao: true,
      unidade: {
        include: {
          orgao: true,
        },
      },
    },
    orderBy: {
      codigo: "asc",
    },
  });
}

async function reprocessarPendentes(params: {
  servidorId: string;
  equipamentoId: string;
  inicioUtc: Date;
  fimUtc: Date;
  ids: ReturnType<typeof identificadoresServidor>;
}) {
  const pisesParaConsulta = new Set(
    Array.from(params.ids.pises).flatMap((pis) => [
      pis,
      pis.replace(/^0+/, "") || "0",
    ]),
  );
  const pendentes = await prisma.marcacaoBruta.findMany({
    where: {
      equipamentoId: params.equipamentoId,
      origem: "EQUIPAMENTO_BIOMETRICO",
      processada: false,
      dataHora: {
        gte: params.inicioUtc,
        lte: params.fimUtc,
      },
      OR: [
        { servidorId: params.servidorId },
        ...Array.from(params.ids.cpfs).map((cpf) => ({ cpf })),
        ...Array.from(pisesParaConsulta).map((pis) => ({ pis })),
        ...Array.from(params.ids.matriculas).map((matricula) => ({
          matricula: { equals: matricula, mode: "insensitive" as const },
        })),
      ],
    },
    select: {
      id: true,
    },
    orderBy: {
      dataHora: "asc",
    },
    take: 50000,
  });
  let processadas = 0;
  let pendentesRestantes = 0;
  let erros = 0;

  for (const pendente of pendentes) {
    try {
      const resultado = await processarMarcacaoBrutaService({
        marcacaoBrutaId: pendente.id,
        recalcularImpactos: true,
      });

      if (resultado.sucesso) {
        processadas += 1;
      } else {
        pendentesRestantes += 1;
      }
    } catch {
      erros += 1;
    }
  }

  return {
    analisadas: pendentes.length,
    processadas,
    pendentesRestantes,
    erros,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.servidor || !args.inicio || !args.fim) {
    throw new Error(uso());
  }

  const servidor = await buscarServidor(args.servidor);

  if (!servidor) {
    throw new Error("Servidor ativo nao encontrado para a busca informada.");
  }

  const lotacaoAtual = servidor.lotacoes[0] ?? null;
  const orgaoId = lotacaoAtual?.unidade.orgaoId ?? servidor.orgaoId;
  const orgaoSigla =
    lotacaoAtual?.unidade.orgao?.sigla ?? servidor.orgao.sigla ?? "sem-sigla";
  const fuso = validarFuso(
    args.fuso ??
      (await resolverFusoHorarioServidorNoBanco({ servidorId: servidor.id })),
  );
  const inicioUtc = dataLocalParaUtc({
    data: args.inicio,
    fimDoDia: false,
    fuso,
  });
  const fimUtc = dataLocalParaUtc({
    data: args.fim,
    fimDoDia: true,
    fuso,
  });

  if (fimUtc < inicioUtc) {
    throw new Error("A data final deve ser maior ou igual a data inicial.");
  }

  const equipamentos = await listarEquipamentos({
    orgaoId,
    filtro: args.equipamento,
  });
  const ids = identificadoresServidor(servidor);
  const resumoBase = {
    servidor: {
      id: servidor.id,
      matricula: servidor.matricula,
      nome: servidor.nomeFuncional ?? servidor.nomeCompletoSarh,
      cpf: servidor.cpf,
      pis: servidor.pis,
    },
    seccional: {
      orgaoId,
      sigla: orgaoSigla,
    },
    periodo: {
      inicioInformado: args.inicio,
      fimInformado: args.fim,
      fuso,
      inicioUtc: inicioUtc.toISOString(),
      fimUtc: fimUtc.toISOString(),
    },
    parametros: {
      nsrInicial: args.nsrInicial ?? "1",
      quantidadePorLote: args.quantidade ?? 500,
      limiteLotes: args.lotes ?? 500,
      executar: Boolean(args.executar),
    },
    relogios: equipamentos.map((equipamento) => ({
      id: equipamento.id,
      codigo: equipamento.codigo,
      nome: equipamento.nome,
      fabricante: equipamento.fabricante,
      ip: equipamento.ip,
    })),
  };

  console.log(JSON.stringify(resumoBase, null, 2));

  if (!args.executar) {
    console.log(
      "Simulacao concluida. Informe --executar para coletar e reprocessar.",
    );
    return;
  }

  if (equipamentos.length === 0) {
    throw new Error(
      "Nenhum relogio ativo com IP foi encontrado para a seccional.",
    );
  }

  const filtroMarcacao = criarFiltroMarcacao({ inicioUtc, fimUtc, ids });
  const resultados = [];

  for (const equipamento of equipamentos) {
    console.log(`Coletando ${equipamento.codigo} (${equipamento.ip})...`);

    try {
      const coleta = await capturarTodasMarcacoesRelogioPontoService({
        equipamentoId: equipamento.id,
        nsrInicial: args.nsrInicial ?? 1,
        quantidadePorLote: args.quantidade ?? 500,
        limiteLotes: args.lotes ?? 500,
        atualizarCursor: false,
        reprocessarAoFinal: false,
        filtroMarcacao,
      });
      const reprocessamento = await reprocessarPendentes({
        servidorId: servidor.id,
        equipamentoId: equipamento.id,
        inicioUtc,
        fimUtc,
        ids,
      });

      resultados.push({
        equipamento: equipamento.codigo,
        sucesso: true,
        coleta,
        reprocessamento,
      });
    } catch (error) {
      resultados.push({
        equipamento: equipamento.codigo,
        sucesso: false,
        erro: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(JSON.stringify({ resultados }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
