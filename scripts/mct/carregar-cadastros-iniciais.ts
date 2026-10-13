import { createHash } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/database/prisma";

const VIGENCIA_INICIAL = new Date("2020-01-01T00:00:00.000Z");
const FUNDAMENTO =
  "Catálogo técnico inicial do MCT-SECP. Efeitos administrativos dependem de validação normativa, autorização e homologação.";

type RubricaInicial = {
  codigo: string;
  nome: string;
  descricao: string;
  dimensao:
    "TEMPORAL" | "JURIDICA_ADMINISTRATIVA" | "DESTINACAO" | "INCIDENCIA";
  natureza: string;
  grupoExclusividade?: string;
  prioridade: number;
  exigeAutorizacao?: boolean;
  exigeHomologacao?: boolean;
  efeitoBancoHoras?: "NENHUM" | "CREDITO" | "DEBITO" | "COMPENSACAO";
  elegivelFolha?: boolean;
};

const RUBRICAS: RubricaInicial[] = [
  {
    codigo: "TMP-TRABALHO",
    nome: "Trabalho",
    descricao:
      "Tempo efetivamente trabalhado apurado a partir das marcações válidas.",
    dimensao: "TEMPORAL",
    natureza: "TRABALHO",
    prioridade: 100,
  },
  {
    codigo: "TMP-INTERVALO",
    nome: "Intervalo",
    descricao: "Tempo classificado como intervalo intrajornada.",
    dimensao: "TEMPORAL",
    natureza: "INTERVALO",
    prioridade: 100,
  },
  {
    codigo: "TMP-PAUSA",
    nome: "Pausa",
    descricao: "Tempo classificado como pausa distinta do intervalo principal.",
    dimensao: "TEMPORAL",
    natureza: "PAUSA",
    prioridade: 90,
  },
  {
    codigo: "TMP-AUSENCIA",
    nome: "Ausência",
    descricao:
      "Diferença quantitativa entre a jornada exigível e o tempo computável.",
    dimensao: "TEMPORAL",
    natureza: "AUSENCIA",
    prioridade: 100,
  },
  {
    codigo: "TMP-PERMANENCIA",
    nome: "Permanência",
    descricao:
      "Tempo de permanência identificado no ambiente ou contexto de trabalho.",
    dimensao: "TEMPORAL",
    natureza: "PERMANENCIA",
    prioridade: 80,
  },
  {
    codigo: "TMP-SOBREJORNADA",
    nome: "Sobrejornada",
    descricao:
      "Tempo trabalhado acima da jornada exigível, ainda sem destinação automática.",
    dimensao: "TEMPORAL",
    natureza: "SOBREJORNADA",
    prioridade: 110,
  },
  {
    codigo: "JUR-REGULAR",
    nome: "Regular",
    descricao: "Tempo sem pendência de conformidade identificada pelo motor.",
    dimensao: "JURIDICA_ADMINISTRATIVA",
    natureza: "REGULAR",
    grupoExclusividade: "SITUACAO_JURIDICA",
    prioridade: 80,
  },
  {
    codigo: "JUR-JUSTIFICADO",
    nome: "Justificado",
    descricao: "Tempo associado a justificativa administrativa válida.",
    dimensao: "JURIDICA_ADMINISTRATIVA",
    natureza: "JUSTIFICADO",
    grupoExclusividade: "SITUACAO_JURIDICA",
    prioridade: 110,
    exigeHomologacao: true,
  },
  {
    codigo: "JUR-ABONADO",
    nome: "Abonado",
    descricao: "Tempo abonado por ato administrativo competente.",
    dimensao: "JURIDICA_ADMINISTRATIVA",
    natureza: "ABONADO",
    grupoExclusividade: "SITUACAO_JURIDICA",
    prioridade: 120,
    exigeHomologacao: true,
  },
  {
    codigo: "JUR-AUTORIZADO",
    nome: "Autorizado",
    descricao: "Tempo amparado por autorização administrativa específica.",
    dimensao: "JURIDICA_ADMINISTRATIVA",
    natureza: "AUTORIZADO",
    grupoExclusividade: "SITUACAO_JURIDICA",
    prioridade: 120,
    exigeAutorizacao: true,
  },
  {
    codigo: "JUR-PENDENTE",
    nome: "Pendente",
    descricao: "Tempo que depende de análise, autorização ou homologação.",
    dimensao: "JURIDICA_ADMINISTRATIVA",
    natureza: "PENDENTE",
    grupoExclusividade: "SITUACAO_JURIDICA",
    prioridade: 100,
    exigeHomologacao: true,
  },
  {
    codigo: "JUR-NAO-RECONHECIDO",
    nome: "Não reconhecido",
    descricao:
      "Tempo não reconhecido administrativamente após decisão competente.",
    dimensao: "JURIDICA_ADMINISTRATIVA",
    natureza: "NAO_RECONHECIDO",
    grupoExclusividade: "SITUACAO_JURIDICA",
    prioridade: 130,
    exigeHomologacao: true,
  },
  {
    codigo: "DST-BANCO-CREDITO",
    nome: "Crédito em banco de horas",
    descricao:
      "Destinação para crédito em banco de horas, condicionada a autorização e homologação.",
    dimensao: "DESTINACAO",
    natureza: "BANCO_HORAS",
    grupoExclusividade: "DESTINACAO_TEMPO",
    prioridade: 120,
    exigeAutorizacao: true,
    exigeHomologacao: true,
    efeitoBancoHoras: "CREDITO",
  },
  {
    codigo: "DST-BANCO-DEBITO",
    nome: "Débito em banco de horas",
    descricao:
      "Destinação para débito em banco de horas após apuração e homologação.",
    dimensao: "DESTINACAO",
    natureza: "BANCO_HORAS",
    grupoExclusividade: "DESTINACAO_TEMPO",
    prioridade: 110,
    exigeHomologacao: true,
    efeitoBancoHoras: "DEBITO",
  },
  {
    codigo: "DST-COMPENSACAO",
    nome: "Compensação",
    descricao: "Tempo destinado à compensação autorizada.",
    dimensao: "DESTINACAO",
    natureza: "COMPENSACAO",
    grupoExclusividade: "DESTINACAO_TEMPO",
    prioridade: 130,
    exigeAutorizacao: true,
    exigeHomologacao: true,
    efeitoBancoHoras: "COMPENSACAO",
  },
  {
    codigo: "DST-EXTRA-REMUNERAVEL",
    nome: "Serviço extraordinário remunerável",
    descricao:
      "Tempo candidato a pagamento, condicionado a autorização e homologação.",
    dimensao: "DESTINACAO",
    natureza: "FOLHA",
    grupoExclusividade: "DESTINACAO_TEMPO",
    prioridade: 140,
    exigeAutorizacao: true,
    exigeHomologacao: true,
    elegivelFolha: true,
  },
  {
    codigo: "DST-EXCEDENTE-PENDENTE",
    nome: "Excedente pendente",
    descricao: "Excedente sem destinação administrativa definitiva.",
    dimensao: "DESTINACAO",
    natureza: "PENDENTE",
    grupoExclusividade: "DESTINACAO_TEMPO",
    prioridade: 100,
    exigeHomologacao: true,
  },
  {
    codigo: "DST-SEM-CREDITO",
    nome: "Sem crédito",
    descricao: "Tempo expressamente classificado sem geração de crédito.",
    dimensao: "DESTINACAO",
    natureza: "SEM_CREDITO",
    grupoExclusividade: "DESTINACAO_TEMPO",
    prioridade: 150,
    exigeHomologacao: true,
  },
  {
    codigo: "INC-NOTURNO",
    nome: "Trabalho noturno",
    descricao:
      "Incidência temporal de trabalho em período noturno parametrizado.",
    dimensao: "INCIDENCIA",
    natureza: "NOTURNO",
    prioridade: 100,
  },
  {
    codigo: "INC-FERIADO",
    nome: "Feriado",
    descricao: "Incidência de calendário institucional em feriado.",
    dimensao: "INCIDENCIA",
    natureza: "FERIADO",
    prioridade: 100,
  },
  {
    codigo: "INC-PLANTAO",
    nome: "Plantão",
    descricao: "Incidência de jornada ou convocação em regime de plantão.",
    dimensao: "INCIDENCIA",
    natureza: "PLANTAO",
    prioridade: 100,
  },
  {
    codigo: "INC-RECESSO",
    nome: "Recesso",
    descricao: "Incidência de período de recesso forense.",
    dimensao: "INCIDENCIA",
    natureza: "RECESSO",
    prioridade: 100,
  },
  {
    codigo: "INC-REGIME-ESPECIAL",
    nome: "Regime especial",
    descricao: "Incidência de regime especial formalmente atribuído.",
    dimensao: "INCIDENCIA",
    natureza: "REGIME_ESPECIAL",
    prioridade: 100,
  },
];

type RegraInicial = {
  codigo: string;
  nome: string;
  prioridade: number;
  campo: string;
  operador: "EQ" | "GT";
  valor: number | boolean;
  rubrica: string;
  quantidade: string;
  escopo: string;
};

const REGRAS: RegraInicial[] = [
  {
    codigo: "CLASSIFICAR_TRABALHO",
    nome: "Classificar tempo trabalhado",
    prioridade: 100,
    campo: "minutosTrabalhados",
    operador: "GT",
    valor: 0,
    rubrica: "TMP-TRABALHO",
    quantidade: "minutosTrabalhados",
    escopo: "DIA",
  },
  {
    codigo: "CLASSIFICAR_AUSENCIA",
    nome: "Classificar falta quantitativa",
    prioridade: 110,
    campo: "tempoFaltanteMinutos",
    operador: "GT",
    valor: 0,
    rubrica: "TMP-AUSENCIA",
    quantidade: "tempoFaltanteMinutos",
    escopo: "DIA",
  },
  {
    codigo: "CLASSIFICAR_SOBREJORNADA",
    nome: "Classificar sobrejornada",
    prioridade: 120,
    campo: "excedenteBrutoMinutos",
    operador: "GT",
    valor: 0,
    rubrica: "TMP-SOBREJORNADA",
    quantidade: "excedenteBrutoMinutos",
    escopo: "DIA",
  },
  {
    codigo: "EXCEDENTE_PENDENTE",
    nome: "Manter excedente pendente",
    prioridade: 130,
    campo: "excedenteBrutoMinutos",
    operador: "GT",
    valor: 0,
    rubrica: "DST-EXCEDENTE-PENDENTE",
    quantidade: "excedenteBrutoMinutos",
    escopo: "DIA",
  },
  {
    codigo: "FALTA_PENDENTE",
    nome: "Manter falta pendente de homologação",
    prioridade: 120,
    campo: "tempoFaltanteMinutos",
    operador: "GT",
    valor: 0,
    rubrica: "JUR-PENDENTE",
    quantidade: "tempoFaltanteMinutos",
    escopo: "DIA",
  },
  {
    codigo: "INCIDENCIA_NOTURNA",
    nome: "Identificar incidência noturna",
    prioridade: 100,
    campo: "noturno",
    operador: "EQ",
    valor: true,
    rubrica: "INC-NOTURNO",
    quantidade: "minutosTrabalhados",
    escopo: "DIA",
  },
  {
    codigo: "INCIDENCIA_FERIADO",
    nome: "Identificar incidência em feriado",
    prioridade: 100,
    campo: "feriado",
    operador: "EQ",
    valor: true,
    rubrica: "INC-FERIADO",
    quantidade: "minutosTrabalhados",
    escopo: "DIA",
  },
  {
    codigo: "INCIDENCIA_PLANTAO",
    nome: "Identificar incidência de plantão",
    prioridade: 100,
    campo: "plantao",
    operador: "EQ",
    valor: true,
    rubrica: "INC-PLANTAO",
    quantidade: "minutosTrabalhados",
    escopo: "DIA",
  },
  {
    codigo: "INCIDENCIA_RECESSO",
    nome: "Identificar incidência de recesso",
    prioridade: 100,
    campo: "recesso",
    operador: "EQ",
    valor: true,
    rubrica: "INC-RECESSO",
    quantidade: "minutosTrabalhados",
    escopo: "DIA",
  },
  {
    codigo: "INCIDENCIA_REGIME_ESPECIAL",
    nome: "Identificar regime especial",
    prioridade: 100,
    campo: "regimeEspecial",
    operador: "EQ",
    valor: true,
    rubrica: "INC-REGIME-ESPECIAL",
    quantidade: "minutosTrabalhados",
    escopo: "DIA",
  },
];

function hash(valor: unknown) {
  return createHash("sha256").update(JSON.stringify(valor)).digest("hex");
}

function json(valor: unknown) {
  return JSON.parse(JSON.stringify(valor)) as Prisma.InputJsonValue;
}

async function carregarOrgao(orgao: { id: string; sigla: string }) {
  const configuracao = {
    cargaExigivelMinutos: 0,
    intervaloMinimoMinutos: 0,
    intervaloMaximoMinutos: 0,
    flexibilidadeEntradaMinutos: 0,
    flexibilidadeSaidaMinutos: 0,
    permiteCompensacaoNoDia: false,
    usaJornadaServidorComoFonte: true,
    reconhecimentoAutomaticoCredito: false,
    reconhecimentoAutomaticoDebito: false,
  };

  return prisma.$transaction(async (tx) => {
    await tx.mctPoliticaVersao.updateMany({
      where: {
        orgaoId: orgao.id,
        estado: "PUBLICADA",
        codigo: { not: "MCT_PADRAO_CONSERVADOR" },
      },
      data: { estado: "INATIVA" },
    });
    const politica = await tx.mctPoliticaVersao.upsert({
      where: {
        orgaoId_codigo_versao: {
          orgaoId: orgao.id,
          codigo: "MCT_PADRAO_CONSERVADOR",
          versao: 1,
        },
      },
      update: {
        nome: "Política MCT padrão conservadora",
        descricao:
          "Política técnica para operação SHADOW sem reconhecimento automático de efeitos administrativos.",
        estado: "PUBLICADA",
        vigenciaInicio: VIGENCIA_INICIAL,
        vigenciaFim: null,
        configuracao: json(configuracao),
        regras: json(REGRAS),
        fundamentoNormativo: FUNDAMENTO,
        hashConteudo: hash({ configuracao, regras: REGRAS }),
        origem: "SECP",
        publicadaEm: new Date(),
      },
      create: {
        orgaoId: orgao.id,
        codigo: "MCT_PADRAO_CONSERVADOR",
        nome: "Política MCT padrão conservadora",
        descricao:
          "Política técnica para operação SHADOW sem reconhecimento automático de efeitos administrativos.",
        versao: 1,
        estado: "PUBLICADA",
        vigenciaInicio: VIGENCIA_INICIAL,
        configuracao: json(configuracao),
        regras: json(REGRAS),
        fundamentoNormativo: FUNDAMENTO,
        hashConteudo: hash({ configuracao, regras: REGRAS }),
        origem: "SECP",
        publicadaEm: new Date(),
      },
    });

    const rubricas = new Map<string, string>();
    for (const natureza of new Set(RUBRICAS.map((item) => item.natureza))) {
      await tx.mctNaturezaRubrica.upsert({
        where: { orgaoId_codigo: { orgaoId: orgao.id, codigo: natureza } },
        update: { ativo: true },
        create: {
          orgaoId: orgao.id,
          codigo: natureza,
          nome: natureza
            .toLowerCase()
            .split("_")
            .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
            .join(" "),
          descricao: "Natureza do catálogo inicial de rubricas MCT.",
          origem: "SECP",
        },
      });
    }
    for (const item of RUBRICAS) {
      const definicao = {
        baseCalculo: "CONTEXTO_MCT",
        estrategiaCalculo: "CAMPO_CONTEXTO",
        compatibilidades: [],
        grupoExclusividade: item.grupoExclusividade ?? null,
        prioridade: item.prioridade,
        limites: null,
        exigeAutorizacao: item.exigeAutorizacao ?? false,
        exigeHomologacao: item.exigeHomologacao ?? false,
        efeitoBancoHoras: item.efeitoBancoHoras ?? "NENHUM",
        elegivelFolha: item.elegivelFolha ?? false,
      };
      const rubrica = await tx.mctRubricaVersao.upsert({
        where: {
          orgaoId_codigo_versao: {
            orgaoId: orgao.id,
            codigo: item.codigo,
            versao: 1,
          },
        },
        update: {
          nome: item.nome,
          descricao: item.descricao,
          dimensao: item.dimensao,
          natureza: item.natureza,
          unidade: "MINUTO",
          estado: "PUBLICADA",
          vigenciaInicio: VIGENCIA_INICIAL,
          vigenciaFim: null,
          definicao: json(definicao),
          fundamentoNormativo: FUNDAMENTO,
          hashConteudo: hash({ item, definicao }),
          origem: "SECP",
          publicadaEm: new Date(),
        },
        create: {
          orgaoId: orgao.id,
          codigo: item.codigo,
          nome: item.nome,
          descricao: item.descricao,
          dimensao: item.dimensao,
          natureza: item.natureza,
          unidade: "MINUTO",
          versao: 1,
          estado: "PUBLICADA",
          vigenciaInicio: VIGENCIA_INICIAL,
          definicao: json(definicao),
          fundamentoNormativo: FUNDAMENTO,
          hashConteudo: hash({ item, definicao }),
          origem: "SECP",
          publicadaEm: new Date(),
        },
      });
      rubricas.set(item.codigo, rubrica.id);
    }

    for (const item of REGRAS) {
      const condicao = {
        campo: item.campo,
        operador: item.operador,
        valor: item.valor,
      };
      const regra = await tx.mctRegraVersao.upsert({
        where: {
          orgaoId_codigo_versao: {
            orgaoId: orgao.id,
            codigo: item.codigo,
            versao: 1,
          },
        },
        update: {
          politicaVersaoId: politica.id,
          nome: item.nome,
          descricao: `Regra parametrizada para ${item.nome.toLowerCase()} no escopo diario.`,
          prioridade: item.prioridade,
          estado: "PUBLICADA",
          condicao: json(condicao),
          vigenciaInicio: VIGENCIA_INICIAL,
          vigenciaFim: null,
          fundamentoNormativo: FUNDAMENTO,
          hashConteudo: hash(item),
          origem: "SECP",
          publicadaEm: new Date(),
        },
        create: {
          orgaoId: orgao.id,
          politicaVersaoId: politica.id,
          codigo: item.codigo,
          nome: item.nome,
          descricao: `Regra parametrizada para ${item.nome.toLowerCase()} no escopo diario.`,
          versao: 1,
          prioridade: item.prioridade,
          estado: "PUBLICADA",
          condicao: json(condicao),
          vigenciaInicio: VIGENCIA_INICIAL,
          fundamentoNormativo: FUNDAMENTO,
          hashConteudo: hash(item),
          origem: "SECP",
          publicadaEm: new Date(),
        },
      });
      await tx.mctRegraEfeito.upsert({
        where: {
          regraVersaoId_rubricaVersaoId_escopoTemporal: {
            regraVersaoId: regra.id,
            rubricaVersaoId: rubricas.get(item.rubrica)!,
            escopoTemporal: item.escopo,
          },
        },
        update: {
          estrategia: "CAMPO",
          quantidadeMinutos: null,
          campoQuantidade: item.quantidade,
        },
        create: {
          regraVersaoId: regra.id,
          rubricaVersaoId: rubricas.get(item.rubrica)!,
          escopoTemporal: item.escopo,
          estrategia: "CAMPO",
          campoQuantidade: item.quantidade,
        },
      });
    }
    return {
      orgao: orgao.sigla,
      politica: politica.codigo,
      rubricas: RUBRICAS.length,
      regras: REGRAS.length,
    };
  });
}

async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    !process.argv.includes("--confirmar-producao")
  ) {
    throw new Error("Carga em produção exige --confirmar-producao.");
  }
  const orgaos = await prisma.orgao.findMany({
    where: { ativo: true },
    select: { id: true, sigla: true },
    orderBy: { sigla: "asc" },
  });
  const resultados = [];
  for (const orgao of orgaos) resultados.push(await carregarOrgao(orgao));
  process.stdout.write(
    `${JSON.stringify({ orgaos: resultados.length, resultados }, null, 2)}\n`,
  );
}

main()
  .catch((erro) => {
    process.stderr.write(
      `${erro instanceof Error ? erro.message : String(erro)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
