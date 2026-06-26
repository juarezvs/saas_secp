import { Document, Page, Text, View } from "@react-pdf/renderer";

import type { LinhaLotacaoComChefia } from "../../infrastructure/repositories/relatorios-gerenciais.repository";
import { pdfStyles as s } from "./pdf-styles";

type LotacoesChefiasPdfDocumentProps = {
  linhas: LinhaLotacaoComChefia[];
};

export function LotacoesChefiasPdfDocument({
  linhas,
}: LotacoesChefiasPdfDocumentProps) {
  return (
    <Document
      title="Relatorio de Lotacoes com Chefias"
      author="SECP"
      subject="Lotacoes com chefias registradas"
      creator="SECP"
      producer="SECP"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <Text style={s.orgao}>
            Justica Federal - Secao Judiciaria do Amazonas
          </Text>
          <Text style={s.title}>Relatorio de Lotacoes com Chefias</Text>
          <Text style={s.subtitle}>
            Unidades ativas com chefia ou substituto ativo registrado.
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Resumo</Text>
          <View style={s.row}>
            <View style={s.infoBox}>
              <Text style={s.label}>Lotacoes com chefia</Text>
              <Text style={s.value}>{linhas.length}</Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Servidores lotados</Text>
              <Text style={s.value}>
                {linhas.reduce(
                  (total, linha) => total + linha.quantidadeServidores,
                  0,
                )}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Detalhamento</Text>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: "8%" }]}>Orgao</Text>
              <Text style={[s.th, { width: "10%" }]}>Sigla</Text>
              <Text style={[s.th, { width: "22%" }]}>Lotacao</Text>
              <Text style={[s.th, { width: "20%" }]}>Unidade superior</Text>
              <Text style={[s.th, { width: "8%" }]}>Serv.</Text>
              <Text style={[s.th, { width: "8%" }]}>Filhas</Text>
              <Text style={[s.th, { width: "24%" }]}>Chefias</Text>
            </View>

            {linhas.map((linha) => (
              <View key={linha.id} style={s.tableRow}>
                <Text style={[s.td, { width: "8%" }]}>{linha.orgao}</Text>
                <Text style={[s.td, { width: "10%" }]}>{linha.sigla}</Text>
                <Text style={[s.td, { width: "22%" }]}>{linha.nome}</Text>
                <Text style={[s.td, { width: "20%" }]}>
                  {linha.unidadePai}
                </Text>
                <Text style={[s.td, { width: "8%" }]}>
                  {linha.quantidadeServidores}
                </Text>
                <Text style={[s.td, { width: "8%" }]}>
                  {linha.quantidadeUnidadesFilhas}
                </Text>
                <Text style={[s.td, { width: "24%" }]}>{linha.chefias}</Text>
              </View>
            ))}

            {linhas.length === 0 && (
              <View style={s.tableRow}>
                <Text style={[s.td, { width: "100%" }]}>
                  Nenhuma lotacao com chefia ativa foi encontrada para o escopo
                  permitido.
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={s.footer}>
          Gerado pelo SECP em {new Date().toLocaleString("pt-BR")}.
        </Text>
      </Page>
    </Document>
  );
}
