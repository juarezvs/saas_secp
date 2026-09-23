import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { DadosAcompanhamentoEstagio } from "../../application/services/acompanhamento-estagio.service";
import { formatarMinutosEstagio } from "../../application/services/acompanhamento-estagio.service";

type Props = {
  dados: DadosAcompanhamentoEstagio;
};

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  title: {
    borderWidth: 1,
    borderColor: "#111827",
    padding: 6,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "bold",
  },
  headerGrid: {
    marginTop: 8,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "#111827",
  },
  headerRow: {
    flexDirection: "row",
  },
  headerCell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#111827",
    padding: 4,
  },
  label: {
    fontSize: 6,
    color: "#374151",
    textTransform: "uppercase",
  },
  value: {
    marginTop: 2,
    fontSize: 8,
  },
  table: {
    marginTop: 8,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "#111827",
  },
  tr: {
    flexDirection: "row",
    minHeight: 16,
  },
  th: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#111827",
    padding: 3,
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
  },
  td: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#111827",
    padding: 3,
  },
  data: {
    width: "8%",
    textAlign: "center",
  },
  atividade: {
    width: "80%",
  },
  horas: {
    width: "12%",
    textAlign: "center",
  },
  footer: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  signatureBox: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#111827",
    padding: 5,
    justifyContent: "flex-end",
    textAlign: "center",
  },
  auth: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#9ca3af",
    padding: 5,
    fontSize: 7,
    color: "#374151",
  },
  draftStamp: {
    position: "absolute",
    top: 28,
    right: -36,
    width: 150,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#b91c1c",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    transform: "rotate(35deg)",
  },
});

export function AcompanhamentoEstagioPdfDocument({ dados }: Props) {
  const linhas = montarLinhasFormulario(dados);
  const totalMinutos = dados.linhas.reduce(
    (total, linha) => total + linha.minutosRegistrados,
    0,
  );
  const assinatura = dados.acompanhamento.assinatura;
  const assinaturaSupervisor = dados.acompanhamento.assinaturaSupervisor;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {dados.acompanhamento.status !== "FECHADO" ? (
          <Text fixed style={styles.draftStamp}>
            RASCUNHO
          </Text>
        ) : null}

        <Text style={styles.title}>ACOMPANHAMENTO MENSAL DE ESTAGIO</Text>

        <View style={styles.headerGrid}>
          <View style={styles.headerRow}>
            <CampoCabecalho label="Nome" value={dados.servidor.nome} flex={2} />
            <CampoCabecalho label="Matricula" value={dados.servidor.matricula} />
            <CampoCabecalho label="Lotacao" value={dados.servidor.lotacao} />
          </View>
          <View style={styles.headerRow}>
            <CampoCabecalho label="Mes/Ano" value={dados.competencia.label} />
            <CampoCabecalho label="Curso" value={dados.acompanhamento.curso} />
            <CampoCabecalho
              label="Supervisor"
              value={dados.acompanhamento.supervisor}
              flex={2}
            />
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.th, styles.data]}>DATA</Text>
            <Text style={[styles.th, styles.atividade]}>
              ATIVIDADES DESENVOLVIDAS
            </Text>
            <Text style={[styles.th, styles.horas]}>N. DE HORAS</Text>
          </View>
          {linhas.map((linha) => (
            <View key={linha.dia} style={styles.tr}>
              <Text style={[styles.td, styles.data]}>
                {String(linha.dia).padStart(2, "0")}
              </Text>
              <Text style={[styles.td, styles.atividade]}>{linha.atividade}</Text>
              <Text style={[styles.td, styles.horas]}>{linha.horas}</Text>
            </View>
          ))}
          <View style={styles.tr}>
            <Text style={[styles.td, styles.data]} />
            <Text
              style={[styles.td, styles.atividade, { fontWeight: "bold" }]}
            >
              TOTAL DE HORAS
            </Text>
            <Text style={[styles.td, styles.horas, { fontWeight: "bold" }]}>
              {formatarMinutosEstagio(totalMinutos)}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.signatureBox}>
            <Text>
              {assinatura
                ? `Assinado eletronicamente por ${assinatura.nome}`
                : "Assinatura do estagiario"}
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <Text>
              {assinaturaSupervisor
                ? `Assinado eletronicamente por ${assinaturaSupervisor.nome}`
                : "Assinatura do supervisor"}
            </Text>
          </View>
        </View>

        {assinatura ? (
          <Text style={styles.auth}>
            Estagiario: assinado eletronicamente por {assinatura.nome},
            matricula {assinatura.matricula}, em{" "}
            {formatarAssinaturaData(assinatura.assinadoEm)}.
            {assinaturaSupervisor
              ? ` Supervisor: assinado eletronicamente por ${assinaturaSupervisor.nome}, matricula ${assinaturaSupervisor.matricula}, em ${formatarAssinaturaData(
                  assinaturaSupervisor.assinadoEm,
                )}.`
              : ""}
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}

function formatarAssinaturaData(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Manaus",
  }).format(new Date(valor));
}

function CampoCabecalho({
  label,
  value,
  flex = 1,
}: {
  label: string;
  value: string;
  flex?: number;
}) {
  return (
    <View style={[styles.headerCell, { flex }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "-"}</Text>
    </View>
  );
}

function montarLinhasFormulario(dados: DadosAcompanhamentoEstagio) {
  const mapa = new Map(dados.linhas.map((linha) => [linha.dia, linha]));
  const ultimoDia = new Date(
    Date.UTC(dados.competencia.ano, dados.competencia.mes, 0),
  ).getUTCDate();

  return Array.from({ length: 31 }, (_, indice) => {
    const dia = indice + 1;
    const linha = dia <= ultimoDia ? mapa.get(dia) : undefined;

    return {
      dia,
      atividade: linha?.atividades ?? "",
      horas: linha ? linha.horasLabel : "",
    };
  });
}
