import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  afdQueue,
  AFD_JOB_PROCESSAR_ARQUIVO,
} from "@/modules/afd/application/queues/afd-queue";

export const runtime = "nodejs";

async function salvarArquivo(file: File, uploadDir: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const hashArquivo = crypto.createHash("sha256").update(buffer).digest("hex");

  await fs.mkdir(uploadDir, {
    recursive: true,
  });

  const nomeSeguro = file.name.replace(/[^\w.\-]+/g, "_");
  const caminhoArquivo = path.join(
    uploadDir,
    `${Date.now()}-${hashArquivo}-${nomeSeguro}`,
  );

  await fs.writeFile(caminhoArquivo, buffer);

  return {
    caminhoArquivo,
    hashArquivo,
    tamanhoBytes: buffer.length,
    nomeOriginal: file.name,
  };
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json(
      {
        sucesso: false,
        mensagem: "Não autenticado.",
      },
      {
        status: 401,
      },
    );
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("afd:importar:global")) {
    return Response.json(
      {
        sucesso: false,
        mensagem: "Você não possui permissão para importar AFD.",
      },
      {
        status: 403,
      },
    );
  }

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((item): item is File => item instanceof File);
  const equipamentoCodigo = String(
    formData.get("equipamentoCodigo") ?? "",
  ).trim();

  if (files.length === 0) {
    return Response.json(
      {
        sucesso: false,
        mensagem: "Nenhum arquivo enviado.",
      },
      {
        status: 400,
      },
    );
  }

  const uploadDir = process.env.AFD_UPLOAD_DIR ?? "import/_upload/afd";

  const importacao = await prisma.importacaoAfd.create({
    data: {
      status: "RECEBIDA",
      quantidadeArquivos: files.length,
      criadoPorUsuarioId: session.user.id,
      metadados: {
        equipamentoCodigo: equipamentoCodigo || null,
      },
    },
  });

  const arquivosCriados = [];

  for (const file of files) {
    const salvo = await salvarArquivo(file, uploadDir);

    const existente = await prisma.arquivoAfd.findUnique({
      where: {
        hashArquivo: salvo.hashArquivo,
      },
    });

    if (existente) {
      continue;
    }

    const arquivo = await prisma.arquivoAfd.create({
      data: {
        importacaoId: importacao.id,
        status: "RECEBIDO",
        nomeOriginal: salvo.nomeOriginal,
        caminhoArquivo: salvo.caminhoArquivo,
        tamanhoBytes: salvo.tamanhoBytes,
        hashArquivo: salvo.hashArquivo,
        equipamentoCodigo: equipamentoCodigo || null,
      },
    });

    arquivosCriados.push(arquivo);

    await afdQueue.add(AFD_JOB_PROCESSAR_ARQUIVO, {
      arquivoAfdId: arquivo.id,
      usuarioId: session.user.id,
    });

    console.log("[AFD UPLOAD] Job enfileirado para arquivo:", arquivo.id);
  }

  await prisma.importacaoAfd.update({
    where: {
      id: importacao.id,
    },
    data: {
      quantidadeArquivos: arquivosCriados.length,
      status: arquivosCriados.length > 0 ? "RECEBIDA" : "PROCESSADA_COM_ERROS",
      observacao:
        arquivosCriados.length > 0
          ? null
          : "Todos os arquivos enviados já haviam sido importados anteriormente.",
    },
  });

  return Response.json({
    sucesso: true,
    mensagem: "Arquivos recebidos e enfileirados para processamento.",
    importacaoId: importacao.id,
    arquivosRecebidos: files.length,
    arquivosEnfileirados: arquivosCriados.length,
  });
}
