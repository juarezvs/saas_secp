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
import { listarPerfisParaExportacao } from "@/modules/perfis/infrastructure/repositories/perfil.repository";

export const runtime = "nodejs";

type PerfilExportacao = Awaited<
  ReturnType<typeof listarPerfisParaExportacao>
>[number];

export async function GET(request: Request) {
  const session = await auth();

  if (
    !session?.user?.perfilAtivo?.permissoes?.includes(
      "perfis:gerenciar:global",
    )
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const perfis = await listarPerfisParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    codigo: url.searchParams.get("codigo") ?? "",
    nome: url.searchParams.get("nome") ?? "",
    permissao: url.searchParams.get("permissao") ?? "",
    status: url.searchParams.get("status") ?? "",
  });

  const documento = React.createElement(PerfisPdfDocument, {
    perfis,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="perfis.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

function PerfisPdfDocument({ perfis }: { perfis: PerfilExportacao[] }) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      React.createElement(Text, { style: styles.title }, "Perfis"),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Total de registros: ${perfis.length}`,
      ),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: [styles.row, styles.header] },
          React.createElement(Text, { style: styles.cellCodigo }, "Codigo"),
          React.createElement(Text, { style: styles.cellNome }, "Nome"),
          React.createElement(Text, { style: styles.cellUsuarios }, "Usuarios"),
          React.createElement(
            Text,
            { style: styles.cellPermissoes },
            "Permissoes",
          ),
          React.createElement(Text, { style: styles.cellStatus }, "Status"),
        ),
        ...perfis.map((perfil) =>
          React.createElement(
            View,
            { key: perfil.id, style: styles.row },
            React.createElement(Text, { style: styles.cellCodigo }, perfil.codigo),
            React.createElement(Text, { style: styles.cellNome }, perfil.nome),
            React.createElement(
              Text,
              { style: styles.cellUsuarios },
              String(perfil._count.usuarios),
            ),
            React.createElement(
              Text,
              { style: styles.cellPermissoes },
              String(perfil.permissoes.length),
            ),
            React.createElement(
              Text,
              { style: styles.cellStatus },
              perfil.ativo ? "Ativo" : "Inativo",
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
  cellCodigo: { width: "24%", padding: 5 },
  cellNome: { width: "42%", padding: 5 },
  cellUsuarios: { width: "12%", padding: 5 },
  cellPermissoes: { width: "12%", padding: 5 },
  cellStatus: { width: "10%", padding: 5 },
});
