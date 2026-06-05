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
import { listarIntegracoesSistemaParaExportacao } from "@/modules/integracoes/infrastructure/repositories/integracoes.repository";

export const runtime = "nodejs";

type IntegracaoExportacao = Awaited<
  ReturnType<typeof listarIntegracoesSistemaParaExportacao>
>[number];

function formatarData(data: Date | string | null | undefined) {
  if (!data) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

export async function GET(request: Request) {
  const session = await auth();

  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];
  if (
    !permissoes.includes("integracoes:gerenciar:global") &&
    !permissoes.includes("integracoes:consultar:global")
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const integracoes = await listarIntegracoesSistemaParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    tipo: url.searchParams.get("tipo") ?? "",
    status: url.searchParams.get("status") ?? "",
    direcao: url.searchParams.get("direcao") ?? "",
    ativo: url.searchParams.get("ativo") ?? "",
  });

  const documento = React.createElement(IntegracoesPdfDocument, {
    integracoes,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="integracoes.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

function IntegracoesPdfDocument({
  integracoes,
}: {
  integracoes: IntegracaoExportacao[];
}) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      React.createElement(Text, { style: styles.title }, "Integracoes"),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Total de registros: ${integracoes.length}`,
      ),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: [styles.row, styles.header] },
          React.createElement(Text, { style: styles.cellNome }, "Nome"),
          React.createElement(Text, { style: styles.cellTipo }, "Tipo"),
          React.createElement(Text, { style: styles.cellStatus }, "Status"),
          React.createElement(Text, { style: styles.cellDirecao }, "Direcao"),
          React.createElement(Text, { style: styles.cellAtiva }, "Ativa"),
          React.createElement(Text, { style: styles.cellData }, "Ult. sucesso"),
        ),
        ...integracoes.map((integracao) =>
          React.createElement(
            View,
            { key: integracao.id, style: styles.row },
            React.createElement(Text, { style: styles.cellNome }, integracao.nome),
            React.createElement(Text, { style: styles.cellTipo }, integracao.tipo),
            React.createElement(
              Text,
              { style: styles.cellStatus },
              integracao.status,
            ),
            React.createElement(
              Text,
              { style: styles.cellDirecao },
              integracao.direcao,
            ),
            React.createElement(
              Text,
              { style: styles.cellAtiva },
              integracao.ativo ? "Sim" : "Nao",
            ),
            React.createElement(
              Text,
              { style: styles.cellData },
              formatarData(integracao.ultimoSucessoEm),
            ),
          ),
        ),
      ),
    ),
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: "Helvetica", color: "#111827" },
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
  cellNome: { width: "30%", padding: 5 },
  cellTipo: { width: "16%", padding: 5 },
  cellStatus: { width: "16%", padding: 5 },
  cellDirecao: { width: "14%", padding: 5 },
  cellAtiva: { width: "8%", padding: 5 },
  cellData: { width: "16%", padding: 5 },
});
