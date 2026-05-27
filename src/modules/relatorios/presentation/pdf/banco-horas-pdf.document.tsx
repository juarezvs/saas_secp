import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles as s } from "./pdf-styles";
import {
  formatarDataRelatorio,
  minutosParaHoraRelatorio,
} from "../../application/services/formatar-relatorio.service";

type BancoHorasPdfProps = {
  dados: {
    servidor: {
      matricula: string;
      usuario: {
        nome: string;
      };
      bancoHorasSaldo: {
        saldoMinutos: number;
        creditosValidadosMinutos: number;
        debitosValidadosMinutos: number;
        creditosPendentesMinutos: number;
        debitosPendentesMinutos: number;
        horasAcimaLimiteMinutos: number;
      } | null;
      lotacoes: {
        unidade: {
          sigla: string;
          nome: string;
        };
      }[];
    } | null;
    movimentos: {
      id: string;
      dataReferencia: Date;
      tipo: string;
      origem: string;
      status: string;
      minutos: number;
      descricao: string | null;
      expiraEm: Date | null;
    }[];
    ano: number | null;
    mes: number | null;
  };
};

export function BancoHorasPdfDocument({ dados }: BancoHorasPdfProps) {
  const servidor = dados.servidor;
  const saldo = servidor?.bancoHorasSaldo;

  return (
    <Document
      title={`Banco de Horas ${servidor?.matricula ?? ""}`}
      author="SECP"
      subject="Banco de Horas"
      creator="SECP"
      producer="SECP"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <Text style={s.orgao}>
            Justiça Federal — Seção Judiciária do Amazonas
          </Text>
          <Text style={s.title}>Relatório de Banco de Horas</Text>
          <Text style={s.subtitle}>
            {dados.mes && dados.ano
              ? `Referência ${String(dados.mes).padStart(2, "0")}/${dados.ano}`
              : "Histórico completo"}
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Servidor</Text>

          <View style={s.row}>
            <View style={s.infoBox}>
              <Text style={s.label}>Matrícula</Text>
              <Text style={s.value}>{servidor?.matricula ?? "-"}</Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Nome</Text>
              <Text style={s.value}>{servidor?.usuario.nome ?? "-"}</Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Lotação</Text>
              <Text style={s.value}>
                {servidor?.lotacoes[0]
                  ? `${servidor.lotacoes[0].unidade.sigla} — ${servidor.lotacoes[0].unidade.nome}`
                  : "-"}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Saldo consolidado</Text>

          <View style={s.row}>
            <View style={s.infoBox}>
              <Text style={s.label}>Saldo atual</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(saldo?.saldoMinutos ?? 0)}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Créditos validados</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(saldo?.creditosValidadosMinutos ?? 0)}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Débitos validados</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(saldo?.debitosValidadosMinutos ?? 0)}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Créditos pendentes</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(saldo?.creditosPendentesMinutos ?? 0)}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Débitos pendentes</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(saldo?.debitosPendentesMinutos ?? 0)}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Movimentos</Text>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: "10%" }]}>Data</Text>
              <Text style={[s.th, { width: "14%" }]}>Tipo</Text>
              <Text style={[s.th, { width: "14%" }]}>Origem</Text>
              <Text style={[s.th, { width: "10%" }]}>Status</Text>
              <Text style={[s.th, { width: "10%" }]}>Horas</Text>
              <Text style={[s.th, { width: "10%" }]}>Expiração</Text>
              <Text style={[s.th, { width: "32%" }]}>Descrição</Text>
            </View>

            {dados.movimentos.map((item) => (
              <View key={item.id} style={s.tableRow}>
                <Text style={[s.td, { width: "10%" }]}>
                  {formatarDataRelatorio(item.dataReferencia)}
                </Text>
                <Text style={[s.td, { width: "14%" }]}>{item.tipo}</Text>
                <Text style={[s.td, { width: "14%" }]}>{item.origem}</Text>
                <Text style={[s.td, { width: "10%" }]}>{item.status}</Text>
                <Text style={[s.td, { width: "10%" }]}>
                  {minutosParaHoraRelatorio(item.minutos)}
                </Text>
                <Text style={[s.td, { width: "10%" }]}>
                  {formatarDataRelatorio(item.expiraEm)}
                </Text>
                <Text style={[s.td, { width: "32%" }]}>
                  {item.descricao ?? "-"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={s.footer}>
          Gerado pelo SECP em {new Date().toLocaleString("pt-BR")}.
        </Text>
      </Page>
    </Document>
  );
}
