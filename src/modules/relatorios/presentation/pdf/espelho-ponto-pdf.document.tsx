import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles as s } from "./pdf-styles";
import {
  formatarDataRelatorio,
  minutosParaHoraRelatorio,
  nomeMesReferencia,
} from "../../application/services/formatar-relatorio.service";

type EspelhoPontoPdfProps = {
  dados: {
    servidor: {
      matricula: string;
      usuario: {
        nome: string;
      };
      lotacoes: {
        unidade: {
          sigla: string;
          nome: string;
        };
      }[];
      jornadas: {
        jornada: {
          codigo: string;
          nome: string;
        };
      }[];
    } | null;
    apuracoes: {
      id: string;
      dataReferencia: Date;
      cargaPrevistaMinutos: number;
      minutosTrabalhados: number;
      minutosIntervalo: number;
      minutosCredito: number;
      minutosDebito: number;
      resultado: string;
      status: string;
    }[];
    ano: number;
    mes: number;
  };
};

export function EspelhoPontoPdfDocument({ dados }: EspelhoPontoPdfProps) {
  const servidor = dados.servidor;

  const totais = dados.apuracoes.reduce(
    (acc, item) => {
      acc.previsto += item.cargaPrevistaMinutos;
      acc.trabalhado += item.minutosTrabalhados;
      acc.credito += item.minutosCredito;
      acc.debito += item.minutosDebito;
      return acc;
    },
    {
      previsto: 0,
      trabalhado: 0,
      credito: 0,
      debito: 0,
    },
  );

  return (
    <Document
      title={`Espelho de Ponto ${servidor?.matricula ?? ""}`}
      author="SECP"
      subject="Espelho de Ponto"
      creator="SECP"
      producer="SECP"
    >
      <Page size="A4" orientation="portrait" style={s.page}>
        <View style={s.header}>
          <Text style={s.orgao}>
            Justiça Federal — Seção Judiciária do Amazonas
          </Text>
          <Text style={s.title}>Espelho de Ponto</Text>
          <Text style={s.subtitle}>
            {nomeMesReferencia(dados.mes)}/{dados.ano}
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
          </View>

          <View style={s.row}>
            <View style={s.infoBox}>
              <Text style={s.label}>Lotação</Text>
              <Text style={s.value}>
                {servidor?.lotacoes[0]
                  ? `${servidor.lotacoes[0].unidade.sigla} — ${servidor.lotacoes[0].unidade.nome}`
                  : "-"}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Jornada</Text>
              <Text style={s.value}>
                {servidor?.jornadas[0]
                  ? `${servidor.jornadas[0].jornada.codigo} — ${servidor.jornadas[0].jornada.nome}`
                  : "-"}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Totais</Text>

          <View style={s.row}>
            <View style={s.infoBox}>
              <Text style={s.label}>Previsto</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(totais.previsto)}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Trabalhado</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(totais.trabalhado)}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Crédito</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(totais.credito)}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Débito</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(totais.debito)}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Apurações diárias</Text>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: "14%" }]}>Data</Text>
              <Text style={[s.th, { width: "13%" }]}>Previsto</Text>
              <Text style={[s.th, { width: "13%" }]}>Trabalhado</Text>
              <Text style={[s.th, { width: "13%" }]}>Intervalo</Text>
              <Text style={[s.th, { width: "13%" }]}>Crédito</Text>
              <Text style={[s.th, { width: "13%" }]}>Débito</Text>
              <Text style={[s.th, { width: "11%" }]}>Resultado</Text>
              <Text style={[s.th, { width: "10%" }]}>Status</Text>
            </View>

            {dados.apuracoes.map((item) => (
              <View key={item.id} style={s.tableRow}>
                <Text style={[s.td, { width: "14%" }]}>
                  {formatarDataRelatorio(item.dataReferencia)}
                </Text>
                <Text style={[s.td, { width: "13%" }]}>
                  {minutosParaHoraRelatorio(item.cargaPrevistaMinutos)}
                </Text>
                <Text style={[s.td, { width: "13%" }]}>
                  {minutosParaHoraRelatorio(item.minutosTrabalhados)}
                </Text>
                <Text style={[s.td, { width: "13%" }]}>
                  {minutosParaHoraRelatorio(item.minutosIntervalo)}
                </Text>
                <Text style={[s.td, { width: "13%" }]}>
                  {minutosParaHoraRelatorio(item.minutosCredito)}
                </Text>
                <Text style={[s.td, { width: "13%" }]}>
                  {minutosParaHoraRelatorio(item.minutosDebito)}
                </Text>
                <Text style={[s.td, { width: "11%" }]}>{item.resultado}</Text>
                <Text style={[s.td, { width: "10%" }]}>{item.status}</Text>
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
