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
import {
  aplicarEscopoOrgaoId,
  obterEscopoOrgaoDaSessao,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { listarOrgaosParaExportacao } from "@/modules/orgaos/infrastructure/repositories/orgao.repository";

export const runtime = "nodejs";

type OrgaoExportacao = Awaited<
  ReturnType<typeof listarOrgaosParaExportacao>
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

  if (
    !session?.user?.perfilAtivo?.permissoes?.includes(
      "unidades:gerenciar:global",
    )
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaos = await listarOrgaosParaExportacao(
    aplicarEscopoOrgaoId(
      {
        busca: url.searchParams.get("busca") ?? "",
        sigla: url.searchParams.get("sigla") ?? "",
        nome: url.searchParams.get("nome") ?? "",
        codigoExternoSarh: url.searchParams.get("codigoExternoSarh") ?? "",
        status: url.searchParams.get("status") ?? "",
        fusoHorario: url.searchParams.get("fusoHorario") ?? "",
      },
      escopoOrgao,
    ),
  );

  const documento = React.createElement(OrgaosPdfDocument, {
    orgaos,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="orgaos.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

function OrgaosPdfDocument({ orgaos }: { orgaos: OrgaoExportacao[] }) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      React.createElement(Text, { style: styles.title }, "Orgaos"),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Total de registros: ${orgaos.length}`,
      ),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: [styles.row, styles.header] },
          React.createElement(Text, { style: styles.cellSigla }, "Sigla"),
          React.createElement(Text, { style: styles.cellNome }, "Nome"),
          React.createElement(Text, { style: styles.cellCodigo }, "SARH"),
          React.createElement(Text, { style: styles.cellContador }, "Unid."),
          React.createElement(Text, { style: styles.cellContador }, "Serv."),
          React.createElement(Text, { style: styles.cellFuso }, "Fuso"),
          React.createElement(Text, { style: styles.cellData }, "Ult. sync"),
          React.createElement(Text, { style: styles.cellStatus }, "Status"),
        ),
        ...orgaos.map((orgao) =>
          React.createElement(
            View,
            { key: orgao.id, style: styles.row },
            React.createElement(Text, { style: styles.cellSigla }, orgao.sigla),
            React.createElement(Text, { style: styles.cellNome }, orgao.nome),
            React.createElement(
              Text,
              { style: styles.cellCodigo },
              orgao.codigoExternoSarh ? String(orgao.codigoExternoSarh) : "-",
            ),
            React.createElement(
              Text,
              { style: styles.cellContador },
              String(orgao._count.unidades),
            ),
            React.createElement(
              Text,
              { style: styles.cellContador },
              String(orgao._count.servidores),
            ),
            React.createElement(
              Text,
              { style: styles.cellFuso },
              orgao.fusoHorario ?? "-",
            ),
            React.createElement(
              Text,
              { style: styles.cellData },
              formatarData(orgao.ultimaSincronizacaoSarh),
            ),
            React.createElement(
              Text,
              { style: styles.cellStatus },
              orgao.ativo ? "Ativo" : "Inativo",
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
  cellSigla: { width: "12%", padding: 5 },
  cellNome: { width: "20%", padding: 5 },
  cellCodigo: { width: "10%", padding: 5 },
  cellContador: { width: "7%", padding: 5 },
  cellFuso: { width: "18%", padding: 5 },
  cellData: { width: "16%", padding: 5 },
  cellStatus: { width: "10%", padding: 5 },
});
