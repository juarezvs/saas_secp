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
import { listarMarcacoesBrutasParaExportacao } from "@/modules/marcacoes-brutas/infrastructure/repositories/marcacao-bruta.repository";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

export const runtime = "nodejs";

type MarcacaoBrutaExportacao = Awaited<
  ReturnType<typeof listarMarcacoesBrutasParaExportacao>
>[number];

function formatarDataHora(valor: Date | string | null | undefined) {
  if (!valor) return "";
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Manaus",
  }).format(data);
}

export async function GET(request: Request) {
  const session = await auth();

  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];
  if (
    !permissoes.includes("marcacoes:consultar:global") &&
    !permissoes.includes("marcacoes:gerenciar:global") &&
    !permissoes.includes("afd:importar:global")
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const marcacoes = await listarMarcacoesBrutasParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    origem: url.searchParams.get("origem") ?? "",
    processada: url.searchParams.get("processada") ?? "",
  });

  const documento = React.createElement(MarcacoesBrutasPdfDocument, {
    marcacoes,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="marcacoes-brutas.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

function MarcacoesBrutasPdfDocument({
  marcacoes,
}: {
  marcacoes: MarcacaoBrutaExportacao[];
}) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      React.createElement(Text, { style: styles.title }, "Marcacoes brutas"),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Total de registros: ${marcacoes.length}`,
      ),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: [styles.row, styles.header] },
          React.createElement(Text, { style: styles.cellData }, "Data/hora"),
          React.createElement(Text, { style: styles.cellOrigem }, "Origem"),
          React.createElement(Text, { style: styles.cellCpf }, "CPF/Matricula"),
          React.createElement(Text, { style: styles.cellServidor }, "Servidor"),
          React.createElement(Text, { style: styles.cellEquipamento }, "Equip."),
          React.createElement(Text, { style: styles.cellStatus }, "Status"),
        ),
        ...marcacoes.map((item) =>
          React.createElement(
            View,
            { key: item.id, style: styles.row },
            React.createElement(
              Text,
              { style: styles.cellData },
              formatarDataHora(item.dataHora),
            ),
            React.createElement(Text, { style: styles.cellOrigem }, item.origem),
            React.createElement(
              Text,
              { style: styles.cellCpf },
              `${item.cpf ?? "-"} / ${item.matricula ?? "-"}`,
            ),
            React.createElement(
              Text,
              { style: styles.cellServidor },
              nomeServidor(item.servidor) || "-",
            ),
            React.createElement(
              Text,
              { style: styles.cellEquipamento },
              item.equipamentoCodigo ?? "-",
            ),
            React.createElement(
              Text,
              { style: styles.cellStatus },
              item.processada ? "Processada" : "Pendente",
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
  cellData: { width: "16%", padding: 5 },
  cellOrigem: { width: "20%", padding: 5 },
  cellCpf: { width: "20%", padding: 5 },
  cellServidor: { width: "24%", padding: 5 },
  cellEquipamento: { width: "10%", padding: 5 },
  cellStatus: { width: "10%", padding: 5 },
});
