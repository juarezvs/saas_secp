import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const DIRETORIO_ANEXOS_CONFIGURADO = process.env.SECP_SOLICITACOES_ANEXOS_DIR
  ? path.resolve(process.env.SECP_SOLICITACOES_ANEXOS_DIR)
  : path.resolve(process.cwd(), ".storage", "solicitacoes");
const DIRETORIO_ANEXOS_CONTAINER = "/app/.storage/solicitacoes";

const TAMANHO_MAXIMO_PDF_BYTES = 10 * 1024 * 1024;

export type AnexoSolicitacaoUpload = {
  descricao: string;
  nomeOriginal: string;
  nomeArquivo: string;
  caminhoArquivo: string;
  contentType: string;
  tamanhoBytes: number;
  hashSha256: string;
};

function nomeSeguro(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 180);
}

function ehPdf(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLocaleLowerCase("pt-BR").endsWith(".pdf")
  );
}

async function criarDiretorioAnexos(diretorioRelativo: string) {
  const diretorioPrincipal = path.join(
    DIRETORIO_ANEXOS_CONFIGURADO,
    diretorioRelativo,
  );

  await mkdir(diretorioPrincipal, { recursive: true });
  return diretorioPrincipal;
}

function caminhoDentroDaRaiz(caminhoArquivo: string, raiz: string) {
  const caminho = path.resolve(caminhoArquivo);
  const raizResolvida = path.resolve(raiz);
  return (
    caminho === raizResolvida ||
    caminho.startsWith(`${raizResolvida}${path.sep}`)
  );
}

function resolverCaminhoLeituraAnexo(caminhoArquivo: string) {
  const caminhoNormalizado = caminhoArquivo.replace(/\\/g, "/");

  if (
    caminhoNormalizado === DIRETORIO_ANEXOS_CONTAINER ||
    caminhoNormalizado.startsWith(`${DIRETORIO_ANEXOS_CONTAINER}/`)
  ) {
    const relativo = caminhoNormalizado
      .slice(DIRETORIO_ANEXOS_CONTAINER.length)
      .replace(/^\/+/, "");

    return path.resolve(DIRETORIO_ANEXOS_CONFIGURADO, relativo);
  }

  return path.resolve(caminhoArquivo);
}

export function extrairArquivosAnexosSolicitacao(formData: FormData) {
  const arquivos = formData
    .getAll("anexos")
    .filter((valor): valor is File => valor instanceof File && valor.size > 0);
  const descricoes = formData
    .getAll("anexoDescricoes")
    .map((valor) => String(valor ?? "").trim());

  return arquivos.map((arquivo, indice) => ({
    arquivo,
    descricao: descricoes[indice] ?? "",
  }));
}

export function validarAnexosSolicitacao(
  anexos: Array<{ arquivo: File; descricao: string }>,
) {
  const erros: string[] = [];

  if (anexos.length > 10) {
    erros.push("Envie no máximo 10 anexos por solicitação.");
  }

  anexos.forEach((anexo, indice) => {
    const posicao = indice + 1;

    if (!ehPdf(anexo.arquivo)) {
      erros.push(`O anexo ${posicao} deve ser um arquivo PDF.`);
    }

    if (anexo.arquivo.size > TAMANHO_MAXIMO_PDF_BYTES) {
      erros.push(`O anexo ${posicao} excede o limite de 10 MB.`);
    }

    if (anexo.descricao.length < 3) {
      erros.push(`Informe a descrição do anexo ${posicao}.`);
    }

    if (anexo.descricao.length > 240) {
      erros.push(
        `A descrição do anexo ${posicao} deve ter até 240 caracteres.`,
      );
    }
  });

  return erros;
}

export async function salvarAnexosSolicitacao(
  anexos: Array<{ arquivo: File; descricao: string }>,
): Promise<AnexoSolicitacaoUpload[]> {
  if (anexos.length === 0) {
    return [];
  }

  const hoje = new Date();
  const diretorio = await criarDiretorioAnexos(
    path.join(
      String(hoje.getUTCFullYear()),
      String(hoje.getUTCMonth() + 1).padStart(2, "0"),
    ),
  );

  const salvos: AnexoSolicitacaoUpload[] = [];

  for (const anexo of anexos) {
    const bytes = Buffer.from(await anexo.arquivo.arrayBuffer());
    const idArquivo = randomUUID();
    const nomeOriginal = anexo.arquivo.name || "documento.pdf";
    const nomeArquivo = `${idArquivo}-${nomeSeguro(nomeOriginal) || "documento.pdf"}`;
    const caminhoArquivo = path.join(diretorio, nomeArquivo);

    await writeFile(caminhoArquivo, bytes);

    salvos.push({
      descricao: anexo.descricao,
      nomeOriginal,
      nomeArquivo,
      caminhoArquivo,
      contentType: "application/pdf",
      tamanhoBytes: bytes.length,
      hashSha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }

  return salvos;
}

export async function lerAnexoSolicitacao(caminhoArquivo: string) {
  const caminho = resolverCaminhoLeituraAnexo(caminhoArquivo);

  if (
    !caminhoDentroDaRaiz(caminho, DIRETORIO_ANEXOS_CONFIGURADO) &&
    !caminhoDentroDaRaiz(
      caminho,
      path.join(path.sep, "tmp", "secp", "solicitacoes"),
    )
  ) {
    throw new Error("Caminho de anexo invalido.");
  }

  const [conteudo, info] = await Promise.all([
    readFile(caminho),
    stat(caminho),
  ]);

  return {
    conteudo,
    tamanhoBytes: info.size,
  };
}
