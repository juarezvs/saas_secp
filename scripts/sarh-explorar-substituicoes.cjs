#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { Client } = require("pg");
const oracledb = require("oracledb");

const DEFAULT_ORGAO_ID = "e5cec048-bf47-4ba7-a0c5-e105536c3986";

function compactar(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function likeTermos(alias = "") {
  const prefix = alias ? `${alias}.` : "";
  return [
    `${prefix}table_name like '%SUBST%'`,
    `${prefix}table_name like '%SUBS%'`,
    `${prefix}table_name like '%TITULAR%'`,
    `${prefix}table_name like '%INTERIN%'`,
    `${prefix}table_name like '%DESIGN%'`,
    `${prefix}table_name like '%FUNCAO%'`,
  ].join(" or ");
}

async function buscarConfiguracaoSarh() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL nao configurada no container.");
  }

  const pg = new Client({ connectionString: databaseUrl });
  await pg.connect();

  try {
    const orgaoId = process.env.SARH_EXPLORAR_ORGAO_ID || DEFAULT_ORGAO_ID;
    const result = await pg.query(
      `
        select id, orgao_id, nome, configuracao
        from integracoes_sistemas
        where tipo = 'SARH'
          and ativo = true
          and status <> 'INATIVA'
          and orgao_id = $1::uuid
        order by atualizado_em desc
        limit 1
      `,
      [orgaoId],
    );

    if (!result.rows.length) {
      throw new Error(`Integracao SARH nao encontrada para orgao ${orgaoId}.`);
    }

    return result.rows[0];
  } finally {
    await pg.end();
  }
}

async function main() {
  const integracao = await buscarConfiguracaoSarh();
  const config = integracao.configuracao ?? {};
  const oracleHome = config.oracleHome || process.env.SARH_ORACLE_HOME;

  if (oracleHome) {
    try {
      oracledb.initOracleClient({ libDir: oracleHome });
    } catch (error) {
      if (!String(error.message).includes("has already been initialized")) {
        throw error;
      }
    }
  }

  const connection = await oracledb.getConnection({
    user: config.username,
    password: config.password,
    connectString: config.connectString,
  });

  try {
    console.log(
      JSON.stringify({
        etapa: "configuracao",
        orgaoId: integracao.orgao_id,
        nome: integracao.nome,
        siglaLocalidade: config.siglaLocalidade,
        connectStringConfigurada: Boolean(config.connectString),
      }),
    );

    const options = { outFormat: oracledb.OUT_FORMAT_OBJECT };

    const tabelas = await connection.execute(
      `
        select owner, table_name, num_rows
        from all_tables
        where owner = 'SARH'
          and (${likeTermos()})
        order by table_name
        fetch first 120 rows only
      `,
      [],
      options,
    );

    console.log(JSON.stringify({ etapa: "tabelas_candidatas", rows: tabelas.rows }));

    const tabelasPrioritarias = [
      "RH_SUBSTITUICAO_AUTOMATICA",
      "RH_SUBSTITUTO_AUTOMATICO",
      "RH_SUBSTITUTO_FUNCAO",
      "RH_DESIGNACOES",
      "RH_TIPO_DESIGNACAO",
      "RH_MOTIVO_DESIGNACAO",
      "RH_FUNCAO_CONFIANCA",
      "RH_FUNCAO",
      "RH_IDENTIFICACAO_FUNCAO",
      "RH_HIST_FUNCAO_CONFIANCA",
      "RH_MOVIMENTACAO_FUNCIONAL",
      "RH_NIVEL_FUNCAO_CONFIANCA",
      "RH_PESO_FUNCAO",
    ];

    for (const tableName of tabelasPrioritarias) {
      const cols = await connection.execute(
        `
          select column_name, data_type, data_length, nullable
          from all_tab_columns
          where owner = 'SARH'
            and table_name = :tableName
          order by column_id
        `,
        { tableName },
        options,
      );
      console.log(
        JSON.stringify({
          etapa: "estrutura_prioritaria",
          tabela: tableName,
          colunas: (cols.rows ?? []).map((row) => ({
            nome: row.COLUMN_NAME,
            tipo: row.DATA_TYPE,
            tamanho: row.DATA_LENGTH,
            nulo: row.NULLABLE,
          })),
        }),
      );
    }

    for (const tableName of tabelasPrioritarias.slice(0, 6)) {
      const count = await connection.execute(
        `select count(*) as total from sarh.${tableName}`,
        [],
        options,
      );
      console.log(
        JSON.stringify({
          etapa: "contagem_prioritaria",
          tabela: tableName,
          total: count.rows?.[0]?.TOTAL,
        }),
      );
    }

    const colunas = await connection.execute(
      `
        select owner, table_name, column_name, data_type, data_length, nullable
        from all_tab_columns
        where owner = 'SARH'
          and (
            table_name like '%SUBST%'
            or table_name like '%SUBS%'
            or table_name like '%TITULAR%'
            or table_name like '%INTERIN%'
            or table_name like '%DESIGN%'
            or column_name like '%SUBST%'
            or column_name like '%SUBS%'
            or column_name like '%TITULAR%'
            or column_name like '%INTERIN%'
            or column_name like '%DESIGN%'
            or column_name like '%FUNC%'
            or column_name like '%VAL%'
          )
        order by table_name, column_id
        fetch first 120 rows only
      `,
      [],
      options,
    );

    console.log(JSON.stringify({ etapa: "colunas_candidatas", rows: colunas.rows }));

    const nomesTabelas = [
      ...new Set((tabelas.rows ?? []).map((row) => row.TABLE_NAME).filter(Boolean)),
    ].filter((nome) => !tabelasPrioritarias.includes(nome)).slice(0, 8);

    for (const tableName of nomesTabelas) {
      const cols = await connection.execute(
        `
          select column_name, data_type
          from all_tab_columns
          where owner = 'SARH'
            and table_name = :tableName
          order by column_id
        `,
        { tableName },
        options,
      );
      console.log(
        JSON.stringify({
          etapa: "estrutura_tabela",
          tabela: tableName,
          colunas: (cols.rows ?? []).map((row) => ({
            nome: row.COLUMN_NAME,
            tipo: row.DATA_TYPE,
          })),
        }),
      );
    }

    const exemplos = ["JUAREZ", "JOSE LUIS", "MARINHO"];
    for (const termo of exemplos) {
      const pessoas = await connection.execute(
        `
          select s.spes_matr_func as matricula,
                 s.no_servidor as nome,
                 s.nu_cpf as cpf
          from sarh.serv_pessoal s
          where upper(s.no_servidor) like '%' || :termo || '%'
          fetch first 10 rows only
        `,
        { termo },
        options,
      );
      console.log(
        JSON.stringify({
          etapa: "pessoas_exemplo",
          termo,
          rows: pessoas.rows?.map((row) => ({
            matricula: compactar(row.MATRICULA),
            nome: compactar(row.NOME),
            cpfInformado: Boolean(row.CPF),
          })),
        }),
      );
    }
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ etapa: "erro", mensagem: error.message }));
  process.exit(1);
});
