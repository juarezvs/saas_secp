import { obterIntegracaoSarhConfigurada } from "@/modules/integracoes/sarh/application/services/sarh-oracle-config.service";

type ProgramacaoFeriasEnvio = {
  id: string;
  servidor: {
    matricula: string;
    codigoFuncionarioSarh: number | null;
  };
  orgaoId: string;
  exercicio: number;
  dataInicio: Date;
  dataFim: Date;
  dias: number;
  observacaoServidor: string | null;
  observacaoChefia: string | null;
};

function formatarDataSarh(data: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
  }).format(data);
}

export function montarPayloadFeriasSarh(programacao: ProgramacaoFeriasEnvio) {
  return {
    origem: "SECP",
    programacaoFeriasId: programacao.id,
    matricula: programacao.servidor.matricula,
    codigoFuncionarioSarh: programacao.servidor.codigoFuncionarioSarh,
    exercicio: programacao.exercicio,
    dataInicio: formatarDataSarh(programacao.dataInicio),
    dataFim: formatarDataSarh(programacao.dataFim),
    dias: programacao.dias,
    observacaoServidor: programacao.observacaoServidor,
    observacaoChefia: programacao.observacaoChefia,
  };
}

export async function enviarProgramacaoFeriasSarh(programacao: ProgramacaoFeriasEnvio) {
  const procedure = process.env.SARH_FERIAS_PROCEDURE?.trim();
  const payload = montarPayloadFeriasSarh(programacao);

  if (!procedure) {
    return {
      sucesso: false,
      payload,
      erro:
        "Procedure SARH de férias não configurada. Defina SARH_FERIAS_PROCEDURE para habilitar o envio.",
      retorno: null,
      protocolo: null,
    };
  }

  const { config } = await obterIntegracaoSarhConfigurada(programacao.orgaoId);
  const oracleDbImport = await import("oracledb");
  const oracledb = oracleDbImport.default ?? oracleDbImport;
  const connection = await oracledb.getConnection({
    user: config.username,
    password: config.password,
    connectString: config.connectString,
  });

  try {
    const protocolo = `SECP-${programacao.id}`;
    const result = await connection.execute(
      `begin ${procedure}(:payload, :protocolo); end;`,
      {
        payload: JSON.stringify(payload),
        protocolo,
      },
      { autoCommit: true },
    );

    return {
      sucesso: true,
      payload,
      erro: null,
      retorno: {
        rowsAffected: result.rowsAffected ?? null,
        outBinds: result.outBinds ?? null,
      },
      protocolo,
    };
  } finally {
    await connection.close();
  }
}
