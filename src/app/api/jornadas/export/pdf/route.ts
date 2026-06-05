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
import { listarJornadasParaExportacao } from "@/modules/jornadas/infrastructure/repositories/jornada.repository";

export const runtime = "nodejs";

type JornadaExportacao = Awaited<
  ReturnType<typeof listarJornadasParaExportacao>
>[number];

function minutosParaHoras(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${resto}`;
}

export async function GET(request: Request) {
  const session = await auth();

  if (
    !session?.user?.perfilAtivo?.permissoes?.includes(
      "jornadas:gerenciar:global",
    )
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const jornadas = await listarJornadasParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    codigo: url.searchParams.get("codigo") ?? "",
    nome: url.searchParams.get("nome") ?? "",
    tipo: url.searchParams.get("tipo") ?? "",
    status: url.searchParams.get("status") ?? "",
  });

  const documento = React.createElement(JornadasPdfDocument, {
    jornadas,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="jornadas.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

function JornadasPdfDocument({ jornadas }: { jornadas: JornadaExportacao[] }) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      React.createElement(Text, { style: styles.title }, "Jornadas"),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Total de registros: ${jornadas.length}`,
      ),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: [styles.row, styles.header] },
          React.createElement(Text, { style: styles.cellCodigo }, "Codigo"),
          React.createElement(Text, { style: styles.cellNome }, "Nome"),
          React.createElement(Text, { style: styles.cellTipo }, "Tipo"),
          React.createElement(Text, { style: styles.cellCarga }, "Carga"),
          React.createElement(Text, { style: styles.cellIntervalo }, "Intervalo"),
          React.createElement(Text, { style: styles.cellContador }, "Escalas"),
          React.createElement(Text, { style: styles.cellContador }, "Servidores"),
          React.createElement(Text, { style: styles.cellStatus }, "Status"),
        ),
        ...jornadas.map((jornada) =>
          React.createElement(
            View,
            { key: jornada.id, style: styles.row },
            React.createElement(Text, { style: styles.cellCodigo }, jornada.codigo),
            React.createElement(Text, { style: styles.cellNome }, jornada.nome),
            React.createElement(Text, { style: styles.cellTipo }, jornada.tipo),
            React.createElement(
              Text,
              { style: styles.cellCarga },
              minutosParaHoras(jornada.cargaDiariaMinutos),
            ),
            React.createElement(
              Text,
              { style: styles.cellIntervalo },
              jornada.exigeIntervalo
                ? `${jornada.intervaloMinimoMinutos ?? "-"} a ${
                    jornada.intervaloMaximoMinutos ?? "-"
                  } min`
                : "Nao",
            ),
            React.createElement(
              Text,
              { style: styles.cellContador },
              String(jornada._count.escalas),
            ),
            React.createElement(
              Text,
              { style: styles.cellContador },
              String(jornada._count.servidores),
            ),
            React.createElement(
              Text,
              { style: styles.cellStatus },
              jornada.ativo ? "Ativa" : "Inativa",
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
  cellCodigo: { width: "14%", padding: 5 },
  cellNome: { width: "28%", padding: 5 },
  cellTipo: { width: "12%", padding: 5 },
  cellCarga: { width: "8%", padding: 5 },
  cellIntervalo: { width: "14%", padding: 5 },
  cellContador: { width: "8%", padding: 5 },
  cellStatus: { width: "8%", padding: 5 },
});
