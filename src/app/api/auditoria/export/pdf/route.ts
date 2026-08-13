import React, { type ReactElement } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";
import { auth } from "@/auth";
import { withHttpMetrics } from "@/lib/observability/http";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { listarEventosAuditoriaParaExportacao } from "@/modules/auditoria/infrastructure/repositories/auditoria.repository";
import { formatarDataHoraAuditoria } from "@/modules/auditoria/application/services/formatar-auditoria.service";

export const runtime = "nodejs";

type EventoExportacao = Awaited<
  ReturnType<typeof listarEventosAuditoriaParaExportacao>
>[number];

async function getAuditoriaExportPdf(request: Request) {
  const session = await auth();

  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];
  if (
    !permissoes.includes("auditoria:exportar:seccional") &&
    !permissoes.includes("auditoria:consultar:seccional") &&
    !permissoes.includes("auditoria:detalhar:seccional") &&
    !permissoes.includes("auditoria:exportar:global") &&
    !permissoes.includes("auditoria:consultar:global") &&
    !permissoes.includes("auditoria:detalhar:global")
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const eventos = await listarEventosAuditoriaParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    entidade: url.searchParams.get("entidade") ?? "",
    acao: url.searchParams.get("acao") ?? "",
    usuarioId: url.searchParams.get("usuarioId") ?? "",
    dataInicio: url.searchParams.get("dataInicio") ?? "",
    dataFim: url.searchParams.get("dataFim") ?? "",
    orgaoIdsPermitidos: escopoOrgao.global ? undefined : escopoOrgao.orgaoIds,
  });

  const documento = React.createElement(AuditoriaPdfDocument, {
    eventos,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="auditoria.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withHttpMetrics(
  "/api/auditoria/export/pdf",
  getAuditoriaExportPdf,
);

function AuditoriaPdfDocument({ eventos }: { eventos: EventoExportacao[] }) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      React.createElement(Text, { style: styles.title }, "Auditoria"),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Total de registros: ${eventos.length}`,
      ),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: [styles.row, styles.header] },
          React.createElement(Text, { style: styles.cellData }, "Data/hora"),
          React.createElement(Text, { style: styles.cellUsuario }, "Usuario"),
          React.createElement(Text, { style: styles.cellEntidade }, "Entidade"),
          React.createElement(Text, { style: styles.cellId }, "ID"),
          React.createElement(Text, { style: styles.cellAcao }, "Acao"),
          React.createElement(Text, { style: styles.cellIp }, "IP"),
        ),
        ...eventos.map((evento) =>
          React.createElement(
            View,
            { key: evento.id, style: styles.row },
            React.createElement(
              Text,
              { style: styles.cellData },
              formatarDataHoraAuditoria(evento.criadoEm),
            ),
            React.createElement(
              Text,
              { style: styles.cellUsuario },
              evento.usuario
                ? `${evento.usuario.matricula} - ${evento.usuario.nome}`
                : "Sistema/sem usuario",
            ),
            React.createElement(
              Text,
              { style: styles.cellEntidade },
              evento.entidade,
            ),
            React.createElement(
              Text,
              { style: styles.cellId },
              evento.entidadeId ?? "-",
            ),
            React.createElement(Text, { style: styles.cellAcao }, evento.acao),
            React.createElement(
              Text,
              { style: styles.cellIp },
              evento.ip ?? "-",
            ),
          ),
        ),
      ),
    ),
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 7, fontFamily: "Helvetica", color: "#111827" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#4b5563", marginBottom: 14 },
  table: { borderWidth: 1, borderColor: "#d1d5db" },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    minHeight: 22,
  },
  header: { backgroundColor: "#f3f4f6", fontWeight: 700 },
  cellData: { width: "15%", padding: 5 },
  cellUsuario: { width: "24%", padding: 5 },
  cellEntidade: { width: "15%", padding: 5 },
  cellId: { width: "22%", padding: 5 },
  cellAcao: { width: "14%", padding: 5 },
  cellIp: { width: "10%", padding: 5 },
});
