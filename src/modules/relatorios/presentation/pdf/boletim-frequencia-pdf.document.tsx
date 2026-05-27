import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles as s } from "./pdf-styles";
import {
  formatarDataHoraRelatorio,
  minutosParaHoraRelatorio,
} from "../../application/services/formatar-relatorio.service";

type BoletimPdfProps = {
  boletim: {
    unidade: {
      sigla: string;
      nome: string;
    };
    anoReferencia: number;
    mesReferencia: number;
    status: string;
    processoSei: string | null;
    numeroSei: string | null;
    totalServidores: number;
    totalHomologados: number;
    totalComRessalva: number;
    totalFaltas: number;
    totalCargaPrevistaMinutos: number;
    totalTrabalhadoMinutos: number;
    totalCreditoMinutos: number;
    totalDebitoMinutos: number;
    geradoEm: Date;
    encaminhadoEm: Date | null;
    servidores: {
      tipoResumo: string;
      cargaPrevistaMinutos: number;
      minutosTrabalhados: number;
      minutosCredito: number;
      minutosDebito: number;
      faltas: number;
      saldoBancoAntesMinutos: number;
      saldoBancoDepoisMinutos: number | null;
      observacaoChefia: string | null;
      servidor: {
        matricula: string;
        usuario: {
          nome: string;
        };
        lotacoes: {
          unidade: {
            sigla: string;
          };
        }[];
      };
    }[];
  };
};

export function BoletimFrequenciaPdfDocument({ boletim }: BoletimPdfProps) {
  return (
    <Document
      title={`Boletim de Frequência ${boletim.unidade.sigla} ${boletim.mesReferencia}/${boletim.anoReferencia}`}
      author="SECP"
      subject="Boletim de Frequência"
      creator="SECP"
      producer="SECP"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <Text style={s.orgao}>
            Justiça Federal — Seção Judiciária do Amazonas
          </Text>
          <Text style={s.title}>Boletim de Frequência Mensal</Text>
          <Text style={s.subtitle}>
            {boletim.unidade.sigla} — {boletim.unidade.nome} • Referência{" "}
            {String(boletim.mesReferencia).padStart(2, "0")}/
            {boletim.anoReferencia}
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Resumo geral</Text>

          <View style={s.row}>
            <View style={s.infoBox}>
              <Text style={s.label}>Status</Text>
              <Text style={s.value}>{boletim.status}</Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Servidores</Text>
              <Text style={s.value}>{boletim.totalServidores}</Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Homologados</Text>
              <Text style={s.value}>{boletim.totalHomologados}</Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Ressalvas</Text>
              <Text style={s.value}>{boletim.totalComRessalva}</Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Faltas</Text>
              <Text style={s.value}>{boletim.totalFaltas}</Text>
            </View>
          </View>

          <View style={s.row}>
            <View style={s.infoBox}>
              <Text style={s.label}>Carga prevista</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(boletim.totalCargaPrevistaMinutos)}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Trabalhado</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(boletim.totalTrabalhadoMinutos)}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Crédito</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(boletim.totalCreditoMinutos)}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Débito</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(boletim.totalDebitoMinutos)}
              </Text>
            </View>
          </View>

          <View style={s.row}>
            <View style={s.infoBox}>
              <Text style={s.label}>Processo SEI</Text>
              <Text style={s.value}>{boletim.processoSei ?? "-"}</Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Documento SEI</Text>
              <Text style={s.value}>{boletim.numeroSei ?? "-"}</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Servidores</Text>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: "22%" }]}>Servidor</Text>
              <Text style={[s.th, { width: "8%" }]}>Lotação</Text>
              <Text style={[s.th, { width: "10%" }]}>Resumo</Text>
              <Text style={[s.th, { width: "8%" }]}>Previsto</Text>
              <Text style={[s.th, { width: "8%" }]}>Trabalhado</Text>
              <Text style={[s.th, { width: "8%" }]}>Crédito</Text>
              <Text style={[s.th, { width: "8%" }]}>Débito</Text>
              <Text style={[s.th, { width: "6%" }]}>Faltas</Text>
              <Text style={[s.th, { width: "8%" }]}>Banco</Text>
              <Text style={[s.th, { width: "14%" }]}>Observação</Text>
            </View>

            {boletim.servidores.map((item) => (
              <View key={item.servidor.matricula} style={s.tableRow}>
                <Text style={[s.td, { width: "22%" }]}>
                  {item.servidor.matricula} — {item.servidor.usuario.nome}
                </Text>
                <Text style={[s.td, { width: "8%" }]}>
                  {item.servidor.lotacoes[0]?.unidade.sigla ?? "-"}
                </Text>
                <Text style={[s.td, { width: "10%" }]}>{item.tipoResumo}</Text>
                <Text style={[s.td, { width: "8%" }]}>
                  {minutosParaHoraRelatorio(item.cargaPrevistaMinutos)}
                </Text>
                <Text style={[s.td, { width: "8%" }]}>
                  {minutosParaHoraRelatorio(item.minutosTrabalhados)}
                </Text>
                <Text style={[s.td, { width: "8%" }]}>
                  {minutosParaHoraRelatorio(item.minutosCredito)}
                </Text>
                <Text style={[s.td, { width: "8%" }]}>
                  {minutosParaHoraRelatorio(item.minutosDebito)}
                </Text>
                <Text style={[s.td, { width: "6%" }]}>{item.faltas}</Text>
                <Text style={[s.td, { width: "8%" }]}>
                  {minutosParaHoraRelatorio(
                    item.saldoBancoDepoisMinutos ?? item.saldoBancoAntesMinutos,
                  )}
                </Text>
                <Text style={[s.td, { width: "14%" }]}>
                  {item.observacaoChefia ?? "-"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={s.footer}>
          Gerado pelo SECP em {formatarDataHoraRelatorio(new Date())}. Boletim
          gerado em {formatarDataHoraRelatorio(boletim.geradoEm)}.
        </Text>
      </Page>
    </Document>
  );
}
