import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles as s } from "./pdf-styles";
import {
  formatarDataRelatorio,
  minutosParaHoraRelatorio,
  nomeMesReferencia,
} from "../../application/services/formatar-relatorio.service";
import {
  classificarDiaEspelho,
  conferenciaEspelho,
  resumirEspelhoMensal,
  rotuloSolicitacaoEspelho,
  type SolicitacaoAplicadaEspelho,
} from "@/modules/apuracao/application/services/classificar-espelho-mensal.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

type EspelhoPontoPdfProps = {
  dados: {
    servidor: {
      matricula: string;
      nomeFuncional?: string | null;
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
      tipo: string;
      fonte: string;
      status: string;
    }[];
    ano: number;
    mes: number;
  };
};

type MarcacaoPdfItem = {
  id: string;
  dataHora: Date;
  tipo: string;
  fonte?: string | null;
  status: string;
};

const badgeSolicitacao = {
  marginTop: 2,
  padding: 2,
  borderWidth: 1,
  borderColor: "#a7f3d0",
  backgroundColor: "#ecfdf5",
  color: "#065f46",
  fontSize: 6,
};

const badgeRemoto = {
  padding: 2,
  borderWidth: 1,
  borderColor: "#bfdbfe",
  backgroundColor: "#eff6ff",
  color: "#1e40af",
  fontSize: 7,
};

const badgeDispensa = {
  padding: 2,
  borderWidth: 1,
  borderColor: "#a7f3d0",
  backgroundColor: "#ecfdf5",
  color: "#065f46",
  fontSize: 7,
};

const badgeOcorrencia = {
  marginBottom: 2,
  padding: 2,
  borderWidth: 1,
  fontSize: 6,
};

const badgeConferenciaBase = {
  padding: 2,
  borderWidth: 1,
  fontSize: 7,
};

const badgeAjuste = {
  marginTop: 2,
  padding: 2,
  borderWidth: 1,
  borderColor: "#fde68a",
  backgroundColor: "#fffbeb",
  color: "#92400e",
  fontSize: 6,
};

export function EspelhoPontoPdfDocument({ dados }: EspelhoPontoPdfProps) {
  const servidor = dados.servidor;
  const marcacoesPorDia = agruparMarcacoesPorDiaManaus(dados.marcacoes);

  const totais = dados.apuracoes.reduce(
    (acc, item) => {
      acc.previsto += item.cargaPrevistaMinutos;

      if (item.contabilizarSaldos !== false) {
        acc.trabalhado += item.minutosTrabalhados;
        acc.credito += item.minutosCredito;
        acc.debito += item.minutosDebito;
      }

      return acc;
    },
    {
      previsto: 0,
      trabalhado: 0,
      credito: 0,
      debito: 0,
    },
  );
  const apuracoesContabilizadas = dados.apuracoes.filter(
    (item) => item.contabilizarSaldos !== false,
  );
  const resumoFuncional = resumirEspelhoMensal(apuracoesContabilizadas);

  return (
    <Document
      title={`Espelho de Ponto ${servidor?.matricula ?? ""}`}
      author="SECP"
      subject="Espelho de Ponto"
      creator="SECP"
      producer="SECP"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <Text style={s.orgao}>
            Justica Federal - Secao Judiciaria do Amazonas
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
              <Text style={s.label}>Matricula</Text>
              <Text style={s.value}>{servidor?.matricula ?? "-"}</Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Nome</Text>
              <Text style={s.value}>{nomeServidor(servidor) || "-"}</Text>
            </View>
          </View>

          <View style={s.row}>
            <View style={s.infoBox}>
              <Text style={s.label}>Lotacao</Text>
              <Text style={s.value}>
                {servidor?.lotacoes[0]
                  ? `${servidor.lotacoes[0].unidade.sigla} - ${servidor.lotacoes[0].unidade.nome}`
                  : "-"}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Jornada</Text>
              <Text style={s.value}>
                {servidor?.jornadas[0]
                  ? `${servidor.jornadas[0].jornada.codigo} - ${servidor.jornadas[0].jornada.nome}`
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
              <Text style={s.label}>Credito</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(totais.credito)}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Debito</Text>
              <Text style={s.value}>
                {minutosParaHoraRelatorio(totais.debito)}
              </Text>
            </View>
          </View>
          <View style={s.row}>
            <View style={s.infoBox}>
              <Text style={s.label}>Ausencias</Text>
              <Text style={s.value}>
                {resumoFuncional.ausencias} -{" "}
                {minutosParaHoraRelatorio(resumoFuncional.minutosAusencia)}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Atividades externas</Text>
              <Text style={s.value}>
                {resumoFuncional.atividadesExternas} -{" "}
                {minutosParaHoraRelatorio(
                  resumoFuncional.minutosAtividadeExterna,
                )}
              </Text>
            </View>
            <View style={s.infoBox}>
              <Text style={s.label}>Viagens a servico</Text>
              <Text style={s.value}>
                {resumoFuncional.viagensServico} -{" "}
                {minutosParaHoraRelatorio(
                  resumoFuncional.minutosViagemServico,
                )}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Espelho mensal</Text>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: "9%" }]}>Data</Text>
              <Text style={[s.th, { width: "21%" }]}>Marcacoes</Text>
              <Text style={[s.th, { width: "14%" }]}>Ocorrencias</Text>
              <Text style={[s.th, { width: "9%" }]}>Previsto</Text>
              <Text style={[s.th, { width: "10%" }]}>Trabalhado</Text>
              <Text style={[s.th, { width: "8%" }]}>Credito</Text>
              <Text style={[s.th, { width: "8%" }]}>Debito</Text>
              <Text style={[s.th, { width: "9%" }]}>Resultado</Text>
              <Text style={[s.th, { width: "12%" }]}>Conferencia</Text>
            </View>

            {dados.apuracoes.map((item) => {
              const chaveReferencia = chaveDataReferenciaUtc(
                item.dataReferencia,
              );
              const marcacoesDoDia = marcacoesPorDia.get(chaveReferencia) ?? [];
              const trabalhoRemoto = extrairTrabalhoRemoto(item.metadados);
              const classificacao = classificarDiaEspelho(item);
              const dispensaPonto = classificacao.dispensaPonto;
              const solicitacoesAplicadas =
                classificacao.solicitacoesAplicadas;
              const possuiMarcacaoAjustada =
                marcacoesDoDia.some(marcacaoPossuiAjuste);
              const conferencia = conferenciaEspelho(item.status, item);

              return (
                <View key={item.id} style={s.tableRow} wrap={false}>
                  <Text style={[s.td, { width: "9%" }]}>
                    {formatarDataRelatorio(item.dataReferencia)}
                  </Text>
                  <View style={[s.td, { width: "21%" }]}>
                    {dispensaPonto ? (
                      <Text style={badgeDispensa}>Dispensa de ponto</Text>
                    ) : trabalhoRemoto ? (
                      <Text style={badgeRemoto}>
                        {trabalhoRemoto.regime === "TOTAL"
                          ? "Teletrabalho"
                          : "Trabalho remoto"}
                      </Text>
                    ) : marcacoesDoDia.length > 0 ? (
                      <Text>
                        {marcacoesDoDia.map(formatarMarcacaoPdf).join("  ")}
                      </Text>
                    ) : (
                      <Text>-</Text>
                    )}
                  </View>
                  <View style={[s.td, { width: "14%" }]}>
                    <OcorrenciasDiaPdf
                      ausente={classificacao.ausente}
                      ausenciaParcial={classificacao.ausenciaParcial}
                      dispensaPonto={classificacao.dispensaPonto}
                      solicitacoes={solicitacoesAplicadas}
                    />
                  </View>
                  <Text style={[s.td, { width: "9%" }]}>
                    {minutosParaHoraRelatorio(item.cargaPrevistaMinutos)}
                  </Text>
                  <Text style={[s.td, { width: "10%" }]}>
                    {minutosParaHoraRelatorio(item.minutosTrabalhados)}
                  </Text>
                  <Text style={[s.td, { width: "8%" }]}>
                    {minutosParaHoraRelatorio(item.minutosCredito)}
                  </Text>
                  <View style={[s.td, { width: "8%" }]}>
                    <Text>{minutosParaHoraRelatorio(item.minutosDebito)}</Text>
                    {item.minutosDebitoCompensado &&
                      item.minutosDebitoCompensado > 0 && (
                        <Text style={{ marginTop: 2, fontSize: 6 }}>
                          Comp.{" "}
                          {minutosParaHoraRelatorio(
                            item.minutosDebitoCompensado,
                          )}
                        </Text>
                      )}
                  </View>
                  <Text style={[s.td, { width: "9%" }]}>{item.resultado}</Text>
                  <View style={[s.td, { width: "12%" }]}>
                    <Text
                      style={[
                        badgeConferenciaBase,
                        estiloConferencia(conferencia.tom),
                      ]}
                    >
                      {conferencia.rotulo}
                    </Text>
                    {possuiMarcacaoAjustada && (
                      <Text style={badgeAjuste}>Ajuste aplicado</Text>
                    )}
                    {solicitacoesAplicadas.map((solicitacao) => (
                      <Text key={solicitacao.id} style={badgeSolicitacao}>
                        {solicitacao.trabalhoRemoto
                          ? "Trabalho remoto deferido"
                          : `${rotuloSolicitacaoEspelho(
                              solicitacao.tipo,
                            )}: ${solicitacao.titulo}`}
                      </Text>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={{ marginTop: 4, fontSize: 7, color: "#6b7280" }}>
            * Marcacao manual ou ajustada por deferimento/rotina administrativa.
          </Text>
        </View>

        <Text style={s.footer}>
          Gerado pelo SECP em {new Date().toLocaleString("pt-BR")}.
        </Text>
      </Page>
    </Document>
  );
}

function OcorrenciasDiaPdf({
  ausente,
  ausenciaParcial,
  dispensaPonto,
  solicitacoes,
}: {
  ausente: boolean;
  ausenciaParcial: boolean;
  dispensaPonto: boolean;
  solicitacoes: SolicitacaoAplicadaEspelho[];
}) {
  const itens = [
    ...(ausente
      ? [{ chave: "ausencia", label: "Ausencia", tipo: "erro" as const }]
      : []),
    ...(ausenciaParcial
      ? [
          {
            chave: "ausencia-parcial",
            label: "Ausencia parcial",
            tipo: "alerta" as const,
          },
        ]
      : []),
    ...(dispensaPonto
      ? [
          {
            chave: "dispensa-ponto",
            label: "Dispensa de ponto",
            tipo: "ok" as const,
          },
        ]
      : []),
    ...solicitacoes
      .filter((solicitacao) =>
        ["ATIVIDADE_EXTERNA", "VIAGEM_SERVICO", "COMPENSACAO"].includes(
          solicitacao.tipo,
        ) ||
        (solicitacao.tipo === "DISPENSA_PONTO" && !dispensaPonto),
      )
      .map((solicitacao) => ({
        chave: solicitacao.id,
        label: rotuloSolicitacaoEspelho(solicitacao.tipo),
        tipo: "ok" as const,
      })),
  ];

  if (itens.length === 0) {
    return <Text>-</Text>;
  }

  return (
    <View>
      {itens.map((item) => (
        <Text
          key={item.chave}
          style={[
            badgeOcorrencia,
            item.tipo === "erro"
              ? {
                  borderColor: "#fecaca",
                  backgroundColor: "#fef2f2",
                  color: "#991b1b",
                }
              : item.tipo === "alerta"
                ? {
                    borderColor: "#fde68a",
                    backgroundColor: "#fffbeb",
                    color: "#92400e",
                  }
                : {
                    borderColor: "#a7f3d0",
                    backgroundColor: "#ecfdf5",
                    color: "#065f46",
                  },
          ]}
        >
          {item.label}
        </Text>
      ))}
    </View>
  );
}

function marcacaoPossuiAjuste(marcacao: MarcacaoPdfItem) {
  return (
    marcacao.status === "AJUSTADA" ||
    marcacao.fonte === "MANUAL_ADMINISTRATIVO" ||
    marcacao.tipo === "AJUSTE" ||
    marcacao.tipo === "MANUAL"
  );
}

function formatarMarcacaoPdf(marcacao: MarcacaoPdfItem) {
  const hora = formatarHoraManaus(marcacao.dataHora);

  return marcacaoPossuiAjuste(marcacao) ? `${hora}*` : hora;
}

function agruparMarcacoesPorDiaManaus(marcacoes: MarcacaoPdfItem[]) {
  const mapa = new Map<string, MarcacaoPdfItem[]>();

  for (const marcacao of marcacoes) {
    const chave = chaveDataHoraManaus(marcacao.dataHora);
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

function chaveDataHoraManaus(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

function formatarHoraManaus(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Manaus",
  }).format(data);
}

function estiloConferencia(tom: "ok" | "alerta" | "neutro") {
  if (tom === "ok") {
    return {
      borderColor: "#bbf7d0",
      backgroundColor: "#f0fdf4",
      color: "#166534",
    };
  }

  if (tom === "alerta") {
    return {
      borderColor: "#fde68a",
      backgroundColor: "#fffbeb",
      color: "#92400e",
    };
  }

  return {
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    color: "#334155",
  };
}

function extrairTrabalhoRemoto(metadados: unknown) {
  if (!metadados || typeof metadados !== "object") {
    return null;
  }

  const trabalhoRemoto = (metadados as { trabalhoRemoto?: unknown })
    .trabalhoRemoto;

  if (
    !trabalhoRemoto ||
    typeof trabalhoRemoto !== "object" ||
    !(trabalhoRemoto as { ativo?: unknown }).ativo
  ) {
    return null;
  }

  const dados = trabalhoRemoto as {
    regime?: unknown;
    descricao?: unknown;
  };

  return {
    regime: dados.regime === "HIBRIDO" ? "HIBRIDO" : "TOTAL",
    descricao:
      typeof dados.descricao === "string" ? dados.descricao : "Trabalho remoto",
  };
}
