import { SarhOracleClient } from "@/modules/integracoes/sarh/infrastructure/oracle/sarh-oracle-client";

export type SarhServidorDto = {
  matricula: string;
  nome: string;
  email?: string | null;
  cpf?: string | null;
  cargo?: string | null;
  unidadeSigla?: string | null;
  unidadeNome?: string | null;
  situacao?: string | null;
  dataAdmissao?: string | null;
};

function mockServidoresSarh(): SarhServidorDto[] {
  return [
    {
      matricula: "999001",
      nome: "Servidor Teste SECP",
      email: "servidor.teste@trf1.jus.br",
      cargo: "Analista Judiciário",
      unidadeSigla: "NUTEC",
      unidadeNome: "Núcleo de Tecnologia da Informação",
      situacao: "ATIVO",
      dataAdmissao: "2020-01-01",
    },
  ];
}

export async function buscarServidoresSarh(): Promise<SarhServidorDto[]> {
  const usarMock = process.env.SARH_MOCK === "true";

  if (usarMock) {
    return mockServidoresSarh();
  }

  const client = new SarhOracleClient();
  const servidores = await client.buscarServidores();

  return servidores.map((servidor) => ({
    matricula: servidor.matricula,
    nome: servidor.nome,
    cpf: servidor.cpf ? String(servidor.cpf) : null,
    cargo: servidor.cargoDescricao,
    unidadeSigla: servidor.lotacaoSigla,
    unidadeNome: servidor.lotacaoDescricao,
    situacao: servidor.ativo ? "ATIVO" : "INATIVO",
    dataAdmissao: null,
  }));
}
