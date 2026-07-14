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
import { usuarioPossuiAlgumaPermissaoNoPerfil } from "@/modules/auth/application/services/permissao.service";
import { listarBoletinsFrequenciaParaExportacao } from "@/modules/boletim-frequencia/infrastructure/repositories/boletim-frequencia.repository";
import { rotuloStatusBoletim } from "@/modules/boletim-frequencia/application/services/formatar-boletim-frequencia.service";

export const runtime = "nodejs";

type BoletimExportacao = Awaited<
  ReturnType<typeof listarBoletinsFrequenciaParaExportacao>
>[number];

async function getBoletimFrequenciaExportPdf(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const podeAcessar = usuarioPossuiAlgumaPermissaoNoPerfil(
    session.user.perfilAtivo?.codigo,
    session.user.perfilAtivo?.permissoes,
    [
      "boletim-frequencia:gerar:chefia",
      "boletim-frequencia:encaminhar:chefia",
      "boletim-frequencia:receber:global",
      "boletim-frequencia:consultar:global",
    ],
  );

  if (!podeAcessar) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const boletins = await listarBoletinsFrequenciaParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    anoReferencia: url.searchParams.get("anoReferencia") ?? "",
    mesReferencia: url.searchParams.get("mesReferencia") ?? "",
    unidade: url.searchParams.get("unidade") ?? "",
    status: url.searchParams.get("status") ?? "",
  });

  const documento = React.createElement(BoletinsPdfDocument, {
    boletins,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="boletins-frequencia.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withHttpMetrics(
  "/api/boletim-frequencia/export/pdf",
  getBoletimFrequenciaExportPdf,
);

function BoletinsPdfDocument({ boletins }: { boletins: BoletimExportacao[] }) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      React.createElement(Text, { style: styles.title }, "Boletins de frequencia"),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Total de registros: ${boletins.length}`,
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
          React.createElement(Text, { style: styles.cellSei }, "SEI"),
          React.createElement(Text, { style: styles.cellUsuario }, "Gerado por"),
        ),
        ...boletins.map((boletim) =>
          React.createElement(
            View,
            { key: boletim.id, style: styles.row },
            React.createElement(
              Text,
              { style: styles.cellReferencia },
              `${String(boletim.mesReferencia).padStart(2, "0")}/${boletim.anoReferencia}`,
            ),
            React.createElement(
              Text,
              { style: styles.cellUnidade },
              boletim.unidade.sigla,
            ),
            React.createElement(
              Text,
              { style: styles.cellServidores },
              String(boletim._count.servidores),
            ),
            React.createElement(
              Text,
              { style: styles.cellStatus },
              rotuloStatusBoletim(boletim.status),
            ),
            React.createElement(Text, { style: styles.cellSei }, boletim.processoSei ?? "-"),
            React.createElement(
              Text,
              { style: styles.cellUsuario },
              boletim.geradoPor.nome,
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
  cellSei: { width: "20%", padding: 5 },
  cellUsuario: { width: "26%", padding: 5 },
});
