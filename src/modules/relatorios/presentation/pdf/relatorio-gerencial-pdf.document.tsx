import { Document, Page, Text, View } from "@react-pdf/renderer";

import type {
  DadosRelatorioGerencial,
  LinhaRelatorioGerencial,
  TipoRelatorioGerencial,
} from "../../infrastructure/repositories/relatorios-gerenciais.repository";
import {
  minutosParaHoraRelatorio,
  nomeMesReferencia,
} from "../../application/services/formatar-relatorio.service";
import { pdfStyles as s } from "./pdf-styles";

type RelatorioGerencialPdfProps = {
  dados: DadosRelatorioGerencial;
};

const metadados: Record<
  TipoRelatorioGerencial,
  { titulo: string; assunto: string; descricao: string }
> = {
  HORAS_EXTRAS_BANCO_HORAS: {
    titulo: "Relatorio de Horas Extras e Banco de Horas",
    assunto: "Horas extras e banco de horas",
    descricao:
      "Creditos, debitos e saldo consolidado para apoio a pagamento e folgas compensatorias.",
  },
  ABSENTEISMO: {
    titulo: "Relatorio de Absenteismo",
    assunto: "Faltas, atrasos e saidas antecipadas",
    descricao:
      "Ausencias, dias com debito e inconsistencias de frequencia no periodo.",
  },
  JORNADA_TRABALHADA: {
    titulo: "Relatorio de Jornada Trabalhada",
    assunto: "Jornada trabalhada",
    descricao:
      "Carga prevista, tempo efetivamente trabalhado e percentual de realizacao.",
  },
};

function percentualRealizado(linha: LinhaRelatorioGerencial) {
  if (linha.cargaPrevistaMinutos <= 0) {
    return "-";
  }

  const percentual =
    (linha.minutosTrabalhados / linha.cargaPrevistaMinutos) * 100;

  return `${percentual.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })}%`;
}

function textoEscopo(escopo: DadosRelatorioGerencial["escopo"]) {
  const labels = {
    proprio: "Servidor logado",
    chefia: "Equipe e unidades subordinadas",
    global: "Todos os servidores",
  };

  return labels[escopo];
}

export function RelatorioGerencialPdfDocument({
  dados,
}: RelatorioGerencialPdfProps) {
  const meta = metadados[dados.tipo];

  return (
    <Document
      title={`${meta.titulo} ${String(dados.mes).padStart(2, "0")}/${dados.ano}`}
      author="SECP"
      subject={meta.assunto}
      creator="SECP"
      producer="SECP"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <Text style={s.orgao}>
            Justica Federal - Secao Judiciaria do Amazonas
          </Text>
          <Text style={s.title}>{meta.titulo}</Text>
          <Text style={s.subtitle}>
            {nomeMesReferencia(dados.mes)} de {dados.ano} | Escopo:{" "}
            {textoEscopo(dados.escopo)}
          </Text>
          <Text style={s.subtitle}>{meta.descricao}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Resumo</Text>

          <View style={s.row}>
            <View style={s.infoBox}>
              <Text style={s.label}>Servidores</Text>
              <Text style={s.value}>{dados.linhas.length}</Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Horas trabalhadas</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(
                  dados.linhas.reduce(
                    (total, linha) => total + linha.minutosTrabalhados,
                    0,
                  ),
                )}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Creditos</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(
                  dados.linhas.reduce(
                    (total, linha) => total + linha.minutosCredito,
                    0,
                  ),
                )}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Debitos</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(
                  dados.linhas.reduce(
                    (total, linha) => total + linha.minutosDebito,
                    0,
                  ),
                )}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Detalhamento por servidor</Text>

          <View style={s.table}>
            <View style={s.tableHeader}>{renderHeader(dados.tipo)}</View>

            {dados.linhas.map((linha) => (
              <View key={linha.id} style={s.tableRow}>
                {renderLinha(dados.tipo, linha)}
              </View>
            ))}

            {dados.linhas.length === 0 && (
              <View style={s.tableRow}>
                <Text style={[s.td, { width: "100%" }]}>
                  Nenhum registro encontrado para o escopo e competencia
                  informados.
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

function renderHeader(tipo: TipoRelatorioGerencial) {
  if (tipo === "HORAS_EXTRAS_BANCO_HORAS") {
    return (
      <>
        <Text style={[s.th, { width: "10%" }]}>Matricula</Text>
        <Text style={[s.th, { width: "22%" }]}>Servidor</Text>
        <Text style={[s.th, { width: "26%" }]}>Unidade</Text>
        <Text style={[s.th, { width: "10%" }]}>Creditos</Text>
        <Text style={[s.th, { width: "10%" }]}>Debitos</Text>
        <Text style={[s.th, { width: "11%" }]}>Saldo atual</Text>
        <Text style={[s.th, { width: "11%" }]}>Acima limite</Text>
      </>
    );
  }

  if (tipo === "ABSENTEISMO") {
    return (
      <>
        <Text style={[s.th, { width: "10%" }]}>Matricula</Text>
        <Text style={[s.th, { width: "24%" }]}>Servidor</Text>
        <Text style={[s.th, { width: "28%" }]}>Unidade</Text>
        <Text style={[s.th, { width: "9%" }]}>Faltas</Text>
        <Text style={[s.th, { width: "12%" }]}>Dias debito</Text>
        <Text style={[s.th, { width: "9%" }]}>Debitos</Text>
        <Text style={[s.th, { width: "8%" }]}>Alertas</Text>
      </>
    );
  }

  return (
    <>
      <Text style={[s.th, { width: "10%" }]}>Matricula</Text>
      <Text style={[s.th, { width: "24%" }]}>Servidor</Text>
      <Text style={[s.th, { width: "26%" }]}>Unidade</Text>
      <Text style={[s.th, { width: "10%" }]}>Previsto</Text>
      <Text style={[s.th, { width: "10%" }]}>Trabalhado</Text>
      <Text style={[s.th, { width: "10%" }]}>Dias trab.</Text>
      <Text style={[s.th, { width: "10%" }]}>Realizado</Text>
    </>
  );
}

function renderLinha(tipo: TipoRelatorioGerencial, linha: LinhaRelatorioGerencial) {
  if (tipo === "HORAS_EXTRAS_BANCO_HORAS") {
    const acimaLimite = Math.max(0, linha.minutosCredito - linha.minutosDebito);

    return (
      <>
        <Text style={[s.td, { width: "10%" }]}>{linha.matricula}</Text>
        <Text style={[s.td, { width: "22%" }]}>{linha.nome}</Text>
        <Text style={[s.td, { width: "26%" }]}>{linha.unidade}</Text>
        <Text style={[s.td, { width: "10%" }]}>
          {minutosParaHoraRelatorio(linha.minutosCredito)}
        </Text>
        <Text style={[s.td, { width: "10%" }]}>
          {minutosParaHoraRelatorio(linha.minutosDebito)}
        </Text>
        <Text style={[s.td, { width: "11%" }]}>
          {minutosParaHoraRelatorio(linha.saldoBancoHorasMinutos)}
        </Text>
        <Text style={[s.td, { width: "11%" }]}>
          {minutosParaHoraRelatorio(acimaLimite)}
        </Text>
      </>
    );
  }

  if (tipo === "ABSENTEISMO") {
    return (
      <>
        <Text style={[s.td, { width: "10%" }]}>{linha.matricula}</Text>
        <Text style={[s.td, { width: "24%" }]}>{linha.nome}</Text>
        <Text style={[s.td, { width: "28%" }]}>{linha.unidade}</Text>
        <Text style={[s.td, { width: "9%" }]}>{linha.faltas}</Text>
        <Text style={[s.td, { width: "12%" }]}>
          {linha.diasComAtrasoOuSaidaAntecipada}
        </Text>
        <Text style={[s.td, { width: "9%" }]}>
          {minutosParaHoraRelatorio(linha.minutosDebito)}
        </Text>
        <Text style={[s.td, { width: "8%" }]}>{linha.inconsistencias}</Text>
      </>
    );
  }

  return (
    <>
      <Text style={[s.td, { width: "10%" }]}>{linha.matricula}</Text>
      <Text style={[s.td, { width: "24%" }]}>{linha.nome}</Text>
      <Text style={[s.td, { width: "26%" }]}>{linha.unidade}</Text>
      <Text style={[s.td, { width: "10%" }]}>
        {minutosParaHoraRelatorio(linha.cargaPrevistaMinutos)}
      </Text>
      <Text style={[s.td, { width: "10%" }]}>
        {minutosParaHoraRelatorio(linha.minutosTrabalhados)}
      </Text>
      <Text style={[s.td, { width: "10%" }]}>{linha.diasTrabalhados}</Text>
      <Text style={[s.td, { width: "10%" }]}>{percentualRealizado(linha)}</Text>
    </>
  );
}
