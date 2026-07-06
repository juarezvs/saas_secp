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
import { listarFechamentosMensaisParaExportacao } from "@/modules/homologacao/infrastructure/repositories/homologacao.repository";
import { rotuloStatusFechamento } from "@/modules/homologacao/application/services/formatar-homologacao.service";

export const runtime = "nodejs";

type FechamentoExportacao = Awaited<
  ReturnType<typeof listarFechamentosMensaisParaExportacao>
>[number];

function nomesHomologadoresServidores(
  servidores: FechamentoExportacao["servidores"],
) {
  return Array.from(
    new Set(
      servidores
        .map((servidor) => servidor.homologadoPor?.nome)
        .filter((nome): nome is string => Boolean(nome)),
    ),
  ).join(", ");
}

export async function GET(request: Request) {
  const session = await auth();

  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];
  if (
    !permissoes.includes("homologacao:gerenciar:chefia") &&
    !permissoes.includes("homologacao:consultar:global")
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const fechamentos = await listarFechamentosMensaisParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    anoReferencia: url.searchParams.get("anoReferencia") ?? "",
    mesReferencia: url.searchParams.get("mesReferencia") ?? "",
    unidade: url.searchParams.get("unidade") ?? "",
    status: url.searchParams.get("status") ?? "",
  });

  const documento = React.createElement(HomologacaoPdfDocument, {
    fechamentos,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="homologacao.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

function HomologacaoPdfDocument({
  fechamentos,
}: {
  fechamentos: FechamentoExportacao[];
}) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      React.createElement(Text, { style: styles.title }, "Homologacao"),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Total de registros: ${fechamentos.length}`,
      ),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: [styles.row, styles.header] },
          React.createElement(Text, { style: styles.cellReferencia }, "Ref."),
          React.createElement(Text, { style: styles.cellUnidade }, "Unidade"),
          React.createElement(Text, { style: styles.cellServidores }, "Serv."),
          React.createElement(Text, { style: styles.cellStatus }, "Status"),
          React.createElement(
            Text,
            { style: styles.cellUsuario },
            "Aberto por",
          ),
          React.createElement(
            Text,
            { style: styles.cellUsuario },
            "Homologado por",
          ),
        ),
        ...fechamentos.map((fechamento) =>
          React.createElement(
            View,
            { key: fechamento.id, style: styles.row },
            React.createElement(
              Text,
              { style: styles.cellReferencia },
              `${String(fechamento.mesReferencia).padStart(2, "0")}/${fechamento.anoReferencia}`,
            ),
            React.createElement(
              Text,
              { style: styles.cellUnidade },
              fechamento.unidade.sigla,
            ),
            React.createElement(
              Text,
              { style: styles.cellServidores },
              String(fechamento.servidores.length),
            ),
            React.createElement(
              Text,
              { style: styles.cellStatus },
              rotuloStatusFechamento(fechamento.status),
            ),
            React.createElement(
              Text,
              { style: styles.cellUsuario },
              fechamento.abertoPor.nome,
            ),
            React.createElement(
              Text,
              { style: styles.cellUsuario },
              fechamento.homologadoPor?.nome ||
                nomesHomologadoresServidores(fechamento.servidores) ||
                "-",
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
  cellReferencia: { width: "10%", padding: 5 },
  cellUnidade: { width: "18%", padding: 5 },
  cellServidores: { width: "8%", padding: 5 },
  cellStatus: { width: "18%", padding: 5 },
  cellUsuario: { width: "23%", padding: 5 },
});
