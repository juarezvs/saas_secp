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
import { listarUnidadesOrganizacionaisParaExportacao } from "@/modules/unidades/infrastructure/repositories/unidade.repository";

export const runtime = "nodejs";

type UnidadeExportacao = Awaited<
  ReturnType<typeof listarUnidadesOrganizacionaisParaExportacao>
>[number];

export async function GET(request: Request) {
  const session = await auth();

  if (
    !session?.user?.perfilAtivo?.permissoes?.includes(
      "unidades:gerenciar:global",
    )
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);

  const unidades = await listarUnidadesOrganizacionaisParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    sigla: url.searchParams.get("sigla") ?? "",
    nome: url.searchParams.get("nome") ?? "",
    tipo: url.searchParams.get("tipo") ?? "",
    orgaoId: url.searchParams.get("orgaoId") ?? "",
    superior: url.searchParams.get("superior") ?? "",
    status: url.searchParams.get("status") ?? "",
  });

  const documento = React.createElement(UnidadesPdfDocument, {
    unidades,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="unidades-organizacionais.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

function UnidadesPdfDocument({ unidades }: { unidades: UnidadeExportacao[] }) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      {
        size: "A4",
        orientation: "landscape",
        style: styles.page,
      },

      React.createElement(
        Text,
        { style: styles.title },
        "SECP - Unidades Organizacionais",
      ),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Total de registros: ${unidades.length}`,
      ),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: [styles.row, styles.header] },
          React.createElement(Text, { style: styles.cellSigla }, "Sigla"),
          React.createElement(Text, { style: styles.cellNome }, "Nome"),
          React.createElement(Text, { style: styles.cellTipo }, "Tipo"),
          React.createElement(Text, { style: styles.cellOrgao }, "Órgão"),
          React.createElement(Text, { style: styles.cellSuperior }, "Superior"),
          React.createElement(Text, { style: styles.cellSmall }, "Sub."),
          React.createElement(Text, { style: styles.cellSmall }, "Lot."),
          React.createElement(Text, { style: styles.cellStatus }, "Status"),
        ),
        ...unidades.map((unidade) =>
          React.createElement(
            View,
            {
              key: unidade.id,
              style: styles.row,
            },
            React.createElement(
              Text,
              { style: styles.cellSigla },
              unidade.sigla,
            ),
            React.createElement(Text, { style: styles.cellNome }, unidade.nome),
            React.createElement(Text, { style: styles.cellTipo }, unidade.tipo),
            React.createElement(
              Text,
              { style: styles.cellOrgao },
              unidade.orgao.sigla,
            ),
            React.createElement(
              Text,
              { style: styles.cellSuperior },
              unidade.unidadePai?.sigla ?? "-",
            ),
            React.createElement(
              Text,
              { style: styles.cellSmall },
              String(unidade._count.unidadesFilhas),
            ),
            React.createElement(
              Text,
              { style: styles.cellSmall },
              String(unidade._count.lotacoes),
            ),
            React.createElement(
              Text,
              { style: styles.cellStatus },
              unidade.ativo ? "Ativa" : "Inativa",
            ),
          ),
        ),
      ),
    ),
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#4b5563",
    marginBottom: 14,
  },
  table: {
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    minHeight: 22,
  },
  header: {
    backgroundColor: "#f3f4f6",
    fontWeight: 700,
  },
  cellSigla: {
    width: "9%",
    padding: 5,
  },
  cellNome: {
    width: "34%",
    padding: 5,
  },
  cellTipo: {
    width: "16%",
    padding: 5,
  },
  cellOrgao: {
    width: "8%",
    padding: 5,
  },
  cellSuperior: {
    width: "10%",
    padding: 5,
  },
  cellSmall: {
    width: "6%",
    padding: 5,
    textAlign: "center",
  },
  cellStatus: {
    width: "11%",
    padding: 5,
  },
});
