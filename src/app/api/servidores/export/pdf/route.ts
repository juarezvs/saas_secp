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
import { listarServidoresParaExportacao } from "@/modules/servidores/infrastructure/repositories/servidor.repository";

export const runtime = "nodejs";

type ServidorExportacao = Awaited<
  ReturnType<typeof listarServidoresParaExportacao>
>[number];

export async function GET(request: Request) {
  const session = await auth();

  if (
    !session?.user?.perfilAtivo?.permissoes?.includes(
      "servidores:consultar:global",
    ) &&
    !session?.user?.perfilAtivo?.permissoes?.includes(
      "servidores:gerenciar:global",
    )
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);

  const servidores = await listarServidoresParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    matricula: url.searchParams.get("matricula") ?? "",
    cpf: url.searchParams.get("cpf") ?? "",
    nome: url.searchParams.get("nome") ?? "",
    orgaoId: url.searchParams.get("orgaoId") ?? "",
    vinculo: url.searchParams.get("vinculo") ?? "",
    lotacao: url.searchParams.get("lotacao") ?? "",
    status: url.searchParams.get("status") ?? "",
  });

  const documento = React.createElement(ServidoresPdfDocument, {
    servidores,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="servidores.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

function ServidoresPdfDocument({
  servidores,
}: {
  servidores: ServidorExportacao[];
}) {
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
      React.createElement(Text, { style: styles.title }, "Servidores"),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Total de registros: ${servidores.length}`,
      ),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: [styles.row, styles.header] },
          React.createElement(
            Text,
            { style: styles.cellMatricula },
            "Matrícula",
          ),
          React.createElement(Text, { style: styles.cellCpf }, "CPF"),
          React.createElement(Text, { style: styles.cellNome }, "Nome"),
          React.createElement(Text, { style: styles.cellOrgao }, "Órgão"),
          React.createElement(Text, { style: styles.cellVinculo }, "Vínculo"),
          React.createElement(Text, { style: styles.cellLotacao }, "Lotação"),
          React.createElement(Text, { style: styles.cellStatus }, "Status"),
        ),
        ...servidores.map((servidor) =>
          React.createElement(
            View,
            {
              key: servidor.id,
              style: styles.row,
            },
            React.createElement(
              Text,
              { style: styles.cellMatricula },
              servidor.matricula,
            ),
            React.createElement(
              Text,
              { style: styles.cellCpf },
              servidor.cpf ?? servidor.usuario.cpf ?? "-",
            ),
            React.createElement(
              Text,
              { style: styles.cellNome },
              servidor.usuario.nome,
            ),
            React.createElement(
              Text,
              { style: styles.cellOrgao },
              servidor.orgao.sigla,
            ),
            React.createElement(
              Text,
              { style: styles.cellVinculo },
              servidor.vinculo,
            ),
            React.createElement(
              Text,
              { style: styles.cellLotacao },
              servidor.lotacoes[0]?.unidade.sigla ?? "-",
            ),
            React.createElement(
              Text,
              { style: styles.cellStatus },
              servidor.ativo ? "Ativo" : "Inativo",
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
  cellMatricula: {
    width: "11%",
    padding: 5,
  },
  cellCpf: {
    width: "13%",
    padding: 5,
  },
  cellNome: {
    width: "34%",
    padding: 5,
  },
  cellOrgao: {
    width: "8%",
    padding: 5,
  },
  cellVinculo: {
    width: "14%",
    padding: 5,
  },
  cellLotacao: {
    width: "10%",
    padding: 5,
  },
  cellStatus: {
    width: "10%",
    padding: 5,
  },
});
