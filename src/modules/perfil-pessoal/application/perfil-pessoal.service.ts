import { obterConfiguracaoSarhOracle } from "@/modules/integracoes/sarh/application/services/sarh-oracle-config.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import type { PerfilPessoalInput } from "./perfil-pessoal.schema";

type OracleRow = Record<string, unknown>;

const TIPOS_DOMINIO = [
  "RACA",
  "COR_CABELO",
  "COR_OLHOS",
  "TIPO_SANGUINEO",
  "IDENTIDADE_GENERO",
] as const;

let oracleInicializado = false;

async function abrirConexaoSarh(orgaoId: string) {
  const config = await obterConfiguracaoSarhOracle(orgaoId);
  if (!config.ativo || !config.username || !config.password || !config.connectString) {
    throw new Error("A integração SARH da seccional não está configurada.");
  }

  const imported = await import("oracledb");
  const oracledb = imported.default ?? imported;
  if (config.oracleHome && !oracleInicializado) {
    try {
      oracledb.initOracleClient({ libDir: config.oracleHome });
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("NJS-077")) throw error;
    }
    oracleInicializado = true;
  }

  return oracledb.getConnection({
    user: config.username,
    password: config.password,
    connectString: config.connectString,
  });
}

function texto(valor: unknown) {
  return valor === null || valor === undefined ? "" : String(valor).trim();
}

function numeroTexto(valor: unknown) {
  return texto(valor).replace(/\D/g, "");
}

async function contextoServidor(matricula: string) {
  const servidor = await prisma.servidor.findUnique({
    where: { matricula },
    select: { id: true, orgaoId: true },
  });
  if (!servidor) throw new Error("Servidor não encontrado no SECP.");
  return servidor;
}

export async function listarDominiosPerfilPessoal(apenasAtivos = true) {
  const itens = await prisma.dominioCaracteristicaPessoal.findMany({
    where: apenasAtivos ? { ativo: true } : undefined,
    orderBy: [{ tipo: "asc" }, { ordem: "asc" }, { nome: "asc" }],
  });

  return Object.fromEntries(
    TIPOS_DOMINIO.map((tipo) => [
      tipo,
      itens.filter((item) => item.tipo === tipo).map((item) => ({
        codigo: item.codigoSarh,
        nome: item.nome,
      })),
    ]),
  );
}

export async function obterPerfilPessoalSarh(matricula: string) {
  const servidor = await contextoServidor(matricula);
  const connection = await abrirConexaoSarh(servidor.orgaoId);
  try {
    const dados = await connection.execute<OracleRow>(
        `SELECT dc.DACO_CEP, dc.DACO_ENDERECO, dc.DACO_BAIRRO, dc.DACO_CIDADE,
                dc.DACO_NUMERO, dc.DACO_COMPLEMENTO, dc.DACO_EMAIL,
                p.PESS_ALTURA, p.PESS_CUTIS, p.PESS_COR_CABELO, p.PESS_COR_OLHOS,
                p.PESS_TIPO_SANGUINEO, p.PESS_IDENTIDADE_GENERO, p.PESS_UF_ENDERECO,
                p.PESS_TELEFONE_1, p.PESS_TELEFONE_2, p.PESS_TEL_CELULAR
           FROM SARH.RH_FUNCIONARIO f
           JOIN SARH.RH_PESSOAL p ON p.PESS_C_P_F = f.FUNC_PESS_C_P_F
           JOIN SARH.RH_DADOS_CONTATO dc ON dc.DACO_CPF = f.FUNC_PESS_C_P_F
          WHERE UPPER(f.FUNC_MATRICULA_FOLHA) = :matricula`,
        { matricula: matricula.toUpperCase() },
        { outFormat: (await import("oracledb")).OUT_FORMAT_OBJECT, maxRows: 1 },
      );
    const telefones = await connection.execute<OracleRow>(
        `SELECT dt.DATE_TEL_TELEFONE
           FROM SARH.RH_DADOS_TELEFONE dt
           JOIN SARH.RH_FUNCIONARIO f ON f.FUNC_PESS_C_P_F = dt.DATE_TEL_CPF
          WHERE UPPER(f.FUNC_MATRICULA_FOLHA) = :matricula
          ORDER BY dt.DATE_TEL_TELEFONE`,
        { matricula: matricula.toUpperCase() },
        { outFormat: (await import("oracledb")).OUT_FORMAT_OBJECT, maxRows: 4 },
      );
    const dominios = await listarDominiosPerfilPessoal();
    const row = dados.rows?.[0];
    if (!row) throw new Error("Dados pessoais não encontrados no SARH.");

    const listaTelefones = (telefones.rows ?? [])
      .map((item) => numeroTexto(item.DATE_TEL_TELEFONE))
      .filter(Boolean);
    const fallbackTelefones = [row.PESS_TELEFONE_1, row.PESS_TELEFONE_2, row.PESS_TEL_CELULAR]
      .map(numeroTexto)
      .filter((item) => item && item !== "0");

    return {
      cep: numeroTexto(row.DACO_CEP).padStart(8, "0"),
      endereco: texto(row.DACO_ENDERECO),
      bairro: texto(row.DACO_BAIRRO),
      cidade: texto(row.DACO_CIDADE),
      uf: texto(row.PESS_UF_ENDERECO),
      numeroResidencia: texto(row.DACO_NUMERO),
      complemento: texto(row.DACO_COMPLEMENTO),
      email: texto(row.DACO_EMAIL).toLowerCase(),
      telefones: listaTelefones.length ? listaTelefones : fallbackTelefones,
      altura: texto(row.PESS_ALTURA).replace(".", ","),
      raca: texto(row.PESS_CUTIS),
      corCabelo: texto(row.PESS_COR_CABELO),
      corOlhos: texto(row.PESS_COR_OLHOS),
      tipoSanguineo: texto(row.PESS_TIPO_SANGUINEO),
      identidadeGenero: texto(row.PESS_IDENTIDADE_GENERO),
      dominios,
    };
  } finally {
    await connection.close();
  }
}

async function validarDominios(dados: PerfilPessoalInput) {
  const pares = [
    ["RACA", dados.raca],
    ["COR_CABELO", dados.corCabelo],
    ["COR_OLHOS", dados.corOlhos],
    ["TIPO_SANGUINEO", dados.tipoSanguineo],
    ["IDENTIDADE_GENERO", dados.identidadeGenero],
  ];
  const total = await prisma.dominioCaracteristicaPessoal.count({
    where: {
      ativo: true,
      OR: pares.map(([tipo, codigoSarh]) => ({ tipo, codigoSarh })),
    },
  });
  if (total !== pares.length) throw new Error("Uma característica selecionada não está ativa.");
}

export async function atualizarPerfilPessoalSarh(params: {
  matricula: string;
  usuarioId: string;
  dados: PerfilPessoalInput;
}) {
  const servidor = await contextoServidor(params.matricula);
  await validarDominios(params.dados);
  const config = await prisma.configuracaoGlobal.upsert({
    where: { id: "global" },
    create: { id: "global", dominiosEmailInstitucionais: ["trf1.jus.br"] },
    update: {},
  });
  const dominioEmail = params.dados.email.toLowerCase().split("@").pop() ?? "";
  if (!config.dominiosEmailInstitucionais.map((item) => item.toLowerCase()).includes(dominioEmail)) {
    throw new Error("Use um e-mail de um domínio institucional autorizado.");
  }

  const connection = await abrirConexaoSarh(servidor.orgaoId);
  const d = params.dados;
  const cpfResult = await connection.execute<OracleRow>(
    `SELECT FUNC_PESS_C_P_F AS CPF FROM SARH.RH_FUNCIONARIO
      WHERE UPPER(FUNC_MATRICULA_FOLHA) = :matricula`,
    { matricula: params.matricula.toUpperCase() },
    { outFormat: (await import("oracledb")).OUT_FORMAT_OBJECT, maxRows: 1 },
  );
  const cpf = cpfResult.rows?.[0]?.CPF;
  if (!cpf) {
    await connection.close();
    throw new Error("Vínculo da matrícula não encontrado no SARH.");
  }

  try {
    const contato = await connection.execute(
      `UPDATE SARH.RH_DADOS_CONTATO
          SET DACO_CEP = :cep, DACO_NUMERO = :numero, DACO_COMPLEMENTO = :complemento,
              DACO_ENDERECO = :endereco, DACO_BAIRRO = :bairro, DACO_CIDADE = :cidade,
              DACO_EMAIL = :email
        WHERE DACO_CPF = :cpf`,
      { cep: Number(d.cep), endereco: d.endereco, bairro: d.bairro, cidade: d.cidade,
        numero: d.numeroResidencia, complemento: d.complemento || null, email: d.email.toUpperCase(), cpf },
      { autoCommit: false },
    );
    const pessoal = await connection.execute(
      `UPDATE SARH.RH_PESSOAL
          SET PESS_CEP = :cep, PESS_ENDERECO = :endereco, PESS_BAIRRO = :bairro,
              PESS_CIDADE = :cidade, PESS_UF_ENDERECO = :uf,
              PESS_ALTURA = :altura, PESS_CUTIS = :raca,
              PESS_COR_CABELO = :corCabelo, PESS_COR_OLHOS = :corOlhos,
              PESS_TIPO_SANGUINEO = :tipoSanguineo, PESS_IDENTIDADE_GENERO = :identidadeGenero,
              PESS_TELEFONE_1 = :telefone1, PESS_TELEFONE_2 = :telefone2,
              PESS_TEL_CELULAR = :telefone3
        WHERE PESS_C_P_F = :cpf`,
      {
        cep: Number(d.cep), endereco: d.endereco, bairro: d.bairro, cidade: d.cidade, uf: d.uf,
        altura: Number(d.altura.replace(",", ".")), raca: d.raca,
        corCabelo: Number(d.corCabelo), corOlhos: d.corOlhos,
        tipoSanguineo: d.tipoSanguineo, identidadeGenero: Number(d.identidadeGenero),
        telefone1: Number(d.telefones[0] ?? 0), telefone2: d.telefones[1] ? Number(d.telefones[1]) : null,
        telefone3: d.telefones[2] ? Number(d.telefones[2]) : null, cpf,
      },
      { autoCommit: false },
    );
    if (contato.rowsAffected !== 1 || pessoal.rowsAffected !== 1) {
      throw new Error("O SARH não confirmou a atualização do cadastro pessoal.");
    }

    await connection.execute(`DELETE FROM SARH.RH_DADOS_TELEFONE WHERE DATE_TEL_CPF = :cpf`, { cpf }, { autoCommit: false });
    for (const telefone of d.telefones) {
      await connection.execute(
        `INSERT INTO SARH.RH_DADOS_TELEFONE (DATE_TEL_CPF, DATE_TEL_TELEFONE) VALUES (:cpf, :telefone)`,
        { cpf, telefone: Number(telefone) },
        { autoCommit: false },
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: params.usuarioId,
      entidade: "perfil_pessoal_sarh",
      entidadeId: servidor.id,
      acao: "ATUALIZAR_DADOS_PROPRIOS",
      dadosDepois: { camposAtualizados: ["endereco", "email", "telefones", "caracteristicas_pessoais"] },
    },
  });
}

