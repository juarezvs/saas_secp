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
import type { ReactNode } from "react";
import { nomeMesReferencia } from "../../application/services/formatar-relatorio.service";
import {
  classificarDiaEspelho,
  rotuloSolicitacaoEspelho,
} from "@/modules/apuracao/application/services/classificar-espelho-mensal.service";
import type { DadosAutenticacaoDocumento } from "@/modules/documentos-autenticacao/application/services/documento-autenticacao.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

type UnidadeEspelho = {
  sigla: string;
  nome: string;
  uf?: string | null;
  orgao?: {
    sigla: string;
    nome: string;
  } | null;
  unidadePai?: UnidadeEspelho | null;
};

type EspelhoPontoPdfProps = {
  dados: {
    servidor: {
      matricula: string;
      cpf?: string | null;
      nomeFuncional?: string | null;
      cargo?: {
        descricao: string;
      } | null;
      orgao: {
        sigla: string;
        nome: string;
      };
      usuario: {
        nome: string;
      };
      lotacoes: {
        unidade: UnidadeEspelho;
        cargo?: {
          descricao: string;
        } | null;
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
      metadados?: unknown;
      contabilizarSaldos?: boolean;
      minutosDebitoApurado?: number;
      minutosDebitoCompensado?: number;
      ocorrencias?: {
        tipo: string;
        descricao: string;
        minutos: number;
      }[];
    }[];
    marcacoes: {
      id: string;
      dataHora: Date;
      dataReferencia: Date;
      fusoHorario?: string | null;
      tipo: string;
      fonte: string;
      status: string;
    }[];
    ano: number;
    mes: number;
  };
  autenticacao?: DadosAutenticacaoDocumento | null;
};

type MarcacaoPdfItem = EspelhoPontoPdfProps["dados"]["marcacoes"][number];
type ApuracaoEspelhoPdfItem =
  EspelhoPontoPdfProps["dados"]["apuracoes"][number];

type DiaInstitucionalEspelho = {
  tipo: string;
  descricao: string;
  contaComoDiaUtil: boolean;
  geraApuracaoRegular: boolean;
};

const AZUL_MODELO = "#000080";
const BORDA_MODELO = "#4b5563";

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 38,
    paddingTop: 26,
    paddingBottom: 30,
    fontFamily: "Helvetica",
    color: "#111111",
  },
  frame: {
    borderWidth: 1,
    borderColor: BORDA_MODELO,
    minHeight: 598,
  },
  top: {
    position: "relative",
    minHeight: 172,
    paddingTop: 4,
    paddingHorizontal: 2,
  },
  watermark: {
    position: "absolute",
    top: 4,
    left: 170,
    width: 170,
    height: 170,
    opacity: 0.07,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 6,
    paddingTop: 2,
  },
  brasao: {
    width: 54,
    height: 54,
    objectFit: "contain",
  },
  orgaoBlock: {
    marginLeft: 12,
  },
  orgaoLine: {
    fontSize: 10,
    marginBottom: 5,
  },
  title: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 0.2,
  },
  periodoBox: {
    position: "absolute",
    top: 36,
    right: 1,
    width: 104,
  },
  periodoHeader: {
    backgroundColor: AZUL_MODELO,
    color: "#ffffff",
    fontSize: 8,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  periodoCell: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#a3a3a3",
    minHeight: 27,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  periodoLabel: {
    fontSize: 7,
  },
  periodoValue: {
    marginTop: -3,
    textAlign: "center",
    fontSize: 10,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 4,
    marginTop: 10,
  },
  leftInfo: {
    width: "68.5%",
  },
  vistoBox: {
    width: "31.5%",
    minHeight: 74,
    borderWidth: 1,
    borderColor: "#a3a3a3",
  },
  sectionBar: {
    backgroundColor: AZUL_MODELO,
    color: "#ffffff",
    fontSize: 8,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  infoValueBox: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#a3a3a3",
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  infoValue: {
    fontSize: 10,
  },
  infoValueSecondary: {
    marginTop: 2,
    fontSize: 8,
  },
  controleBar: {
    backgroundColor: AZUL_MODELO,
    color: "#ffffff",
    fontSize: 8,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    minHeight: 23,
    borderBottomWidth: 1,
    borderColor: BORDA_MODELO,
  },
  headerCell: {
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderColor: "#9ca3af",
    paddingHorizontal: 2,
  },
  headerText: {
    fontSize: 8,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    minHeight: 14.5,
    borderBottomWidth: 0.7,
    borderColor: BORDA_MODELO,
  },
  cell: {
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 0.7,
    borderColor: "#9ca3af",
    paddingHorizontal: 2,
  },
  dayText: {
    fontSize: 8.5,
  },
  timeText: {
    fontSize: 7.8,
  },
  statusText: {
    fontSize: 7.4,
    textAlign: "center",
    textTransform: "uppercase",
  },
  dateText: {
    fontSize: 7.2,
    textAlign: "center",
  },
  totalText: {
    fontSize: 7.3,
    textAlign: "center",
  },
  noteText: {
    fontSize: 9,
    textAlign: "center",
    textTransform: "uppercase",
  },
  bold: {
    fontWeight: 700,
  },
  autenticacaoBox: {
    marginTop: 7,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#9ca3af",
    paddingVertical: 5,
  },
  assinaturaLinha: {
    flexDirection: "row",
    borderBottomWidth: 0.7,
    borderColor: "#d1d5db",
    paddingVertical: 4,
    gap: 6,
  },
  assinaturaIcon: {
    width: 56,
    minHeight: 36,
    borderWidth: 0.8,
    borderColor: AZUL_MODELO,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    paddingVertical: 3,
  },
  assinaturaIconText: {
    marginTop: 1,
    fontSize: 7,
    fontWeight: 700,
    color: AZUL_MODELO,
  },
  assinaturaIconSmall: {
    marginTop: 1,
    fontSize: 5,
    textAlign: "center",
    color: "#334155",
  },
  assinaturaTexto: {
    flexGrow: 1,
    flexBasis: 0,
    fontSize: 8,
    lineHeight: 1.25,
  },
  autenticacaoQrRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 5,
    alignItems: "center",
  },
  qrCode: {
    width: 58,
    height: 58,
  },
  autenticacaoTexto: {
    flexGrow: 1,
    flexBasis: 0,
    fontSize: 8,
    lineHeight: 1.25,
  },
  footerDoc: {
    marginTop: 3,
    textAlign: "center",
    fontSize: 7,
    color: "#6b7280",
  },
});

const colunas = {
  data: "13.5%",
  hora: "9.5%",
  total: "10.8%",
  status: "17.3%",
};

const estadosPorUf: Record<string, string> = {
  AC: "DO ACRE",
  AM: "DO AMAZONAS",
  AP: "DO AMAPÁ",
  BA: "DA BAHIA",
  DF: "DO DISTRITO FEDERAL",
  GO: "DE GOIÁS",
  MA: "DO MARANHÃO",
  MG: "DE MINAS GERAIS",
  MT: "DE MATO GROSSO",
  PA: "DO PARÁ",
  PI: "DO PIAUÍ",
  RO: "DE RONDÔNIA",
  RR: "DE RORAIMA",
  TO: "DO TOCANTINS",
};

const ufsPorSiglaSecao: Record<string, string> = {
  SJAC: "AC",
  SJAM: "AM",
  SJAP: "AP",
  SJBA: "BA",
  SJDF: "DF",
  SJGO: "GO",
  SJMA: "MA",
  SJMG: "MG",
  SJMT: "MT",
  SJPA: "PA",
  SJPI: "PI",
  SJRO: "RO",
  SJRR: "RR",
  SJTO: "TO",
};

export function EspelhoPontoPdfDocument({
  dados,
  autenticacao,
}: EspelhoPontoPdfProps) {
  const servidor = dados.servidor;
  const lotacao = servidor?.lotacoes[0] ?? null;
  const unidade = lotacao?.unidade ?? null;
  const orgaoSigla = servidor?.orgao?.sigla ?? unidade?.orgao?.sigla;
  const marcacoesPorDia = agruparMarcacoesPorDia(dados.marcacoes);
  const apuracoesPorDia = new Map(
    dados.apuracoes.map((item) => [chaveDataReferenciaUtc(item.dataReferencia), item]),
  );
  const brasaoRepublica = `data:image/png;base64,${readFileSync(
    `${process.cwd()}/public/brasao-republica.png`,
  ).toString("base64")}`;

  return (
    <Document
      title={`Folha de Frequencia ${servidor?.matricula ?? ""}`}
      author="SECP"
      subject="Folha de Frequencia"
      creator="SECP"
      producer="SECP"
    >
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.top}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={brasaoRepublica} style={styles.watermark} />
            <View style={styles.identityRow}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={brasaoRepublica} style={styles.brasao} />
              <View style={styles.orgaoBlock}>
                <Text style={styles.orgaoLine}>PODER JUDICIÁRIO</Text>
                <Text style={styles.orgaoLine}>
                  {resolverNomeOficialOrgao(unidade)}
                </Text>
              </View>
            </View>

            <Text style={styles.title}>FOLHA DE FREQUÊNCIA</Text>

            <View style={styles.periodoBox}>
              <Text style={styles.periodoHeader}>PERÍODO</Text>
              <View style={styles.periodoCell}>
                <Text style={styles.periodoLabel}>MÊS</Text>
                <Text style={styles.periodoValue}>{nomeMesReferencia(dados.mes)}</Text>
              </View>
              <View style={styles.periodoCell}>
                <Text style={styles.periodoLabel}>ANO</Text>
                <Text style={styles.periodoValue}>{dados.ano}</Text>
              </View>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.leftInfo}>
                <Text style={styles.sectionBar}>UNIDADE ADMINISTRATIVA</Text>
                <View style={styles.infoValueBox}>
                  <Text style={styles.infoValue}>
                    {normalizarTextoModelo(
                      unidade?.nome?.trim() || unidade?.sigla || "-",
                    )}
                  </Text>
                  <Text style={styles.infoValueSecondary}>
                    {formatarSiglasUnidadeAdministrativa(unidade, orgaoSigla)}
                  </Text>
                </View>

                <Text style={[styles.sectionBar, { marginTop: 5 }]}>
                  NOME DO SERVIDOR
                </Text>
                <View style={styles.infoValueBox}>
                  <Text style={styles.infoValue}>
                    {servidor
                      ? `${servidor.matricula}  - ${normalizarTextoModelo(
                          nomeServidor(servidor) || "-",
                        )}`
                      : "-"}
                  </Text>
                  <Text style={styles.infoValueSecondary}>
                    CPF: {formatarCpfModelo(servidor?.cpf)} | Cargo:{" "}
                    {normalizarTextoModelo(
                      lotacao?.cargo?.descricao ||
                        servidor?.cargo?.descricao ||
                        "-",
                    )}
                  </Text>
                </View>
              </View>

              <View style={styles.vistoBox}>
                <Text style={styles.sectionBar}>VISTO DO DIRIGENTE (SOB CARIMBO)</Text>
              </View>
            </View>
          </View>

          <Text style={styles.controleBar}>CONTROLE DE FREQUÊNCIA</Text>
          <TabelaFrequencia
            ano={dados.ano}
            mes={dados.mes}
            marcacoesPorDia={marcacoesPorDia}
            apuracoesPorDia={apuracoesPorDia}
          />
        </View>
        {autenticacao ? (
          <AutenticacaoDocumento autenticacao={autenticacao} />
        ) : null}
      </Page>
    </Document>
  );
}

function AutenticacaoDocumento({
  autenticacao,
}: {
  autenticacao: DadosAutenticacaoDocumento;
}) {
  return (
    <View style={styles.autenticacaoBox}>
      {autenticacao.assinaturas.map((assinatura, indice) => (
        <View
          key={`${assinatura.tipo}-${assinatura.nome}-${indice}`}
          style={styles.assinaturaLinha}
        >
          <View style={styles.assinaturaIcon}>
            <CadeadoAssinatura />
            <Text style={styles.assinaturaIconText}>SECP</Text>
            <Text style={styles.assinaturaIconSmall}>assinatura eletrônica</Text>
          </View>
          <Text style={styles.assinaturaTexto}>
            Documento assinado eletronicamente por{" "}
            <Text style={styles.bold}>{assinatura.nome}</Text>
            {assinatura.funcao ? <Text>, {assinatura.funcao}</Text> : null}
            <Text>
              , em {formatarDataHoraAssinatura(assinatura.data)} (
              {assinatura.tipo}).
            </Text>
          </Text>
        </View>
      ))}
      <View style={styles.autenticacaoQrRow}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={autenticacao.qrCodeDataUrl} style={styles.qrCode} />
        <Text style={styles.autenticacaoTexto}>
          A autenticidade do documento pode ser conferida no site{" "}
          {autenticacao.url} informando o código verificador{" "}
          <Text style={styles.bold}>{autenticacao.codigo}</Text> e o código CRC{" "}
          <Text style={styles.bold}>{autenticacao.crc}</Text>.
        </Text>
      </View>
      <Text style={styles.footerDoc}>
        Espelho de ponto {autenticacao.codigo} - SECP
      </Text>
    </View>
  );
}

function CadeadoAssinatura() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24">
      <Path
        d="M7 10V8a5 5 0 0 1 10 0v2h1.2A1.8 1.8 0 0 1 20 11.8v7.4a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 19.2v-7.4A1.8 1.8 0 0 1 5.8 10H7Zm2 0h6V8a3 3 0 0 0-6 0v2Z"
        fill={AZUL_MODELO}
      />
      <Path
        d="M12 13.2a1.6 1.6 0 0 1 .7 3.04V18h-1.4v-1.76A1.6 1.6 0 0 1 12 13.2Z"
        fill="#ffffff"
      />
    </Svg>
  );
}

function TabelaFrequencia({
  ano,
  mes,
  marcacoesPorDia,
  apuracoesPorDia,
}: {
  ano: number;
  mes: number;
  marcacoesPorDia: Map<string, MarcacaoPdfItem[]>;
  apuracoesPorDia: Map<string, ApuracaoEspelhoPdfItem>;
}) {
  const quantidadeDias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const dias = Array.from({ length: quantidadeDias }, (_, indice) => indice + 1);

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <CabecalhoCelula width={colunas.data}>DIA</CabecalhoCelula>
        <CabecalhoCelula width={colunas.hora}>1ª{"\n"}ENTRADA</CabecalhoCelula>
        <CabecalhoCelula width={colunas.hora}>1ª{"\n"}SAÍDA</CabecalhoCelula>
        <CabecalhoCelula width={colunas.hora}>2ª{"\n"}ENTRADA</CabecalhoCelula>
        <CabecalhoCelula width={colunas.hora}>2ª{"\n"}SAÍDA</CabecalhoCelula>
        <CabecalhoCelula width={colunas.total}>HORAS{"\n"}NORMAIS</CabecalhoCelula>
        <CabecalhoCelula width={colunas.total}>HORAS{"\n"}ALMOÇO</CabecalhoCelula>
        <CabecalhoCelula width={colunas.total}>HORAS{"\n"}TRAB.</CabecalhoCelula>
        <CabecalhoCelula width={colunas.status} ultimo>
          STATUS
        </CabecalhoCelula>
      </View>

      {dias.map((dia) => {
        const data = new Date(Date.UTC(ano, mes - 1, dia));
        const chave = chaveDataReferenciaUtc(data);
        const marcacoes = marcacoesPorDia.get(chave) ?? [];
        const apuracao = apuracoesPorDia.get(chave) ?? null;
        const horarios = distribuirMarcacoesNasColunas(marcacoes);
        const status = obterStatusDia(data, apuracao, marcacoes);

        return (
          <View key={chave} style={styles.tableRow} wrap={false}>
            <Celula width={colunas.data}>
              <Text style={styles.dateText}>{formatarDataTabela(data)}</Text>
            </Celula>
            {horarios.map((horario, indice) => (
              <Celula key={`${chave}-${indice}`} width={colunas.hora}>
                <Text style={styles.timeText}>{horario || "-"}</Text>
              </Celula>
            ))}
            <Celula width={colunas.total}>
              <Text style={styles.totalText}>
                {formatarMinutosTabela(apuracao?.cargaPrevistaMinutos ?? 0)}
              </Text>
            </Celula>
            <Celula width={colunas.total}>
              <Text style={styles.totalText}>
                {formatarMinutosTabela(apuracao?.minutosIntervalo ?? 0)}
              </Text>
            </Celula>
            <Celula width={colunas.total}>
              <Text style={styles.totalText}>
                {formatarMinutosTabela(apuracao?.minutosTrabalhados ?? 0)}
              </Text>
            </Celula>
            <Celula width={colunas.status} ultimo>
              <Text style={styles.statusText}>{status}</Text>
            </Celula>
          </View>
        );
      })}
    </View>
  );
}

function CabecalhoCelula({
  width,
  ultimo = false,
  children,
}: {
  width: string;
  ultimo?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.headerCell, { width, borderRightWidth: ultimo ? 0 : 1 }]}>
      <Text style={styles.headerText}>{children}</Text>
    </View>
  );
}

function Celula({
  width,
  ultimo = false,
  children,
}: {
  width: string;
  ultimo?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.cell, { width, borderRightWidth: ultimo ? 0 : 0.7 }]}>
      {children}
    </View>
  );
}

function distribuirMarcacoesNasColunas(marcacoes: MarcacaoPdfItem[]) {
  const horarios: string[] = ["", "", "", ""];
  const indicePorTipo: Record<string, number> = {
    ENTRADA: 0,
    SAIDA_INTERVALO: 1,
    RETORNO_INTERVALO: 2,
    SAIDA: 3,
  };
  const restantes: MarcacaoPdfItem[] = [];

  for (const marcacao of marcacoes) {
    const indice = indicePorTipo[marcacao.tipo];

    if (indice === undefined || horarios[indice]) {
      restantes.push(marcacao);
      continue;
    }

    horarios[indice] = formatarHoraLocal(marcacao.dataHora, marcacao.fusoHorario);
  }

  for (const marcacao of restantes) {
    const indiceLivre = horarios.findIndex((horario) => !horario);

    if (indiceLivre < 0) {
      break;
    }

    horarios[indiceLivre] = formatarHoraLocal(marcacao.dataHora, marcacao.fusoHorario);
  }

  return horarios;
}

function obterStatusDia(
  data: Date,
  apuracao: ApuracaoEspelhoPdfItem | null,
  marcacoes: MarcacaoPdfItem[],
) {
  if (apuracao) {
    const diaInstitucional = extrairDiaInstitucional(apuracao.metadados);

    if (diaInstitucional && !ehFimDeSemanaInstitucional(diaInstitucional)) {
      return normalizarTextoModelo(rotuloDiaInstitucional(diaInstitucional));
    }

    const classificacao = classificarDiaEspelho(apuracao);
    const solicitacaoIntegral = classificacao.solicitacoesAplicadas.find(
      (solicitacao) => solicitacao.coberturaIntegral,
    );

    if (solicitacaoIntegral) {
      return normalizarTextoModelo(rotuloSolicitacaoEspelho(solicitacaoIntegral.tipo));
    }

    const afastamento = apuracao.ocorrencias?.find(
      (ocorrencia) => ocorrencia.tipo === "AFASTAMENTO",
    );

    if (afastamento) {
      return normalizarTextoModelo(rotuloAfastamentoEspelho(afastamento.descricao));
    }

    const semJornada = apuracao.ocorrencias?.find(
      (ocorrencia) => ocorrencia.tipo === "SEM_JORNADA",
    );

    if (semJornada) {
      return "SEM JORNADA";
    }

    if (apuracao.resultado === "FALTA") {
      return "SEM REGISTRO";
    }

    if (
      apuracao.resultado === "INCOMPLETA" ||
      (marcacoes.length > 0 && marcacoes.length < 2)
    ) {
      return "PARCIAL";
    }

    if (apuracao.minutosTrabalhados > 0) {
      return "PRESENTE";
    }
  }

  const diaSemana = data.getUTCDay();

  if (diaSemana === 6) {
    return "FOLGA";
  }

  if (diaSemana === 0) {
    return "FOLGA";
  }

  return marcacoes.length > 0 ? "PARCIAL" : "SEM REGISTRO";
}

function resolverNomeOficialOrgao(unidade?: UnidadeEspelho | null) {
  const uf =
    encontrarUfNaHierarquia(unidade) ??
    ufsPorSiglaSecao[encontrarSiglaSecaoNaHierarquia(unidade) ?? ""];
  const estado = uf ? estadosPorUf[uf] : null;

  if (estado) {
    return `JUSTIÇA FEDERAL DE 1ª INSTÂNCIA ${estado}`;
  }

  const nomeOrgao = unidade?.orgao?.nome?.trim();

  if (nomeOrgao) {
    return normalizarTextoModelo(nomeOrgao);
  }

  return "JUSTIÇA FEDERAL DE 1ª INSTÂNCIA";
}

function encontrarUfNaHierarquia(unidade?: UnidadeEspelho | null) {
  let atual = unidade ?? null;
  const visitados = new Set<UnidadeEspelho>();

  while (atual && !visitados.has(atual)) {
    visitados.add(atual);

    if (atual.uf && estadosPorUf[atual.uf]) {
      return atual.uf;
    }

    atual = atual.unidadePai ?? null;
  }

  return null;
}

function encontrarSiglaSecaoNaHierarquia(unidade?: UnidadeEspelho | null) {
  let atual = unidade ?? null;
  const visitados = new Set<UnidadeEspelho>();

  while (atual && !visitados.has(atual)) {
    visitados.add(atual);

    if (ufsPorSiglaSecao[atual.sigla]) {
      return atual.sigla;
    }

    atual = atual.unidadePai ?? null;
  }

  return null;
}

function formatarSiglasUnidadeAdministrativa(
  unidade?: UnidadeEspelho | null,
  orgaoSigla?: string | null,
) {
  if (!unidade) {
    return "-";
  }

  const hierarquia = montarHierarquiaUnidade(unidade);
  const hierarquiaNormalizada = normalizarCaminhoUnidadePorOrgao(
    orgaoSigla,
    hierarquia,
  );
  const primeiraUnidade = hierarquiaNormalizada[0]?.sigla.trim();
  const siglaOrgao = orgaoSigla?.trim();
  const partes: string[] = [];
  const siglasHierarquia = [
    primeiraUnidade === siglaOrgao ? null : siglaOrgao,
    ...hierarquiaNormalizada.map((item) => item.sigla),
  ];

  for (const sigla of siglasHierarquia) {
    const valor = sigla?.trim();

    if (!valor || partes.at(-1) === valor) {
      continue;
    }

    partes.push(valor);
  }

  return partes.join(" > ") || "-";
}

function normalizarCaminhoUnidadePorOrgao(
  orgaoSigla: string | null | undefined,
  unidades: UnidadeEspelho[],
) {
  const siglaOrgao = orgaoSigla?.trim();

  if (!siglaOrgao) {
    return unidades;
  }

  const indiceUnidadeOrgao = unidades.findIndex(
    (unidade) => unidade.sigla.trim() === siglaOrgao,
  );

  return indiceUnidadeOrgao >= 0 ? unidades.slice(indiceUnidadeOrgao) : unidades;
}

function montarHierarquiaUnidade(unidade: UnidadeEspelho) {
  const unidades: UnidadeEspelho[] = [];
  const visitados = new Set<UnidadeEspelho>();
  let atual: UnidadeEspelho | null | undefined = unidade;

  while (atual && !visitados.has(atual)) {
    visitados.add(atual);
    unidades.unshift(atual);
    atual = atual.unidadePai;
  }

  return unidades;
}

function normalizarTextoModelo(texto: string) {
  return texto.trim().toLocaleUpperCase("pt-BR");
}

function formatarCpfModelo(cpf?: string | null) {
  const digitos = cpf?.replace(/\D/g, "") ?? "";

  if (digitos.length !== 11) {
    return cpf?.trim() || "-";
  }

  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(
    6,
    9,
  )}-${digitos.slice(9)}`;
}

function agruparMarcacoesPorDia(marcacoes: MarcacaoPdfItem[]) {
  const mapa = new Map<string, MarcacaoPdfItem[]>();

  for (const marcacao of marcacoes) {
    const chave = chaveDataReferenciaUtc(marcacao.dataReferencia);
    const atual = mapa.get(chave) ?? [];
    atual.push(marcacao);
    mapa.set(chave, atual);
  }

  return mapa;
}

function chaveDataReferenciaUtc(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

function formatarDataTabela(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);
  const diaSemana = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  })
    .format(data)
    .replace(".", "");

  return `${normalizarTextoModelo(diaSemana)}, ${dataFormatada}`;
}

function formatarMinutosTabela(minutos: number) {
  if (!Number.isFinite(minutos) || minutos <= 0) {
    return "0h:00min";
  }

  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;

  return `${horas}h:${String(minutosRestantes).padStart(2, "0")}min`;
}

function formatarHoraLocal(valor: Date | string, fusoHorario?: string | null) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fusoHorario ?? "America/Manaus",
  }).format(data);
}

function formatarDataHoraAssinatura(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "--/--/---- --:--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Manaus",
  }).format(data);
}

function extrairDiaInstitucional(
  metadados: unknown,
): DiaInstitucionalEspelho | null {
  if (!metadados || typeof metadados !== "object") {
    return null;
  }

  const dados = metadados as {
    tipoDiaInstitucional?: unknown;
    descricaoDiaInstitucional?: unknown;
    contaComoDiaUtil?: unknown;
    geraApuracaoRegular?: unknown;
  };

  if (
    typeof dados.tipoDiaInstitucional !== "string" ||
    dados.tipoDiaInstitucional === "UTIL"
  ) {
    return null;
  }

  return {
    tipo: dados.tipoDiaInstitucional,
    descricao:
      typeof dados.descricaoDiaInstitucional === "string" &&
      dados.descricaoDiaInstitucional.trim().length > 0
        ? dados.descricaoDiaInstitucional
        : rotuloTipoDiaInstitucional(dados.tipoDiaInstitucional),
    contaComoDiaUtil: dados.contaComoDiaUtil === true,
    geraApuracaoRegular: dados.geraApuracaoRegular === true,
  };
}

function rotuloTipoDiaInstitucional(tipo: string) {
  const rotulos: Record<string, string> = {
    SABADO: "Sábado",
    DOMINGO: "Domingo",
    FERIADO: "Feriado institucional",
    PONTO_FACULTATIVO: "Ponto facultativo",
    SUSPENSAO_EXPEDIENTE: "Suspensão de expediente",
    RECESSO_FORENSE: "Recesso forense",
  };

  return rotulos[tipo] ?? tipo.replaceAll("_", " ");
}

function rotuloDiaInstitucional(dia: DiaInstitucionalEspelho) {
  if (dia.tipo === "FERIADO" && dia.descricao !== "Feriado institucional") {
    return `Feriado: ${dia.descricao}`;
  }

  if (
    dia.tipo === "PONTO_FACULTATIVO" &&
    dia.descricao !== "Ponto facultativo"
  ) {
    return `Ponto facultativo: ${dia.descricao}`;
  }

  if (
    dia.tipo === "SUSPENSAO_EXPEDIENTE" &&
    dia.descricao !== "Suspensão de expediente"
  ) {
    return `Suspensão: ${dia.descricao}`;
  }

  if (dia.tipo === "RECESSO_FORENSE") {
    return dia.descricao;
  }

  return rotuloTipoDiaInstitucional(dia.tipo);
}

function rotuloAfastamentoEspelho(descricao?: string | null) {
  const texto = descricao?.trim();

  if (!texto) {
    return "Afastamento";
  }

  return texto
    .replace(/^Afastamento SARH:\s*/i, "")
    .replace(/\s*Processo\/SEI:.*$/i, "")
    .replace(/\.$/, "")
    .trim();
}

function ehFimDeSemanaInstitucional(dia: DiaInstitucionalEspelho | null) {
  return dia?.tipo === "SABADO" || dia?.tipo === "DOMINGO";
}
