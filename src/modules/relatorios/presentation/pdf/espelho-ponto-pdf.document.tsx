import {
  Document,
  Image,
  Page,
  Path,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { pdfStyles as s } from "./pdf-styles";
import {
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
      cpf?: string | null;
      nomeFuncional?: string | null;
      cargo?: {
        descricao: string;
      } | null;
      usuario: {
        nome: string;
      };
      lotacoes: {
        unidade: {
          sigla: string;
          nome: string;
        };
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
};

type MarcacaoPdfItem = {
  id: string;
  dataHora: Date;
  dataReferencia: Date;
  fusoHorario?: string | null;
  tipo: string;
  fonte?: string | null;
  status: string;
};

type DiaInstitucionalEspelho = {
  tipo: string;
  descricao: string;
  contaComoDiaUtil: boolean;
  geraApuracaoRegular: boolean;
};

type ApuracaoEspelhoPdfItem =
  EspelhoPontoPdfProps["dados"]["apuracoes"][number];

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

const observacaoMarcacoes = {
  color: "#334155",
  fontSize: 7,
  fontWeight: 600,
};

const statusIndicadorBase = {
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

function estimarPesoLinhaEspelho(item: ApuracaoEspelhoPdfItem) {
  const classificacao = classificarDiaEspelho(item);
  const solicitacoes = classificacao.solicitacoesAplicadas.length;
  const ocorrencias = item.ocorrencias?.length ?? 0;
  const temDebitoCompensado = (item.minutosDebitoCompensado ?? 0) > 0;
  const diaInstitucional = extrairDiaInstitucional(item.metadados);
  const trabalhoRemoto = extrairTrabalhoRemoto(item.metadados);
  const justificativaAusenciaMesclada = encontrarJustificativaAusenciaMesclada(
    classificacao.solicitacoesAplicadas,
  );

  let peso = 1;

  if (ocorrencias > 1) {
    peso += Math.min(1.4, (ocorrencias - 1) * 0.35);
  }

  if (solicitacoes > 1) {
    peso += Math.min(1.2, (solicitacoes - 1) * 0.35);
  }

  if (diaInstitucional || trabalhoRemoto || justificativaAusenciaMesclada) {
    peso += 0.25;
  }

  if (temDebitoCompensado) {
    peso += 0.25;
  }

  return peso;
}

function paginarApuracoesEspelho(apuracoes: ApuracaoEspelhoPdfItem[]) {
  if (apuracoes.length === 0) {
    return [[]] as ApuracaoEspelhoPdfItem[][];
  }

  const capacidadePrimeiraPagina = 16;
  const capacidadeDemaisPaginas = 16;
  const paginas: ApuracaoEspelhoPdfItem[][] = [];
  let paginaAtual: ApuracaoEspelhoPdfItem[] = [];
  let pesoAtual = 0;

  for (const item of apuracoes) {
    const capacidade =
      paginas.length === 0 ? capacidadePrimeiraPagina : capacidadeDemaisPaginas;
    const pesoLinha = estimarPesoLinhaEspelho(item);

    if (paginaAtual.length > 0 && pesoAtual + pesoLinha > capacidade) {
      paginas.push(paginaAtual);
      paginaAtual = [];
      pesoAtual = 0;
    }

    paginaAtual.push(item);
    pesoAtual += pesoLinha;
  }

  if (paginaAtual.length > 0) {
    paginas.push(paginaAtual);
  }

  return paginas;
}

export function EspelhoPontoPdfDocument({ dados }: EspelhoPontoPdfProps) {
  const servidor = dados.servidor;
  const marcacoesPorDia = agruparMarcacoesPorDia(dados.marcacoes);

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
  const paginas = paginarApuracoesEspelho(dados.apuracoes);

  return (
    <Document
      title={`Espelho de Ponto ${servidor?.matricula ?? ""}`}
      author="SECP"
      subject="Espelho de Ponto"
      creator="SECP"
      producer="SECP"
    >
      {paginas.map((apuracoesPagina, indicePagina) => (
        <Page
          key={`pagina-${indicePagina}`}
          size="A4"
          orientation="portrait"
          style={[s.page, { paddingTop: 328, paddingBottom: 42 }]}
        >
          <CabecalhoPremiumEspelho
            servidor={servidor}
            ano={dados.ano}
            mes={dados.mes}
          />

          <TabelaEspelhoPdf
            titulo={
              indicePagina === 0
                ? "Espelho mensal"
                : "Espelho mensal - continuação"
            }
            apuracoes={apuracoesPagina}
            marcacoesPorDia={marcacoesPorDia}
          />

          {indicePagina === paginas.length - 1 && (
            <TotaisEspelhoPdf
              totais={totais}
              resumoFuncional={resumoFuncional}
            />
          )}

          <Text
            fixed
            style={s.footer}
            render={({ pageNumber, totalPages }) =>
              `Gerado pelo SECP em ${new Date().toLocaleString(
                "pt-BR",
              )}. Página ${pageNumber} de ${totalPages}.`
            }
          >
            Gerado pelo SECP.
          </Text>
        </Page>
      ))}
    </Document>
  );
}

function TotaisEspelhoPdf({
  totais,
  resumoFuncional,
}: {
  totais: {
    previsto: number;
    trabalhado: number;
    credito: number;
    debito: number;
  };
  resumoFuncional: ReturnType<typeof resumirEspelhoMensal>;
}) {
  return (
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
          <Text style={s.value}>{minutosParaHoraRelatorio(totais.debito)}</Text>
        </View>
      </View>
      <View style={s.row}>
        <View style={s.infoBox}>
          <Text style={s.label}>Ausências</Text>
          <Text style={s.value}>
            {resumoFuncional.ausencias} -{" "}
            {minutosParaHoraRelatorio(resumoFuncional.minutosAusencia)}
          </Text>
        </View>
        <View style={s.infoBox}>
          <Text style={s.label}>Atividades externas</Text>
          <Text style={s.value}>
            {resumoFuncional.atividadesExternas} -{" "}
            {minutosParaHoraRelatorio(resumoFuncional.minutosAtividadeExterna)}
          </Text>
        </View>
        <View style={s.infoBox}>
          <Text style={s.label}>Viagens a serviço</Text>
          <Text style={s.value}>
            {resumoFuncional.viagensServico} -{" "}
            {minutosParaHoraRelatorio(resumoFuncional.minutosViagemServico)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function TabelaEspelhoPdf({
  titulo,
  apuracoes,
  marcacoesPorDia,
}: {
  titulo: string;
  apuracoes: EspelhoPontoPdfProps["dados"]["apuracoes"];
  marcacoesPorDia: Map<string, MarcacaoPdfItem[]>;
}) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{titulo}</Text>

      <View style={s.table}>
        <CabecalhoTabelaEspelhoPdf />

        {apuracoes.map((item) => {
          const chaveReferencia = chaveDataReferenciaUtc(item.dataReferencia);
          const marcacoesDoDia = marcacoesPorDia.get(chaveReferencia) ?? [];
          const trabalhoRemoto = extrairTrabalhoRemoto(item.metadados);
          const classificacao = classificarDiaEspelho(item);
          const diaInstitucional = extrairDiaInstitucional(item.metadados);
          const dispensaPonto = classificacao.dispensaPonto;
          const solicitacoesAplicadas = classificacao.solicitacoesAplicadas;
          const justificativaAusenciaMesclada =
            encontrarJustificativaAusenciaMesclada(solicitacoesAplicadas);
          const conferencia = conferenciaEspelho(item.status, item);
          const minutosDebitoCompensado = item.minutosDebitoCompensado ?? 0;
          const mesclarMarcacoesOcorrencias =
            !dispensaPonto &&
            !trabalhoRemoto &&
            marcacoesDoDia.length === 0 &&
            (Boolean(diaInstitucional) ||
              Boolean(justificativaAusenciaMesclada)) &&
            !ehFimDeSemanaInstitucional(diaInstitucional);

          return (
            <View key={item.id} style={s.tableRow} wrap={false}>
              <View style={[s.td, { width: "7%" }]}>
                <StatusIndicadorPdf conferencia={conferencia} />
              </View>
              <Text style={[s.td, { width: "14%" }]}>
                {formatarDataReferenciaPdf(item.dataReferencia)}
              </Text>
              <View style={[s.td, { width: "39%" }]}>
                {mesclarMarcacoesOcorrencias ? (
                  diaInstitucional ? (
                    <Text style={observacaoMarcacoes}>
                      {rotuloDiaInstitucional(diaInstitucional)}
                    </Text>
                  ) : (
                    <Text style={observacaoMarcacoes}>
                      {rotuloSolicitacaoEspelho(
                        justificativaAusenciaMesclada!.tipo,
                      )}
                      : {justificativaAusenciaMesclada!.titulo}
                    </Text>
                  )
                ) : dispensaPonto ? (
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
                ) : diaInstitucional &&
                  !ehFimDeSemanaInstitucional(diaInstitucional) ? (
                  <Text style={observacaoMarcacoes}>
                    {rotuloDiaInstitucional(diaInstitucional)}
                  </Text>
                ) : (
                  <Text>-</Text>
                )}

                {!mesclarMarcacoesOcorrencias && (
                  <View style={{ marginTop: 2 }}>
                    <OcorrenciasDiaPdf
                      ocultarVazio
                      ocultarDispensaPonto={dispensaPonto}
                      ausente={classificacao.ausente}
                      ausenciaParcial={classificacao.ausenciaParcial}
                      dispensaPonto={classificacao.dispensaPonto}
                      diaInstitucional={diaInstitucional}
                      ocorrencias={item.ocorrencias ?? []}
                      solicitacoes={solicitacoesAplicadas}
                    />
                  </View>
                )}
              </View>
              <Text style={[s.td, { width: "9%" }]}>
                {minutosParaHoraRelatorio(item.cargaPrevistaMinutos)}
              </Text>
              <Text style={[s.td, { width: "11%" }]}>
                {minutosParaHoraRelatorio(item.minutosTrabalhados)}
              </Text>
              <Text style={[s.td, { width: "10%" }]}>
                {minutosParaHoraRelatorio(item.minutosCredito)}
              </Text>
              <View style={[s.td, { width: "10%" }]}>
                <Text>{minutosParaHoraRelatorio(item.minutosDebito)}</Text>
                {minutosDebitoCompensado > 0 && (
                  <Text style={{ marginTop: 2, fontSize: 6 }}>
                    Comp. {minutosParaHoraRelatorio(minutosDebitoCompensado)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        {apuracoes.length === 0 && (
          <View style={s.tableRow}>
            <Text style={[s.td, { width: "100%" }]}>
              Nenhuma apuração calculada para o mês.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function CabecalhoTabelaEspelhoPdf() {
  return (
    <View style={s.tableHeader}>
      <Text style={[s.th, { width: "7%" }]} />
      <Text style={[s.th, { width: "14%" }]}>Data</Text>
      <Text style={[s.th, { width: "39%" }]}>Marcações</Text>
      <Text style={[s.th, { width: "9%" }]}>Previsto</Text>
      <Text style={[s.th, { width: "11%" }]}>Trabalhado</Text>
      <Text style={[s.th, { width: "10%" }]}>Crédito</Text>
      <Text style={[s.th, { width: "10%" }]}>Débito</Text>
    </View>
  );
}

function CabecalhoPremiumEspelho({
  servidor,
  ano,
  mes,
}: {
  servidor: EspelhoPontoPdfProps["dados"]["servidor"];
  ano: number;
  mes: number;
}) {
  const lotacao = servidor?.lotacoes[0]
    ? `${servidor.lotacoes[0].unidade.sigla} - ${servidor.lotacoes[0].unidade.nome}`
    : "-";
  const jornada = servidor?.jornadas[0]
    ? `${servidor.jornadas[0].jornada.codigo} - ${servidor.jornadas[0].jornada.nome}`
    : "-";
  const cargo =
    servidor?.cargo?.descricao ??
    servidor?.lotacoes.find((lotacao) => lotacao.cargo?.descricao)?.cargo
      ?.descricao ??
    null;
  const competencia = `${nomeMesReferencia(mes)} de ${ano}`;
  const emissao = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
  const brasaoRepublica = `data:image/png;base64,${readFileSync(
    `${process.cwd()}/public/brasao-republica.png`,
  ).toString("base64")}`;

  return (
    <View
      fixed
      style={{
        position: "absolute",
        top: 58,
        left: 40,
        right: 40,
        height: 246,
        borderWidth: 1,
        borderColor: "#d6d6d6",
        borderRadius: 3,
        backgroundColor: "#ffffff",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: "#d6d6d6",
          paddingHorizontal: 12,
          paddingVertical: 9,
        }}
      >
        <Text style={{ fontSize: 12 }}>
          Espelho de ponto referente a{" "}
          <Text style={{ fontWeight: 700 }}>{competencia}</Text>
        </Text>
      </View>

      <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#d6d6d6",
            flexDirection: "row",
            alignItems: "center",
            minHeight: 92,
            paddingTop: 8,
            paddingBottom: 8,
          }}
        >
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image
            src={brasaoRepublica}
            style={{ width: 84, height: 96, objectFit: "contain" }}
          />
          <View style={{ marginLeft: 10 }}>
            <Text style={{ fontSize: 12, marginBottom: 5 }}>
              PODER JUDICIÁRIO
            </Text>
            <Text style={{ fontSize: 12, marginBottom: 5 }}>
              Tribunal Regional Federal da 1ª Região
            </Text>
            <Text style={{ fontSize: 12 }}>Espelho de Ponto</Text>
          </View>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#d6d6d6",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <LinhaCabecalhoEspelho>
            <Text>
              Servidor:{" "}
              <Text style={{ fontWeight: 700 }}>
                {nomeServidor(servidor) || "-"} ({servidor?.matricula ?? "-"})
              </Text>{" "}
              CPF:{" "}
              <Text style={{ fontWeight: 700 }}>
                {formatarCpfEspelho(servidor?.cpf)}
              </Text>
            </Text>
          </LinhaCabecalhoEspelho>

          <LinhaCabecalhoEspelho>
            <Text>
              Cargo: <Text style={{ fontWeight: 700 }}>{cargo ?? "-"}</Text>
            </Text>
          </LinhaCabecalhoEspelho>

          <LinhaCabecalhoEspelho>
            <Text>
              Lotação: <Text style={{ fontWeight: 700 }}>{lotacao}</Text>
            </Text>
          </LinhaCabecalhoEspelho>

          <LinhaCabecalhoEspelho>
            <Text>
              Jornada: <Text style={{ fontWeight: 700 }}>{jornada}</Text>
            </Text>
          </LinhaCabecalhoEspelho>

          <LinhaCabecalhoEspelho ultima>
            <Text>
              Competência:{" "}
              <Text style={{ fontWeight: 700 }}>{competencia}</Text> Emissão:{" "}
              <Text style={{ fontWeight: 700 }}>{emissao}</Text>
            </Text>
          </LinhaCabecalhoEspelho>
        </View>
      </View>
    </View>
  );
}

function LinhaCabecalhoEspelho({
  children,
  ultima = false,
}: {
  children: ReactNode;
  ultima?: boolean;
}) {
  return (
    <View
      style={{
        borderBottomWidth: ultima ? 0 : 1,
        borderBottomColor: "#d6d6d6",
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Text style={{ fontSize: 10, lineHeight: 1.25 }}>{children}</Text>
    </View>
  );
}

function formatarCpfEspelho(cpf?: string | null) {
  const digitos = cpf?.replace(/\D/g, "") ?? "";

  if (digitos.length !== 11) {
    return "-";
  }

  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(
    6,
    9,
  )}-${digitos.slice(9)}`;
}
function StatusIndicadorPdf({
  conferencia,
}: {
  conferencia: ReturnType<typeof conferenciaEspelho>;
}) {
  const indicador =
    conferencia.tom === "ok"
      ? "ok"
      : conferencia.tom === "alerta"
        ? "alerta"
        : "neutro";

  return (
    <View style={statusIndicadorBase}>
      <StatusIconePdf tom={indicador} />
    </View>
  );
}

function StatusIconePdf({ tom }: { tom: "ok" | "alerta" | "neutro" }) {
  if (tom === "ok") {
    return (
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Path
          d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10Z"
          fill="#059669"
        />
        <Path
          d="m10.2 14.7-2.9-2.9-1.4 1.4 4.3 4.3 8-8-1.4-1.4-6.6 6.6Z"
          fill="#ffffff"
        />
      </Svg>
    );
  }

  if (tom === "alerta") {
    return (
      <Svg width={15} height={15} viewBox="0 0 24 24">
        <Path d="M12 2 1 21h22L12 2Z" fill="#dc2626" />
        <Path d="M11 8h2v6h-2V8Zm0 8h2v2h-2v-2Z" fill="#ffffff" />
      </Svg>
    );
  }

  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path
        d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10Z"
        fill="#d97706"
      />
      <Path d="M11 6h2v7h-2V6Zm1 8 5 3-1 1.7-6-3.6V14h2Z" fill="#ffffff" />
    </Svg>
  );
}

function OcorrenciasDiaPdf({
  ocultarVazio = false,
  ocultarDispensaPonto = false,
  ausente,
  ausenciaParcial,
  dispensaPonto,
  diaInstitucional,
  ocorrencias,
  solicitacoes,
}: {
  ocultarVazio?: boolean;
  ocultarDispensaPonto?: boolean;
  ausente: boolean;
  ausenciaParcial: boolean;
  dispensaPonto: boolean;
  diaInstitucional: DiaInstitucionalEspelho | null;
  ocorrencias: EspelhoPontoPdfProps["dados"]["apuracoes"][number]["ocorrencias"];
  solicitacoes: SolicitacaoAplicadaEspelho[];
}) {
  const itens = [
    ...(diaInstitucional && !ehFimDeSemanaInstitucional(diaInstitucional)
      ? [
          {
            chave: `dia-institucional-${diaInstitucional.tipo}`,
            label: rotuloDiaInstitucional(diaInstitucional),
            tipo: diaInstitucional.geraApuracaoRegular
              ? ("alerta" as const)
              : ("neutro" as const),
          },
        ]
      : []),
    ...(ausente
      ? [{ chave: "ausencia", label: "Ausência", tipo: "erro" as const }]
      : []),
    ...(ausenciaParcial
      ? [
          {
            chave: "ausencia-parcial",
            label: "Ausência parcial",
            tipo: "alerta" as const,
          },
        ]
      : []),
    ...(dispensaPonto && !ocultarDispensaPonto
      ? [
          {
            chave: "dispensa-ponto",
            label: "Dispensa de ponto",
            tipo: "ok" as const,
          },
        ]
      : []),
    ...(ocorrencias ?? [])
      .filter(
        (ocorrencia) =>
          !["FALTA", "DEBITO"].includes(ocorrencia.tipo) &&
          !(
            diaInstitucional &&
            ["SEM_EXPEDIENTE", diaInstitucional.tipo].includes(ocorrencia.tipo)
          ),
      )
      .map((ocorrencia, index) => ({
        chave: `ocorrencia-${index}-${ocorrencia.tipo}`,
        label: rotuloOcorrenciaEspelho(ocorrencia),
        tipo:
          ocorrencia.tipo === "CREDITO" ? ("ok" as const) : ("alerta" as const),
      })),
    ...solicitacoes
      .filter(
        (solicitacao) =>
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
    if (ocultarVazio) {
      return null;
    }

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
                : item.tipo === "neutro"
                  ? {
                      borderColor: "#bfdbfe",
                      backgroundColor: "#eff6ff",
                      color: "#1e40af",
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
  const hora = formatarHoraLocal(marcacao.dataHora, marcacao.fusoHorario);

  return marcacaoPossuiAjuste(marcacao) ? `${hora}*` : hora;
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

function formatarDataReferenciaPdf(valor: Date | string) {
  const data = valor instanceof Date ? valor : new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "-";
  }

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(data);
  const diaSemana = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  })
    .format(data)
    .replace(".", "")
    .slice(0, 3);

  return `${dataFormatada} - ${diaSemana}`;
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

function rotuloOcorrenciaEspelho(ocorrencia: {
  tipo: string;
  descricao?: string | null;
}) {
  if (ocorrencia.tipo === "AFASTAMENTO") {
    return rotuloAfastamentoEspelho(ocorrencia.descricao);
  }

  const rotulos: Record<string, string> = {
    MARCACAO_INCOMPLETA: "Marcações incompletas",
    INTERVALO_INVALIDO: "Intervalo inválido",
    CREDITO: "Crédito",
    DEBITO: "Débito",
    FALTA: "Falta",
    SEM_JORNADA: "Sem jornada",
    HORA_NAO_AUTORIZADA: "Hora fora do expediente",
  };

  return rotulos[ocorrencia.tipo] ?? ocorrencia.tipo.replaceAll("_", " ");
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

function encontrarJustificativaAusenciaMesclada(
  solicitacoes: SolicitacaoAplicadaEspelho[],
) {
  const tiposJustificamAusencia = new Set([
    "ABONO_JUSTIFICATIVA",
    "ATIVIDADE_EXTERNA",
    "VIAGEM_SERVICO",
    "CAPACITACAO",
    "COMPENSACAO",
    "FOLGA_BANCO_HORAS",
  ]);

  return (
    solicitacoes.find(
      (solicitacao) =>
        solicitacao.coberturaIntegral &&
        !solicitacao.trabalhoRemoto &&
        tiposJustificamAusencia.has(solicitacao.tipo),
    ) ?? null
  );
}

function ehFimDeSemanaInstitucional(dia: DiaInstitucionalEspelho | null) {
  return dia?.tipo === "SABADO" || dia?.tipo === "DOMINGO";
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
