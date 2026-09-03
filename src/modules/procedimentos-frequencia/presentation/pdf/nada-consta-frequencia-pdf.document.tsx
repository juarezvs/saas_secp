import {
  Document,
  Image,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import { readFileSync } from "node:fs";

import type { DadosAutenticacaoDocumento } from "@/modules/documentos-autenticacao/application/services/documento-autenticacao.service";

export type NadaConstaFrequenciaPdfDados = {
  execucaoId: string;
  servidorNome: string;
  servidorMatricula: string;
  orgaoSigla: string;
  orgaoNome: string;
  unidadeSigla?: string | null;
  unidadeNome?: string | null;
  cargoDescricao?: string | null;
  processoSei?: string | null;
  justificativa?: string | null;
  dataInicio: Date | string;
  dataFim: Date | string;
  emitidoEm: Date | string;
  diasPrevistosTrabalho: number;
  diasTrabalhadosRegistrados: number;
  afastamentosNoPeriodo: number;
  saldoBancoHorasMinutos: number;
  debitosVencidosMinutos: number;
  faltasNaoResolvidas: number;
  pendenciasHomologacao: number;
  resultado: "NADA_CONSTA" | "COM_PENDENCIAS";
  mensagem: string;
};

type NadaConstaFrequenciaPdfDocumentProps = {
  dados: NadaConstaFrequenciaPdfDados;
  autenticacao?: DadosAutenticacaoDocumento | null;
};

const AZUL = "#000080";
const CINZA_BORDA = "#9ca3af";

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 18,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  frame: {
    borderWidth: 1,
    borderColor: "#4b5563",
    minHeight: 804,
    padding: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: CINZA_BORDA,
    paddingBottom: 6,
  },
  brasao: {
    width: 42,
    height: 42,
    objectFit: "contain",
  },
  headerText: {
    flexGrow: 1,
    flexBasis: 0,
    marginLeft: 10,
  },
  headerLine: {
    fontSize: 9,
    marginBottom: 3,
  },
  headerLineBold: {
    fontSize: 9,
    marginBottom: 3,
    fontWeight: 700,
  },
  emissionBox: {
    width: 118,
    borderWidth: 1,
    borderColor: CINZA_BORDA,
  },
  emissionHeader: {
    backgroundColor: AZUL,
    color: "#ffffff",
    fontSize: 8,
    fontWeight: 700,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  emissionCell: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderTopWidth: 1,
    borderColor: "#d1d5db",
  },
  emissionLabel: {
    fontSize: 7,
    color: "#4b5563",
  },
  emissionValue: {
    marginTop: 1,
    fontSize: 8,
    fontWeight: 700,
  },
  title: {
    marginTop: 11,
    textAlign: "center",
    fontSize: 13,
    fontWeight: 700,
    color: AZUL,
  },
  subtitle: {
    marginTop: 3,
    textAlign: "center",
    fontSize: 9,
    color: "#4b5563",
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    backgroundColor: AZUL,
    color: "#ffffff",
    fontSize: 8.5,
    fontWeight: 700,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  grid: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: CINZA_BORDA,
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#d1d5db",
  },
  cell: {
    flexGrow: 1,
    flexBasis: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRightWidth: 1,
    borderColor: "#d1d5db",
  },
  cellLast: {
    flexGrow: 1,
    flexBasis: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  label: {
    fontSize: 7.5,
    color: "#4b5563",
  },
  value: {
    marginTop: 2,
    fontSize: 8.8,
    fontWeight: 700,
  },
  declarationBox: {
    borderWidth: 1,
    borderColor: CINZA_BORDA,
    padding: 6,
  },
  declarationText: {
    fontSize: 8.8,
    lineHeight: 1.25,
    textAlign: "justify",
  },
  statusBox: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#047857",
    backgroundColor: "#ecfdf5",
  },
  statusBoxAlerta: {
    borderColor: "#b45309",
    backgroundColor: "#fffbeb",
  },
  statusText: {
    textAlign: "center",
    fontSize: 9,
    fontWeight: 700,
    color: "#047857",
  },
  statusTextAlerta: {
    color: "#92400e",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: CINZA_BORDA,
  },
  summaryCell: {
    width: "25%",
    minHeight: 30,
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: CINZA_BORDA,
  },
  authenticationBox: {
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: CINZA_BORDA,
    paddingVertical: 5,
  },
  signatureRow: {
    flexDirection: "row",
    gap: 6,
    borderBottomWidth: 0.7,
    borderColor: "#d1d5db",
    paddingBottom: 4,
    marginBottom: 4,
  },
  signatureIcon: {
    width: 48,
    minHeight: 32,
    borderWidth: 0.8,
    borderColor: AZUL,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    paddingVertical: 3,
  },
  signatureIconText: {
    marginTop: 1,
    fontSize: 6.5,
    fontWeight: 700,
    color: AZUL,
  },
  signatureIconSmall: {
    marginTop: 1,
    fontSize: 4.8,
    textAlign: "center",
    color: "#334155",
  },
  signatureText: {
    flexGrow: 1,
    flexBasis: 0,
    fontSize: 7.8,
    lineHeight: 1.2,
  },
  authRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  qrCode: {
    width: 46,
    height: 46,
  },
  authText: {
    flexGrow: 1,
    flexBasis: 0,
    fontSize: 7.8,
    lineHeight: 1.2,
  },
  footer: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 6.6,
    color: "#6b7280",
  },
  bold: {
    fontWeight: 700,
  },
});

export function NadaConstaFrequenciaPdfDocument({
  dados,
  autenticacao,
}: NadaConstaFrequenciaPdfDocumentProps) {
  const brasaoRepublica = `data:image/png;base64,${readFileSync(
    `${process.cwd()}/public/brasao-republica.png`,
  ).toString("base64")}`;
  const semPendencias = dados.resultado === "NADA_CONSTA";

  return (
    <Document
      title={`Nada Consta de Frequencia ${dados.servidorMatricula}`}
      author="SECP"
      subject="Nada Consta de Frequencia"
      creator="SECP"
      producer="SECP"
    >
      <Page size="A4" orientation="portrait" style={styles.page} wrap={false}>
        <View style={styles.frame}>
          <View style={styles.header}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={brasaoRepublica} style={styles.brasao} />
            <View style={styles.headerText}>
              <Text style={styles.headerLineBold}>PODER JUDICIÁRIO</Text>
              <Text style={styles.headerLineBold}>
                JUSTIÇA FEDERAL DA 1ª REGIÃO
              </Text>
              <Text style={styles.headerLine}>{dados.orgaoNome}</Text>
              <Text style={styles.headerLine}>
                Sistema Eletrônico de Controle de Ponto - SECP
              </Text>
            </View>
            <View style={styles.emissionBox}>
              <Text style={styles.emissionHeader}>EMISSÃO</Text>
              <View style={styles.emissionCell}>
                <Text style={styles.emissionLabel}>Data</Text>
                <Text style={styles.emissionValue}>
                  {formatarData(dados.emitidoEm)}
                </Text>
              </View>
              <View style={styles.emissionCell}>
                <Text style={styles.emissionLabel}>Horário</Text>
                <Text style={styles.emissionValue}>
                  {formatarHora(dados.emitidoEm)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.title}>
            DECLARAÇÃO DE NADA CONSTA - PONTO ELETRÔNICO
          </Text>
          <Text style={styles.subtitle}>
            Documento emitido eletronicamente a partir das informações apuradas
            no SECP.
          </Text>

          <SecaoDadosServidor dados={dados} />
          <SecaoPeriodo dados={dados} />
          <SecaoDeclaracao dados={dados} semPendencias={semPendencias} />
          <SecaoResumo dados={dados} />

          {autenticacao ? (
            <AutenticacaoDocumento autenticacao={autenticacao} />
          ) : null}

          <Text style={styles.footer}>
            Nada Consta de frequência - SECP - Processo SEI{" "}
            {dados.processoSei || "não informado"}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function SecaoDadosServidor({
  dados,
}: {
  dados: NadaConstaFrequenciaPdfDados;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        1. DADOS INSTITUCIONAIS E FUNCIONAIS
      </Text>
      <View style={styles.grid}>
        <View style={styles.row}>
          <Campo
            label="Órgão"
            value={`${dados.orgaoSigla} - ${dados.orgaoNome}`}
          />
          <Campo
            label="Processo SEI"
            value={dados.processoSei || "Não informado"}
            last
          />
        </View>
        <View style={styles.row}>
          <Campo label="Nome" value={dados.servidorNome} />
          <Campo label="Matrícula" value={dados.servidorMatricula} last />
        </View>
        <View style={styles.row}>
          <Campo
            label="Unidade"
            value={
              [dados.unidadeSigla, dados.unidadeNome]
                .filter(Boolean)
                .join(" - ") || "Não informada"
            }
          />
          <Campo
            label="Cargo/Função"
            value={dados.cargoDescricao || "Não informado"}
            last
          />
        </View>
      </View>
    </View>
  );
}

function SecaoPeriodo({ dados }: { dados: NadaConstaFrequenciaPdfDados }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>2. PERÍODO DE APURAÇÃO</Text>
      <View style={styles.grid}>
        <View style={styles.row}>
          <Campo label="Início" value={formatarData(dados.dataInicio)} />
          <Campo label="Fim" value={formatarData(dados.dataFim)} last />
        </View>
      </View>
    </View>
  );
}

function SecaoDeclaracao({
  dados,
  semPendencias,
}: {
  dados: NadaConstaFrequenciaPdfDados;
  semPendencias: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>3. SITUAÇÃO DA JORNADA</Text>
      <View style={styles.declarationBox}>
        <Text style={styles.declarationText}>
          Declaramos, para os devidos fins, que foi realizada verificação no
          Sistema Eletrônico de Controle de Ponto - SECP para o servidor acima
          identificado, no período selecionado.{" "}
          {semPendencias
            ? "Não constam pendências de frequência, marcações omissas não regularizadas, faltas sem tratamento administrativo, débitos vencidos ou homologações pendentes no escopo verificado."
            : "Foram identificadas pendências de frequência no escopo verificado, conforme resumo abaixo, devendo ser observadas as providências administrativas cabíveis."}
        </Text>
        <View
          style={[
            styles.statusBox,
            semPendencias ? {} : styles.statusBoxAlerta,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              semPendencias ? {} : styles.statusTextAlerta,
            ]}
          >
            {semPendencias
              ? "STATUS: JORNADA REGULARIZADA / NADA CONSTA"
              : "STATUS: CONSTAM PENDÊNCIAS"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function SecaoResumo({ dados }: { dados: NadaConstaFrequenciaPdfDados }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>4. RESUMO DO PERÍODO</Text>
      <View style={styles.summaryGrid}>
        <ResumoItem
          label="Dias previstos de trabalho"
          value={`${dados.diasPrevistosTrabalho} dia(s)`}
        />
        <ResumoItem
          label="Dias trabalhados/registrados"
          value={`${dados.diasTrabalhadosRegistrados} dia(s)`}
        />
        <ResumoItem
          label="Afastamentos/férias/atestados"
          value={
            dados.afastamentosNoPeriodo > 0
              ? `${dados.afastamentosNoPeriodo} registro(s)`
              : "Nenhum"
          }
        />
        <ResumoItem
          label="Faltas não resolvidas"
          value={
            dados.faltasNaoResolvidas === 0
              ? "ZERO"
              : `${dados.faltasNaoResolvidas}`
          }
        />
        <ResumoItem
          label="Homologações pendentes"
          value={
            dados.pendenciasHomologacao === 0
              ? "ZERO"
              : `${dados.pendenciasHomologacao}`
          }
        />
        <ResumoItem
          label="Saldo de banco de horas"
          value={minutosParaHora(dados.saldoBancoHorasMinutos)}
        />
        <ResumoItem
          label="Débitos vencidos"
          value={minutosParaHora(dados.debitosVencidosMinutos)}
        />
      </View>
    </View>
  );
}

function Campo({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={last ? styles.cellLast : styles.cell}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function ResumoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function AutenticacaoDocumento({
  autenticacao,
}: {
  autenticacao: DadosAutenticacaoDocumento;
}) {
  return (
    <View style={styles.authenticationBox}>
      {autenticacao.assinaturas.map((assinatura, indice) => (
        <View
          key={`${assinatura.tipo}-${assinatura.nome}-${indice}`}
          style={styles.signatureRow}
        >
          <View style={styles.signatureIcon}>
            <CadeadoAssinatura />
            <Text style={styles.signatureIconText}>SECP</Text>
            <Text style={styles.signatureIconSmall}>assinatura eletrônica</Text>
          </View>
          <Text style={styles.signatureText}>
            Documento emitido eletronicamente por{" "}
            <Text style={styles.bold}>{assinatura.nome}</Text>
            {assinatura.funcao ? <Text>, {assinatura.funcao}</Text> : null}
            <Text>
              , em {formatarDataHora(assinatura.data)} ({assinatura.tipo}).
            </Text>
          </Text>
        </View>
      ))}
      <View style={styles.authRow}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={autenticacao.qrCodeDataUrl} style={styles.qrCode} />
        <Text style={styles.authText}>
          A autenticidade do documento pode ser conferida no site{" "}
          {autenticacao.url} informando o código verificador{" "}
          <Text style={styles.bold}>{autenticacao.codigo}</Text> e o código CRC{" "}
          <Text style={styles.bold}>{autenticacao.crc}</Text>. Hash SHA-256:{" "}
          <Text style={styles.bold}>{autenticacao.hashDocumento}</Text>.
        </Text>
      </View>
    </View>
  );
}

function CadeadoAssinatura() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Path
        d="M7 10V8a5 5 0 0 1 10 0v2h1.2A1.8 1.8 0 0 1 20 11.8v7.4a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 19.2v-7.4A1.8 1.8 0 0 1 5.8 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Z"
        fill={AZUL}
      />
      <Path
        d="M12 13.2a1.6 1.6 0 0 1 .7 3.04V18h-1.4v-1.76A1.6 1.6 0 0 1 12 13.2Z"
        fill="#ffffff"
      />
    </Svg>
  );
}

function formatarData(valor: Date | string) {
  return new Date(valor).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatarHora(valor: Date | string) {
  return new Date(valor).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Manaus",
  });
}

function formatarDataHora(valor: Date | string) {
  return new Date(valor).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Manaus",
  });
}

function minutosParaHora(minutos: number) {
  const sinal = minutos < 0 ? "-" : "";
  const absoluto = Math.abs(minutos);
  return `${sinal}${String(Math.floor(absoluto / 60)).padStart(2, "0")}:${String(
    absoluto % 60,
  ).padStart(2, "0")}`;
}
