import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { perfilAtivoEhChefia } from "@/modules/auth/application/services/perfil-chefia.service";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getEvidenciaFacialMarcacao(
  _request: Request,
  context: RouteContext,
) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const { id } = await context.params;
  const marcacao = await prisma.marcacao.findUnique({
    where: {
      id,
    },
    select: {
      servidor: {
        select: {
          usuarioId: true,
          orgaoId: true,
          lotacoes: {
            where: {
              status: "ATIVO",
            },
            select: {
              unidadeId: true,
            },
          },
        },
      },
      evidenciaFacial: {
        select: {
          contentType: true,
          imagem: true,
          tamanhoBytes: true,
        },
      },
    },
  });

  if (!marcacao?.evidenciaFacial) {
    return new Response("Evidência facial não encontrada.", { status: 404 });
  }

  if (
    !(await podeVisualizarEvidenciaFacial({
      usuarioId: session.user.id,
      servidor: marcacao.servidor,
      perfilAtivoCodigo: session.user.perfilAtivo?.codigo,
      permissoes: session.user.perfilAtivo?.permissoes ?? [],
    }))
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  return new Response(new Uint8Array(marcacao.evidenciaFacial.imagem), {
    headers: {
      "Content-Type": marcacao.evidenciaFacial.contentType,
      "Content-Length": String(marcacao.evidenciaFacial.tamanhoBytes),
      "Cache-Control": "private, max-age=300",
    },
  });
}

export const GET = withHttpMetrics<Request, [RouteContext]>(
  "/api/marcacoes/:id/evidencia-facial",
  getEvidenciaFacialMarcacao,
);

async function podeVisualizarEvidenciaFacial(params: {
  usuarioId: string;
  servidor: {
    usuarioId: string | null;
    orgaoId: string;
    lotacoes: {
      unidadeId: string;
    }[];
  };
  perfilAtivoCodigo?: string | null;
  permissoes: string[];
}) {
  const permissoes = params.permissoes;

  if (
    params.servidor.usuarioId === params.usuarioId &&
    (permissoes.includes("marcacoes:consultar:proprio") ||
      permissoes.includes("espelho-ponto:visualizar:proprio"))
  ) {
    return true;
  }

  if (
    permissoes.includes("marcacoes:consultar:global") ||
    permissoes.includes("marcacoes:gerenciar:global")
  ) {
    return true;
  }

  if (
    permissoes.includes("marcacoes:consultar:seccional") ||
    permissoes.includes("marcacoes:gerenciar:seccional")
  ) {
    const escopoOrgao = await obterEscopoOrgaoDaSessao();

    if (
      escopoOrgao.global ||
      escopoOrgao.orgaoIds.includes(params.servidor.orgaoId)
    ) {
      return true;
    }
  }

  const podeChefia =
    perfilAtivoEhChefia({
      perfilAtivoCodigo: params.perfilAtivoCodigo,
      permissoes,
    }) ||
    permissoes.includes("homologacao:gerenciar:chefia") ||
    permissoes.includes("minha-equipe:consultar:chefia");

  if (!podeChefia) {
    return false;
  }

  const unidadesSubordinadas = await listarIdsUnidadesSubordinadasPorUsuario(
    params.usuarioId,
  );

  return unidadesSubordinadas.some((unidadeId) =>
    params.servidor.lotacoes.some((lotacao) => lotacao.unidadeId === unidadeId),
  );
}
