import {
  criarElementoPdf,
  criarPdfResponse,
} from "@/shared/reporting/pdf-response";
import { registrarAuditoriaEvento } from "@/modules/auditoria/application/services/registrar-auditoria.service";
import {
  obterPermissoesDaSessao,
  usuarioPossuiAlgumaPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import {
  PERMISSOES_ACOMPANHAMENTO_ESTAGIO,
  carregarAcompanhamentoEstagio,
  carregarAcompanhamentoEstagioPorServidor,
  normalizarCompetenciaEstagio,
} from "@/modules/acompanhamento-estagio/application/services/acompanhamento-estagio.service";
import { AcompanhamentoEstagioPdfDocument } from "@/modules/acompanhamento-estagio/presentation/pdf/acompanhamento-estagio-pdf.document";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const permissao = await obterPermissoesDaSessao();

  if (!permissao.permitido) {
    return new Response("Nao autenticado.", { status: 401 });
  }

  const url = new URL(request.url);
  const { ano, mes } = normalizarCompetenciaEstagio({
    competencia: url.searchParams.get("competencia"),
    anoReferencia: url.searchParams.get("anoReferencia"),
    mesReferencia: url.searchParams.get("mesReferencia"),
  });
  const servidorId = url.searchParams.get("servidorId");
  const podeExportarProprio = usuarioPossuiAlgumaPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    [PERMISSOES_ACOMPANHAMENTO_ESTAGIO.exportar],
  );
  const podeSupervisionar = usuarioPossuiAlgumaPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    [PERMISSOES_ACOMPANHAMENTO_ESTAGIO.supervisionar],
  );
  const podeExportarSeccional = usuarioPossuiAlgumaPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    [PERMISSOES_ACOMPANHAMENTO_ESTAGIO.exportarSeccional],
  );
  const dados = servidorId
    ? podeExportarSeccional || podeSupervisionar
      ? await carregarAcompanhamentoEstagioPorServidor({
          servidorId,
          usuarioId: permissao.usuarioId ?? "",
          ano,
          mes,
          modo: podeExportarSeccional ? "CONSULTA" : "SUPERVISOR",
          orgaoIds: permissao.orgaoIds,
        })
      : null
    : podeExportarProprio
      ? await carregarAcompanhamentoEstagio({
          usuarioId: permissao.usuarioId ?? "",
          ano,
          mes,
        })
      : null;

  if (!dados) {
    return new Response("Acompanhamento nao encontrado.", {
      status: servidorId || podeExportarProprio ? 404 : 403,
    });
  }

  const rascunho = dados.acompanhamento.status !== "FECHADO";

  await registrarAuditoriaEvento({
    usuarioId: permissao.usuarioId,
    entidade: "AcompanhamentoEstagioMensal",
    entidadeId: dados.acompanhamento.id,
    acao: rascunho
      ? "EXPORTAR_ACOMPANHAMENTO_ESTAGIO_PDF_RASCUNHO"
      : "EXPORTAR_ACOMPANHAMENTO_ESTAGIO_PDF",
    metadados: {
      anoReferencia: ano,
      mesReferencia: mes,
      servidorId: dados.servidor.id,
      matricula: dados.servidor.matricula,
      status: dados.acompanhamento.status,
    },
  });

  return criarPdfResponse({
    document: criarElementoPdf(AcompanhamentoEstagioPdfDocument, { dados }),
    filename: `acompanhamento-estagio-${dados.servidor.matricula}-${String(
      mes,
    ).padStart(2, "0")}-${ano}${rascunho ? "-rascunho" : ""}.pdf`,
  });
}
