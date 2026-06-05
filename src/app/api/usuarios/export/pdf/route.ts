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
import { listarUsuariosParaExportacao } from "@/modules/usuarios/infrastructure/repositories/usuario.repository";

export const runtime = "nodejs";

type UsuarioExportacao = Awaited<
  ReturnType<typeof listarUsuariosParaExportacao>
>[number];

export async function GET(request: Request) {
  const session = await auth();

  if (
    !session?.user?.perfilAtivo?.permissoes?.includes(
      "usuarios:gerenciar:global",
    )
  ) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const url = new URL(request.url);

  const usuarios = await listarUsuariosParaExportacao({
    busca: url.searchParams.get("busca") ?? "",
    matricula: url.searchParams.get("matricula") ?? "",
    nome: url.searchParams.get("nome") ?? "",
    email: url.searchParams.get("email") ?? "",
    tipo: url.searchParams.get("tipo") ?? "",
    lotacao: url.searchParams.get("lotacao") ?? "",
    perfil: url.searchParams.get("perfil") ?? "",
    status: url.searchParams.get("status") ?? "",
  });

  const documento = React.createElement(UsuariosPdfDocument, {
    usuarios,
  }) as ReactElement<DocumentProps>;

  const buffer = await renderToBuffer(documento);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="usuarios.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

function UsuariosPdfDocument({ usuarios }: { usuarios: UsuarioExportacao[] }) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      React.createElement(Text, { style: styles.title }, "Usuarios"),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Total de registros: ${usuarios.length}`,
      ),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: [styles.row, styles.header] },
          React.createElement(Text, { style: styles.cellMatricula }, "Login"),
          React.createElement(Text, { style: styles.cellNome }, "Nome"),
          React.createElement(Text, { style: styles.cellEmail }, "E-mail"),
          React.createElement(Text, { style: styles.cellTipo }, "Tipo"),
          React.createElement(Text, { style: styles.cellLotacao }, "Lotacao"),
          React.createElement(Text, { style: styles.cellPerfis }, "Perfis"),
          React.createElement(Text, { style: styles.cellStatus }, "Status"),
        ),
        ...usuarios.map((usuario) =>
          React.createElement(
            View,
            { key: usuario.id, style: styles.row },
            React.createElement(
              Text,
              { style: styles.cellMatricula },
              usuario.matricula,
            ),
            React.createElement(Text, { style: styles.cellNome }, usuario.nome),
            React.createElement(
              Text,
              { style: styles.cellEmail },
              usuario.email ?? "-",
            ),
            React.createElement(Text, { style: styles.cellTipo }, usuario.tipo),
            React.createElement(
              Text,
              { style: styles.cellLotacao },
              usuario.servidor?.lotacoes[0]?.unidade.sigla ?? "-",
            ),
            React.createElement(
              Text,
              { style: styles.cellPerfis },
              usuario.perfis.map((perfil) => perfil.perfil.codigo).join(", ") ||
                "-",
            ),
            React.createElement(
              Text,
              { style: styles.cellStatus },
              usuario.ativo ? "Ativo" : "Inativo",
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
    width: "12%",
    padding: 5,
  },
  cellNome: {
    width: "26%",
    padding: 5,
  },
  cellEmail: {
    width: "22%",
    padding: 5,
  },
  cellTipo: {
    width: "12%",
    padding: 5,
  },
  cellLotacao: {
    width: "10%",
    padding: 5,
  },
  cellPerfis: {
    width: "10%",
    padding: 5,
  },
  cellStatus: {
    width: "8%",
    padding: 5,
  },
});
