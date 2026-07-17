import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type {
  ContrachequeDados,
  ContrachequeRubrica,
} from "../../domain/contracheque.types";
import {
  formatarDataContracheque,
  formatarDataDocumentoContracheque,
  formatarDataHoraContracheque,
  formatarNumeroContracheque,
  rotuloCompetenciaContracheque,
} from "../../application/services/formatar-contracheque.service";

type ContrachequePdfDocumentProps = {
  contracheque: ContrachequeDados;
};

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 28,
    paddingVertical: 24,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#111827",
  },
  headerMeta: {
    fontSize: 7,
    color: "#4b5563",
    marginBottom: 8,
  },
  titleBlock: {
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 8,
    marginBottom: 10,
  },
  orgao: {
    fontSize: 9,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
  },
  semValor: {
    marginTop: 3,
    fontSize: 8,
    fontWeight: 700,
    color: "#991b1b",
    textAlign: "center",
  },
  section: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginBottom: 8,
  },
  sectionHeader: {
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 8,
    fontWeight: 700,
  },
  grid: {
    padding: 6,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 3,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 6,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 1,
  },
  value: {
    fontSize: 8,
    fontWeight: 700,
  },
  table: {
    borderWidth: 1,
    borderColor: "#9ca3af",
    marginTop: 4,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    minHeight: 18,
  },
  th: {
    backgroundColor: "#f3f4f6",
    fontWeight: 700,
    fontSize: 7,
    padding: 4,
  },
  td: {
    padding: 4,
    fontSize: 7,
  },
  rubrica: {
    width: 52,
  },
  descricao: {
    flex: 1,
  },
  seq: {
    width: 42,
    textAlign: "center",
  },
  tipo: {
    width: 28,
    textAlign: "center",
  },
  prazo: {
    width: 34,
    textAlign: "center",
  },
  valor: {
    width: 64,
    textAlign: "right",
  },
  totals: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#9ca3af",
    marginTop: 10,
  },
  totalBox: {
    flex: 1,
    padding: 7,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
  },
  totalLast: {
    flex: 1,
    padding: 7,
  },
  totalLabel: {
    fontSize: 7,
    color: "#6b7280",
    fontWeight: 700,
    textTransform: "uppercase",
  },
  totalValue: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: 700,
  },
  footer: {
    marginTop: 10,
    fontSize: 7,
    color: "#4b5563",
    lineHeight: 1.4,
  },
});

function TextoCampo({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.col}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "-"}</Text>
    </View>
  );
}

function rubricaEhTotalizador(rubrica: ContrachequeRubrica) {
  return rubrica.tipo === "E";
}

export function ContrachequePdfDocument({
  contracheque,
}: ContrachequePdfDocumentProps) {
  const rubricas = contracheque.rubricas.filter(
    (rubrica) => !rubricaEhTotalizador(rubrica),
  );

  return (
    <Document
      title={`Contracheque ${contracheque.cabecalho.codiserv} ${contracheque.competencia}`}
      subject="Demonstrativo de Pagamento"
      author="SECP"
      creator="SECP"
      producer="SECP"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.headerMeta}>
          Emitido pelo SECP em{" "}
          {formatarDataHoraContracheque(contracheque.consultadoEm)}
        </Text>

        <View style={styles.titleBlock}>
          <Text style={styles.orgao}>PODER JUDICIÁRIO</Text>
          <Text style={styles.orgao}>
            Tribunal Regional Federal da 1ª Região
          </Text>
          <Text style={styles.title}>Demonstrativo de Pagamento</Text>
          <Text style={styles.semValor}>NÃO TEM VALOR LEGAL</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>
            Pagamento referente a{" "}
            {rotuloCompetenciaContracheque(contracheque.competencia)} -{" "}
            {formatarDataDocumentoContracheque(
              contracheque.documento.chaveFolha,
            )}
          </Text>
          <View style={styles.grid}>
            <View style={styles.row}>
              <TextoCampo
                label="Servidor"
                value={`${contracheque.cabecalho.nome} (${contracheque.cabecalho.codiserv})`}
              />
              <TextoCampo label="CPF" value={contracheque.cabecalho.cpf} />
            </View>
            <View style={styles.row}>
              <TextoCampo label="Cargo" value={contracheque.cabecalho.cargo} />
            </View>
            <View style={styles.row}>
              <TextoCampo label="Função" value={contracheque.cabecalho.funcao} />
              <TextoCampo
                label="Exercício"
                value={formatarDataContracheque(contracheque.cabecalho.exercicio)}
              />
            </View>
            <View style={styles.row}>
              <TextoCampo
                label="Lotação"
                value={contracheque.cabecalho.lotacao}
              />
            </View>
            <View style={styles.row}>
              <TextoCampo
                label="Referência"
                value={contracheque.cabecalho.referencia}
              />
              <TextoCampo
                label="Anuênio"
                value={String(contracheque.cabecalho.anuenio ?? 0)}
              />
              <TextoCampo
                label="Dep. SF"
                value={String(
                  contracheque.cabecalho.dependentesSalarioFamilia ?? 0,
                )}
              />
              <TextoCampo
                label="Dep. IR"
                value={String(contracheque.cabecalho.dependentesIr ?? 0)}
              />
            </View>
            <View style={styles.row}>
              <TextoCampo
                label="Margem consignável"
                value={
                  contracheque.margemConsignavel === null
                    ? "-"
                    : formatarNumeroContracheque(
                        contracheque.margemConsignavel,
                      )
                }
              />
              <TextoCampo
                label="Banco"
                value={
                  contracheque.cabecalho.banco
                    ? String(contracheque.cabecalho.banco)
                    : "-"
                }
              />
              <TextoCampo
                label="Agencia"
                value={contracheque.cabecalho.agencia}
              />
              <TextoCampo label="Conta" value={contracheque.cabecalho.conta} />
            </View>
            <View style={styles.row}>
              <TextoCampo
                label="Contracheque"
                value={contracheque.cabecalho.descricao}
              />
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.th, styles.rubrica]}>Rubrica</Text>
            <Text style={[styles.th, styles.descricao]}>Descrição</Text>
            <Text style={[styles.th, styles.seq]}>Sequência</Text>
            <Text style={[styles.th, styles.tipo]}>Tipo</Text>
            <Text style={[styles.th, styles.prazo]}>Prazo</Text>
            <Text style={[styles.th, styles.valor]}>Valor</Text>
          </View>
          {rubricas.map((rubrica) => (
            <View
              key={`${rubrica.codigo}-${rubrica.tipo}-${rubrica.sequencial}`}
              style={styles.tr}
            >
              <Text style={[styles.td, styles.rubrica]}>{rubrica.codigo}</Text>
              <Text style={[styles.td, styles.descricao]}>
                {rubrica.descricao}
              </Text>
              <Text style={[styles.td, styles.seq]}>{rubrica.sequencial}</Text>
              <Text style={[styles.td, styles.tipo]}>{rubrica.tipo}</Text>
              <Text style={[styles.td, styles.prazo]}>
                {rubrica.prazo ?? "-"}
              </Text>
              <Text style={[styles.td, styles.valor]}>
                {formatarNumeroContracheque(rubrica.valor)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Bruto</Text>
            <Text style={styles.totalValue}>
              {formatarNumeroContracheque(contracheque.totais.bruto)}
            </Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Descontos</Text>
            <Text style={styles.totalValue}>
              {formatarNumeroContracheque(contracheque.totais.descontos)}
            </Text>
          </View>
          <View style={styles.totalLast}>
            <Text style={styles.totalLabel}>Líquido</Text>
            <Text style={styles.totalValue}>
              {formatarNumeroContracheque(contracheque.totais.liquido)}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Dados consultados diretamente no SARH. O SECP não armazena informações
          do contracheque. Documento emitido para conferência do próprio servidor.
        </Text>
      </Page>
    </Document>
  );
}
