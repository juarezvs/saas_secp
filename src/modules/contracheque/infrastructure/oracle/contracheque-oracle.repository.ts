import type { Connection } from "oracledb";
import { obterConfiguracaoSarhOracle } from "@/modules/integracoes/sarh/application/services/sarh-oracle-config.service";
import type {
  ContrachequeCompetencia,
  ContrachequeDados,
  ContrachequeDocumento,
  ContrachequeRubrica,
} from "../../domain/contracheque.types";
import {
  competenciaParaDataFolha,
  lerIdDocumentoContracheque,
  montarIdDocumentoContracheque,
  normalizarCompetenciaContracheque,
} from "../../application/services/formatar-contracheque.service";

type OracleDbModule = typeof import("oracledb");
type OracleDbImport = OracleDbModule & {
  default?: OracleDbModule;
};
type OracleRow = Record<string, unknown>;

let oracleClientInicializado = false;

async function carregarOracleDb(oracleHome?: string) {
  const imported = (await import("oracledb")) as OracleDbImport;
  const oracledb = imported.default ?? imported;

  if (!oracleClientInicializado && oracleHome) {
    oracledb.initOracleClient({ libDir: oracleHome });
    oracleClientInicializado = true;
  }

  return oracledb;
}

function toStringOrNull(valor: unknown) {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();

  return texto ? texto : null;
}

function toNumber(valor: unknown) {
  const numero = Number(valor ?? 0);

  return Number.isFinite(numero) ? numero : 0;
}

function toNumberOrNull(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : null;
}

function toDateOrNull(valor: unknown) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  const data = new Date(String(valor));

  return Number.isNaN(data.getTime()) ? null : data;
}

function codigoTotalizador(descricao: string) {
  const normalizada = descricao
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "")
    .toUpperCase();

  if (normalizada === "BRUTO") return "bruto";
  if (normalizada === "DESCONTO") return "descontos";
  if (normalizada === "LIQUIDO") return "liquido";

  return null;
}

function calcularTotais(rubricas: ContrachequeRubrica[]) {
  const totais = {
    bruto: 0,
    descontos: 0,
    liquido: 0,
  };

  for (const rubrica of rubricas) {
    const totalizador = codigoTotalizador(rubrica.descricao);

    if (totalizador) {
      totais[totalizador] = rubrica.valor;
    }
  }

  if (!totais.bruto) {
    totais.bruto = rubricas
      .filter((rubrica) => rubrica.tipo === "R")
      .reduce((total, rubrica) => total + rubrica.valor, 0);
  }

  if (!totais.descontos) {
    totais.descontos = rubricas
      .filter((rubrica) => rubrica.tipo === "D")
      .reduce((total, rubrica) => total + rubrica.valor, 0);
  }

  if (!totais.liquido) {
    totais.liquido = totais.bruto - totais.descontos;
  }

  return totais;
}

async function conectar(orgaoId: string | null | undefined) {
  const config = await obterConfiguracaoSarhOracle(orgaoId);

  if (!config.username || !config.password || !config.connectString) {
    throw new Error("Configuração Oracle do SARH não encontrada para o órgão.");
  }

  const oracledb = await carregarOracleDb(config.oracleHome);
  const connection = await oracledb.getConnection({
    user: config.username,
    password: config.password,
    connectString: config.connectString,
  });

  return { connection, oracledb };
}

async function executar<T extends OracleRow>(
  connection: Connection,
  sql: string,
  binds: Record<string, string | number>,
) {
  const oracledb = await carregarOracleDb();
  const resultado = await connection.execute<T>(sql, binds, {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
  });

  return resultado.rows ?? [];
}

export async function listarCompetenciasContrachequeSarh(params: {
  matricula: string;
  orgaoId?: string | null;
}): Promise<ContrachequeCompetencia[]> {
  const { connection } = await conectar(params.orgaoId);

  try {
    const rows = await executar<OracleRow>(
      connection,
      `
      select trunc(c.chave_folha, 'MM') as "chaveFolha",
             max(c.descricao) keep (dense_rank first order by c.chave_folha desc) as "descricao"
      from spddba01.sfpt_contracheque c
      where upper(c.codiserv) = upper(:matricula)
      group by trunc(c.chave_folha, 'MM')
      order by trunc(c.chave_folha, 'MM') desc
      fetch first 36 rows only
      `,
      { matricula: params.matricula },
    );

    return rows
      .map((row) => {
        const data = toDateOrNull(row.chaveFolha);

        if (!data) return null;

        return {
          competencia: `${data.getUTCFullYear()}-${String(
            data.getUTCMonth() + 1,
          ).padStart(2, "0")}`,
          data,
          descricao: toStringOrNull(row.descricao) ?? "",
        };
      })
      .filter((item): item is ContrachequeCompetencia => Boolean(item));
  } finally {
    await connection.close();
  }
}

export async function listarDocumentosContrachequeSarh(params: {
  matricula: string;
  competencia: string;
  orgaoId?: string | null;
}): Promise<ContrachequeDocumento[]> {
  const competencia = normalizarCompetenciaContracheque(params.competencia);
  const { connection } = await conectar(params.orgaoId);

  try {
    const rows = await executar<OracleRow>(
      connection,
      `
      select c.chave_folha as "chaveFolha",
             c.sequdepe as "sequdepe",
             c.sequpa as "sequpa",
             c.descricao as "descricao"
      from spddba01.sfpt_contracheque c
      where upper(c.codiserv) = upper(:matricula)
        and c.chave_folha >= to_date(:competencia, 'YYYY-MM')
        and c.chave_folha < add_months(to_date(:competencia, 'YYYY-MM'), 1)
      order by c.chave_folha, c.sequdepe, c.sequpa
      `,
      { matricula: params.matricula, competencia },
    );

    return rows
      .map((row) => {
        const chaveFolha = toDateOrNull(row.chaveFolha);

        if (!chaveFolha) return null;

        const sequdepe = toNumber(row.sequdepe);
        const sequpa = toNumber(row.sequpa);

        return {
          id: montarIdDocumentoContracheque(chaveFolha, sequdepe, sequpa),
          competencia,
          chaveFolha,
          sequdepe,
          sequpa,
          descricao: toStringOrNull(row.descricao) ?? "",
        };
      })
      .filter((item): item is ContrachequeDocumento => Boolean(item));
  } finally {
    await connection.close();
  }
}

export async function buscarContrachequeSarh(params: {
  matricula: string;
  competencia: string;
  documentoId?: string | null;
  orgaoId?: string | null;
}): Promise<ContrachequeDados | null> {
  const competencia = normalizarCompetenciaContracheque(params.competencia);
  const chaveFolha = competenciaParaDataFolha(competencia);
  const documento = lerIdDocumentoContracheque(params.documentoId);
  const { connection } = await conectar(params.orgaoId);
  const filtroDocumentoCabecalho = documento
    ? `and c.chave_folha = to_date(:documentoData, 'YYYY-MM-DD')
        and c.sequdepe = :sequdepe
        and c.sequpa = :sequpa`
    : `and c.chave_folha >= to_date(:competencia, 'YYYY-MM')
        and c.chave_folha < add_months(to_date(:competencia, 'YYYY-MM'), 1)`;
  const bindsDocumento: Record<string, string | number> = documento
    ? {
        documentoData: documento.data,
        sequdepe: documento.sequdepe,
        sequpa: documento.sequpa,
      }
    : {};
  const bindsCabecalho: Record<string, string | number> = {
    matricula: params.matricula,
    ...(documento ? bindsDocumento : { competencia }),
  };

  try {
    const [cabecalho] = await executar<OracleRow>(
      connection,
      `
      select c.chave_folha as "chaveFolha",
             c.descricao as "descricao",
             c.codiserv as "codiserv",
             c.nomeserv as "nome",
             c.sequdepe as "sequdepe",
             c.sequpa as "sequpa",
             c.cpf as "cpf",
             c.cargo as "cargo",
             c.funcao as "funcao",
             c.lotacao as "lotacao",
             c.orgao as "orgao",
             c.exercicio as "exercicio",
             c.referencia as "referencia",
             c.anuenio as "anuenio",
             c.sf as "dependentesSalarioFamilia",
             c.ir as "dependentesIr",
             c.banco as "banco",
             c.agencia as "agencia",
             c.conta as "conta",
             c.tipo_servidor as "tipoServidor"
      from spddba01.sfpt_contracheque c
      where upper(c.codiserv) = upper(:matricula)
        ${filtroDocumentoCabecalho}
      order by c.chave_folha, c.sequdepe, c.sequpa
      fetch first 1 rows only
      `,
      bindsCabecalho,
    );

    if (!cabecalho) {
      return null;
    }

    const chaveFolhaSelecionada =
      toDateOrNull(cabecalho.chaveFolha) ?? chaveFolha;
    const documentoSelecionado = {
      id: montarIdDocumentoContracheque(
        chaveFolhaSelecionada,
        toNumber(cabecalho.sequdepe),
        toNumber(cabecalho.sequpa),
      ),
      competencia,
      chaveFolha: chaveFolhaSelecionada,
      sequdepe: toNumber(cabecalho.sequdepe),
      sequpa: toNumber(cabecalho.sequpa),
      descricao: toStringOrNull(cabecalho.descricao) ?? "",
    };

    const rubricasRows = await executar<OracleRow>(
      connection,
      `
      select r.cod_rubrica as "codigo",
             r.sequencial as "sequencial",
             r.tip_rubrica as "tipo",
             r.des_rubrica as "descricao",
             r.prazo as "prazo",
             r.valor_rubrica as "valor"
      from spddba01.sfpv_rubricas_contracheque r
      where upper(r.codiserv) = upper(:matricula)
        and r.chave_folha = to_date(:documentoData, 'YYYY-MM-DD')
        and r.sequdepe = :sequdepe
        and r.sequpa = :sequpa
        and r.tip_rubrica in ('R', 'D')
      order by r.ordem, r.tip_rubrica, r.cod_rubrica, r.sequencial
      `,
      {
        matricula: params.matricula,
        documentoData: documentoSelecionado.id.slice(0, 10),
        sequdepe: documentoSelecionado.sequdepe,
        sequpa: documentoSelecionado.sequpa,
      },
    );
    const margemRows = await executar<OracleRow>(
      connection,
      `
      select m.margem_consignavel as "margemConsignavel"
      from spddba01.sfpt_margem_consignavel m
      where upper(m.codiserv) = upper(:matricula)
        and m.chave_folha = to_date(:documentoData, 'YYYY-MM-DD')
      fetch first 1 rows only
      `,
      {
        matricula: params.matricula,
        documentoData: documentoSelecionado.id.slice(0, 10),
      },
    );
    const rubricas = rubricasRows
      .map((row): ContrachequeRubrica => ({
        codigo: toNumber(row.codigo),
        sequencial: toNumber(row.sequencial),
        tipo: toStringOrNull(row.tipo) ?? "",
        descricao: toStringOrNull(row.descricao) ?? "",
        prazo: toStringOrNull(row.prazo),
        valor: toNumber(row.valor),
        anoReferencia: null,
        mesReferencia: null,
      }))
      .filter(
        (rubrica) =>
          rubrica.codigo !== 0 ||
          rubrica.descricao.trim() ||
          rubrica.valor !== 0,
      );

    return {
      competencia,
      documento: documentoSelecionado,
      fonte: "SARH",
      consultadoEm: new Date(),
      cabecalho: {
        chaveFolha: chaveFolhaSelecionada,
        descricao: toStringOrNull(cabecalho.descricao) ?? "",
        codiserv: toStringOrNull(cabecalho.codiserv) ?? params.matricula,
        nome: toStringOrNull(cabecalho.nome) ?? "",
        cpf: toStringOrNull(cabecalho.cpf),
        cargo: toStringOrNull(cabecalho.cargo),
        funcao: toStringOrNull(cabecalho.funcao),
        lotacao: toStringOrNull(cabecalho.lotacao),
        orgao: toStringOrNull(cabecalho.orgao),
        exercicio: toDateOrNull(cabecalho.exercicio),
        referencia: toStringOrNull(cabecalho.referencia),
        anuenio: toNumberOrNull(cabecalho.anuenio),
        dependentesSalarioFamilia: toNumberOrNull(
          cabecalho.dependentesSalarioFamilia,
        ),
        dependentesIr: toNumberOrNull(cabecalho.dependentesIr),
        banco: toNumberOrNull(cabecalho.banco),
        agencia: toStringOrNull(cabecalho.agencia),
        conta: toStringOrNull(cabecalho.conta),
        tipoServidor: toStringOrNull(cabecalho.tipoServidor),
      },
      margemConsignavel: toNumberOrNull(margemRows[0]?.margemConsignavel),
      rubricas,
      totais: calcularTotais(rubricas),
    };
  } finally {
    await connection.close();
  }
}
