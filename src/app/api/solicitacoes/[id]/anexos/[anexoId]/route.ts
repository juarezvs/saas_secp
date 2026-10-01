import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { perfilEhAdministradorSistema } from "@/modules/auth/domain/constants/perfis-sistema";
import { lerAnexoSolicitacao } from "@/modules/solicitacoes/application/services/solicitacao-anexo-storage.service";
import { usuarioPodeAcessarSolicitacaoComoChefia } from "@/modules/solicitacoes/infrastructure/repositories/solicitacao.repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    id: string;
    anexoId: string;
  }>;
};

function nomeArquivoAscii(nome: string) {
  return (
    nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 120) || "documento.pdf"
  );
}

function arquivoNaoEncontrado(erro: unknown) {
  return (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro &&
    (erro as NodeJS.ErrnoException).code === "ENOENT"
  );
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id, anexoId } = await params;
  const url = new URL(request.url);
  const baixar = url.searchParams.get("download") === "1";
  const destino = request.headers.get("sec-fetch-dest") ?? "";
  const aceitaHtml = request.headers.get("accept")?.includes("text/html");

  if (!baixar && destino === "document" && aceitaHtml) {
    return Response.redirect(
      new URL(`/solicitacoes/${id}/anexos/${anexoId}`, request.url),
      307,
    );
  }

  const session = await auth();

  if (!session?.user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const anexo = await prisma.solicitacaoAnexo.findFirst({
    where: {
      id: anexoId,
      solicitacaoId: id,
    },
    include: {
      solicitacao: {
        select: {
          id: true,
          usuarioSolicitanteId: true,
        },
      },
    },
  });

  if (!anexo) {
    notFound();
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];
  const podeConsultarGlobal =
    permissoes.includes("solicitacoes:consultar:global") ||
    perfilEhAdministradorSistema(session.user.perfilAtivo);
  const podeAcessarComoProprio =
    anexo.solicitacao.usuarioSolicitanteId === session.user.id &&
    (permissoes.includes("solicitacoes:consultar:proprio") ||
      permissoes.includes("solicitacoes:visualizar:proprio"));
  const podeAcessarComoChefia =
    permissoes.includes("solicitacoes:analisar:chefia") &&
    (await usuarioPodeAcessarSolicitacaoComoChefia({
      usuarioId: session.user.id,
      solicitacaoId: id,
    }));

  if (
    !podeConsultarGlobal &&
    !podeAcessarComoProprio &&
    !podeAcessarComoChefia
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const arquivo = await lerAnexoSolicitacao(anexo.caminhoArquivo).catch(
    (erro: unknown) => {
      if (arquivoNaoEncontrado(erro)) {
        return null;
      }

      throw erro;
    },
  );

  if (!arquivo) {
    return new Response(
      "Arquivo do anexo não encontrado no armazenamento. Reenvie o documento para restaurar a visualização.",
      {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  const nomeArquivo = nomeArquivoAscii(anexo.nomeOriginal);
  const disposicao = baixar ? "attachment" : "inline";

  return new Response(new Uint8Array(arquivo.conteudo), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(arquivo.tamanhoBytes),
      "Content-Disposition": `${disposicao}; filename="${nomeArquivo}"; filename*=UTF-8''${encodeURIComponent(
        anexo.nomeOriginal,
      )}`,
      "Cache-Control": "private, max-age=0, must-revalidate",
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
