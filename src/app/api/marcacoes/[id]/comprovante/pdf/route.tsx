import React, { type ReactElement } from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";

import { auth } from "@/auth";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

function formatarDataHora(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: "America/Manaus",
  }).format(data);
}

function MarcacaoComprovantePdfDocument({
  marcacao,
}: {
  marcacao: {
    id: string;
    dataHora: Date;
    tipo: string;
    fonte: string;
    status: string;
    ip: string | null;
    servidor: {
      matricula: string;
      usuario: {
        nome: string;
        email: string | null;
      };
      orgao: {
        sigla: string;
        nome: string;
      };
    };
    marcacoesBrutas: Array<{
      nsr: string | null;
      hashRegistro: string;
      origem: string;
      equipamentoCodigo: string | null;
    }>;
  };
}) {
  const bruta = marcacao.marcacoesBrutas[0];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.orgao}>SECP</Text>
          <Text style={styles.title}>Comprovante de Registro de Ponto</Text>
          <Text style={styles.subtitle}>{marcacao.servidor.orgao.nome}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Servidor</Text>
          <Text style={styles.value}>{marcacao.servidor.usuario.nome}</Text>
          <Text style={styles.muted}>Matrícula: {marcacao.servidor.matricula}</Text>
          <Text style={styles.muted}>
            Seccional: {marcacao.servidor.orgao.sigla}
          </Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.cell}>
            <Text style={styles.label}>Data e hora</Text>
            <Text style={styles.value}>{formatarDataHora(marcacao.dataHora)}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Tipo</Text>
            <Text style={styles.value}>{marcacao.tipo}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Fonte</Text>
            <Text style={styles.value}>{marcacao.fonte}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{marcacao.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Dados técnicos</Text>
          <Text style={styles.muted}>ID da marcação: {marcacao.id}</Text>
          <Text style={styles.muted}>NSR: {bruta?.nsr ?? "-"}</Text>
          <Text style={styles.muted}>
            Equipamento/origem: {bruta?.equipamentoCodigo ?? bruta?.origem ?? marcacao.fonte}
          </Text>
          <Text style={styles.hash}>Hash: {bruta?.hashRegistro ?? "-"}</Text>
          <Text style={styles.muted}>IP: {marcacao.ip ?? "-"}</Text>
        </View>

        <Text style={styles.footer}>
          Documento emitido eletronicamente pelo SECP. A autenticidade pode ser
          conferida pelos dados técnicos e hash do registro bruto.
        </Text>
      </Page>
    </Document>
  );
}

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const { id } = await params;
  const marcacao = await prisma.marcacao.findUnique({
    where: { id },
    include: {
      servidor: {
        include: {
          usuario: true,
          orgao: true,
        },
      },
      marcacoesBrutas: {
        orderBy: { criadoEm: "desc" },
        take: 1,
      },
    },
  });

  if (!marcacao || marcacao.servidor.usuarioId !== session.user.id) {
    return new Response("Marcação não encontrada.", { status: 404 });
  }

  const documento = React.createElement(MarcacaoComprovantePdfDocument, {
    marcacao,
  }) as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(documento);
  const nomeArquivo = `comprovante-ponto-${marcacao.servidor.matricula}-${marcacao.id}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    color: "#0f172a",
    fontFamily: "Helvetica",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 16,
    marginBottom: 20,
  },
  orgao: {
    color: "#1e3a8a",
    fontSize: 12,
    fontWeight: 700,
  },
  title: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: 700,
  },
  subtitle: {
    marginTop: 4,
    color: "#475569",
  },
  section: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
  },
  grid: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  cell: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 10,
  },
  label: {
    color: "#64748b",
    fontSize: 8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  value: {
    fontSize: 12,
    fontWeight: 700,
  },
  muted: {
    marginTop: 4,
    color: "#334155",
  },
  hash: {
    marginTop: 4,
    fontFamily: "Courier",
    fontSize: 8,
  },
  footer: {
    marginTop: 20,
    color: "#64748b",
    fontSize: 8,
    lineHeight: 1.4,
  },
});
