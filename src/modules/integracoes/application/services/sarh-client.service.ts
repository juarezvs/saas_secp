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

  const baseUrl = process.env.SARH_API_BASE_URL;
  const token = process.env.SARH_API_TOKEN;

  if (!baseUrl) {
    throw new Error("SARH_API_BASE_URL não configurada.");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/servidores`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar SARH. HTTP ${response.status}.`);
  }

  const data = await response.json();

  if (Array.isArray(data)) {
    return data as SarhServidorDto[];
  }

  if (Array.isArray(data.servidores)) {
    return data.servidores as SarhServidorDto[];
  }

  throw new Error("Resposta do SARH em formato não reconhecido.");
}
