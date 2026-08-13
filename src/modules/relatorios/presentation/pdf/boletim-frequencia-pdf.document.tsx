import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { readFileSync } from "node:fs";
import { nomeMesReferencia } from "../../application/services/formatar-relatorio.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

export type BoletimFrequenciaPdf = {
  unidade: {
    sigla: string;
    nome: string;
    uf?: string | null;
    orgao?: {
      sigla: string;
      nome: string;
    } | null;
  };
  anoReferencia: number;
  mesReferencia: number;
  status: string;
  processoSei: string | null;
  numeroSei: string | null;
  observacao: string | null;
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
  recebidoEm: Date | null;
  geradoPor: {
    nome: string;
  };
  encaminhadoPor: {
    nome: string;
  } | null;
  recebidoPor: {
    nome: string;
  } | null;
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
    ressalvas?: unknown;
    ocorrencias?: unknown;
    servidor: {
      matricula: string;
      nomeFuncional?: string | null;
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

type BoletimPdfProps = {
  boletim: BoletimFrequenciaPdf;
};

const AZUL_MODELO = "#000080";
const BORDA = "#a3a3a3";

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

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 28,
    paddingTop: 34,
    paddingBottom: 34,
    fontFamily: "Helvetica",
    color: "#111111",
    fontSize: 8,
  },
  header: {
    position: "relative",
    minHeight: 84,
  },
  orgao: {
    fontSize: 9,
    fontWeight: 700,
  },
  title: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 15,
    fontWeight: 700,
  },
  watermark: {
    position: "absolute",
    top: 0,
    left: 150,
    width: 185,
    height: 185,
    opacity: 0.08,
  },
  periodo: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 100,
  },
  periodoRow: {
    flexDirection: "row",
  },
  periodoBox: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d4d4d4",
    minHeight: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  bar: {
    backgroundColor: AZUL_MODELO,
    color: "#ffffff",
    fontSize: 7.5,
    fontWeight: 700,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  periodoValor: {
    fontSize: 10,
  },
  unidadeBox: {
    marginTop: 10,
  },
  unidadeRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d4d4d4",
    minHeight: 25,
  },
  unidadeSigla: {
    width: "11.5%",
    borderRightWidth: 1,
    borderColor: "#d4d4d4",
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  unidadeNome: {
    flexGrow: 1,
    paddingHorizontal: 6,
    paddingTop: 2,
  },
  label: {
    fontSize: 7,
    fontWeight: 700,
  },
  unidadeValor: {
    marginTop: 2,
    fontSize: 9.5,
  },
  demonstrativo: {
    marginTop: 5,
  },
  table: {
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: BORDA,
  },
  tableHeader: {
    flexDirection: "row",
    minHeight: 112,
    borderBottomWidth: 1,
    borderColor: BORDA,
  },
  servidorHeader: {
    width: "58%",
    justifyContent: "flex-end",
    padding: 4,
    borderRightWidth: 1,
    borderColor: BORDA,
  },
  ocorrenciaHeader: {
    width: "6.8%",
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderColor: BORDA,
  },
  verticalHeader: {
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderColor: BORDA,
  },
  verticalText: {
    fontSize: 7,
    transform: "rotate(-90deg)",
    textAlign: "center",
    width: 84,
  },
  totalHeader: {
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderColor: BORDA,
  },
  tableRow: {
    flexDirection: "row",
    minHeight: 16,
    borderBottomWidth: 1,
    borderColor: BORDA,
  },
  servidorCell: {
    width: "58%",
    flexDirection: "row",
    borderRightWidth: 1,
    borderColor: BORDA,
  },
  ocorrenciaCell: {
    width: "6.8%",
    borderRightWidth: 1,
    borderColor: BORDA,
  },
  matriculaCell: {
    width: "13.5%",
    paddingHorizontal: 2,
    justifyContent: "center",
    borderRightWidth: 1,
    borderColor: BORDA,
  },
  nomeCell: {
    flexGrow: 1,
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  numberCell: {
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderColor: BORDA,
  },
  bold: {
    fontWeight: 700,
  },
  signatureArea: {
    position: "absolute",
    left: 30,
    right: 30,
    bottom: 70,
    flexDirection: "row",
    gap: 5,
  },
  signatureBox: {
    flexGrow: 1,
  },
  signatureLine: {
    minHeight: 28,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d4d4d4",
    paddingHorizontal: 9,
    paddingTop: 5,
    fontSize: 8,
  },
  signatureLarge: {
    minHeight: 50,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#d4d4d4",
    paddingHorizontal: 9,
    paddingTop: 5,
    fontSize: 8,
  },
  observacao: {
    marginTop: 24,
    fontSize: 9,
  },
});

const colunas = {
  presenca: "2.65%",
  faltas: "2.75%",
  ferias: "2.75%",
  casamento: "2.75%",
  doacao: "2.75%",
  saude: "3.31%",
  familia: "3.31%",
  outras: "2.94%",
  afastamentos: "3.41%",
  atraso: "2.94%",
  antecipada: "2.94%",
  total: "2.75%",
};

const cabecalhos = [
  ["presenca", "PRESENÇA"],
  ["faltas", "FALTAS NÃO JUSTIFICADAS"],
  ["ferias", "FÉRIAS"],
  ["casamento", "CASAMENTO/LUTO"],
  ["doacao", "DOAÇÃO DE SANGUE"],
  ["saude", "TRATAMENTO DE SAÚDE"],
  ["familia", "TRATAMENTO DE SAÚDE PESSOA FAMÍLIA"],
  ["outras", "OUTRAS (ESPECIFICAR)"],
  ["afastamentos", "OUTROS AFASTAMENTOS"],
  ["atraso", "ENTRADAS COM ATRASO"],
  ["antecipada", "SAÍDAS ANTECIPADAS"],
] as const;

export function BoletimFrequenciaPdfDocument({ boletim }: BoletimPdfProps) {
  return <BoletinsFrequenciaPdfDocument boletins={[boletim]} />;
}

export function BoletinsFrequenciaPdfDocument({
  boletins,
}: {
  boletins: BoletimFrequenciaPdf[];
}) {
  const brasaoRepublica = `data:image/png;base64,${readFileSync(
    `${process.cwd()}/public/brasao-republica.png`,
  ).toString("base64")}`;

  return (
    <Document
      title={tituloDocumento(boletins)}
      author="SECP"
      subject="Boletim de Frequência"
      creator="SECP"
      producer="SECP"
    >
      {boletins.flatMap((boletim) =>
        renderizarPaginasBoletim({ boletim, brasaoRepublica }),
      )}
    </Document>
  );
}

function renderizarPaginasBoletim({
  boletim,
  brasaoRepublica,
}: {
  boletim: BoletimFrequenciaPdf;
  brasaoRepublica: string;
}) {
  const orgao = resolverNomeOficialOrgao(boletim.unidade);
  const linhas = boletim.servidores.map((item) => montarLinhaServidor(item));
  const paginasDemonstrativo = dividirEmPaginas(linhas, 18);
  const paginas = paginasDemonstrativo.map((linhasPagina, indice) => (
    <Page
      key={`${boletim.unidade.sigla}-demonstrativo-${indice}`}
      size="A4"
      orientation="portrait"
      style={styles.page}
    >
      <CabecalhoBoletim
        brasao={brasaoRepublica}
        orgao={orgao}
        mes={boletim.mesReferencia}
        ano={boletim.anoReferencia}
        folha={indice + 1}
      />

      <View style={styles.unidadeBox}>
        <Text style={styles.bar}>IDENTIFICAÇÃO DA UNIDADE ADMINISTRATIVA</Text>
        <View style={styles.unidadeRow}>
          <View style={styles.unidadeSigla}>
            <Text style={styles.label}>SIGLA</Text>
            <Text style={[styles.unidadeValor, { textAlign: "center" }]}>
              {boletim.unidade.sigla}
            </Text>
          </View>
          <View style={styles.unidadeNome}>
            <Text style={styles.label}>NOME</Text>
            <Text style={styles.unidadeValor}>
              {normalizarTexto(boletim.unidade.nome)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.demonstrativo}>
        <Text style={styles.bar}>DEMONSTRATIVO DE FREQUÊNCIA</Text>
        <View style={styles.table}>
          <CabecalhoTabela />
          {linhasPagina.map((linha) => (
            <LinhaTabela key={linha.matricula} linha={linha} />
          ))}
        </View>
      </View>

      {indice === paginasDemonstrativo.length - 1 && <Assinaturas />}
    </Page>
  ));

  paginas.push(
    <Page
      key={`${boletim.unidade.sigla}-observacao`}
      size="A4"
      orientation="portrait"
      style={styles.page}
    >
      <CabecalhoBoletim
        brasao={brasaoRepublica}
        orgao={orgao}
        mes={boletim.mesReferencia}
        ano={boletim.anoReferencia}
        folha={paginasDemonstrativo.length + 1}
      />
      <Text style={styles.observacao}>OBSERVAÇÃO</Text>
      {boletim.observacao ? (
        <Text style={{ marginTop: 12, fontSize: 9 }}>{boletim.observacao}</Text>
      ) : null}
    </Page>,
  );

  return paginas;
}

function tituloDocumento(boletins: BoletimFrequenciaPdf[]) {
  if (boletins.length === 1) {
    const boletim = boletins[0];
    return `Boletim de Frequência ${boletim.unidade.sigla} ${boletim.mesReferencia}/${boletim.anoReferencia}`;
  }

  return `Boletins de Frequência agrupados - ${boletins.length} unidades`;
}
function Assinaturas() {
  return (
    <View style={styles.signatureArea}>
      <View style={styles.signatureBox}>
        <Text style={styles.bar}>AUTENTICAÇÃO DO DIRIGENTE</Text>
        <Text style={styles.signatureLine}>DATA</Text>
        <Text style={styles.signatureLarge}>ASSINATURA</Text>
      </View>
      <View style={styles.signatureBox}>
        <Text style={styles.bar}>RECEBIMENTO PELA ÁREA RESPONSÁVEL</Text>
        <Text style={styles.signatureLine}>DATA</Text>
        <Text style={styles.signatureLarge}>ASSINATURA</Text>
      </View>
    </View>
  );
}

function CabecalhoBoletim({
  brasao,
  orgao,
  mes,
  ano,
  folha,
}: {
  brasao: string;
  orgao: string;
  mes: number;
  ano: number;
  folha: number;
}) {
  return (
    <View style={styles.header}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={brasao} style={styles.watermark} />
      <Text style={styles.orgao}>{orgao}</Text>
      <Text style={styles.title}>BOLETIM DE FREQUÊNCIA</Text>
      <View style={styles.periodo}>
        <Text style={styles.bar}>MÊS</Text>
        <View style={styles.periodoBox}>
          <Text style={styles.periodoValor}>
            {nomeMesReferencia(mes).toLocaleUpperCase("pt-BR")}
          </Text>
        </View>
        <View style={[styles.periodoRow, { marginTop: 5 }]}>
          <View style={{ width: "59%" }}>
            <Text style={styles.bar}>ANO</Text>
            <View style={styles.periodoBox}>
              <Text style={styles.periodoValor}>{ano}</Text>
            </View>
          </View>
          <View style={{ width: "41%" }}>
            <Text style={styles.bar}>FOLHA</Text>
            <View style={styles.periodoBox}>
              <Text style={styles.periodoValor}>{folha}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function CabecalhoTabela() {
  return (
    <View style={styles.tableHeader}>
      <View style={styles.servidorHeader}>
        <Text style={{ fontSize: 8 }}>REGISTRO / NOME DO SERVIDOR</Text>
      </View>
      <View style={styles.ocorrenciaHeader}>
        <Text style={styles.verticalText}>OCORRÊNCIA (EM DIAS)</Text>
      </View>
      {cabecalhos.map(([chave, label]) => (
        <View
          key={chave}
          style={[styles.verticalHeader, { width: colunas[chave] }]}
        >
          <Text style={styles.verticalText}>{label}</Text>
        </View>
      ))}
      <View style={[styles.totalHeader, { width: colunas.total }]}>
        <Text style={styles.verticalText}>TOTAL</Text>
      </View>
    </View>
  );
}

type LinhaServidor = ReturnType<typeof montarLinhaServidor>;

function LinhaTabela({ linha }: { linha: LinhaServidor }) {
  return (
    <View style={styles.tableRow} wrap={false}>
      <View style={styles.servidorCell}>
        <View style={styles.matriculaCell}>
          <Text>{linha.matricula}</Text>
        </View>
        <View style={styles.nomeCell}>
          <Text>{linha.nome}</Text>
        </View>
      </View>
      <View style={styles.ocorrenciaCell} />
      <Numero width={colunas.presenca} valor={linha.presenca} />
      <Numero width={colunas.faltas} valor={linha.faltas} />
      <Numero width={colunas.ferias} valor={linha.ferias} />
      <Numero width={colunas.casamento} valor={linha.casamento} />
      <Numero width={colunas.doacao} valor={linha.doacao} />
      <Numero width={colunas.saude} valor={linha.saude} />
      <Numero width={colunas.familia} valor={linha.familia} />
      <Numero width={colunas.outras} valor={linha.outras} />
      <Numero width={colunas.afastamentos} valor={linha.afastamentos} />
      <Numero width={colunas.atraso} valor={linha.atraso} />
      <Numero width={colunas.antecipada} valor={linha.antecipada} />
      <Numero width={colunas.total} valor={linha.total} negrito />
    </View>
  );
}

function Numero({
  width,
  valor,
  negrito = false,
}: {
  width: string;
  valor: number;
  negrito?: boolean;
}) {
  return (
    <View style={[styles.numberCell, { width }]}>
      <Text style={negrito ? styles.bold : undefined}>
        {valor > 0 ? valor : ""}
      </Text>
    </View>
  );
}

function montarLinhaServidor(
  item: BoletimPdfProps["boletim"]["servidores"][number],
) {
  const totalDias = calcularDiasReferencia(item);
  const faltas = Math.max(0, item.faltas);
  const categorias = extrairCategoriasOcorrencias(item.ocorrencias);
  const afastamentos =
    categorias.ferias +
    categorias.casamento +
    categorias.doacao +
    categorias.saude +
    categorias.familia +
    categorias.outras +
    categorias.afastamentos;
  const presenca = Math.max(0, totalDias - faltas - afastamentos);

  return {
    matricula: item.servidor.matricula,
    nome: normalizarTexto(nomeServidor(item.servidor) || "-"),
    presenca,
    faltas,
    ...categorias,
    atraso: 0,
    antecipada: 0,
    total: totalDias,
  };
}

function calcularDiasReferencia(
  item: BoletimPdfProps["boletim"]["servidores"][number],
) {
  return Math.max(0, Math.round(item.cargaPrevistaMinutos / 420));
}

function extrairCategoriasOcorrencias(ocorrencias: unknown) {
  const base = {
    ferias: 0,
    casamento: 0,
    doacao: 0,
    saude: 0,
    familia: 0,
    outras: 0,
    afastamentos: 0,
  };

  if (!ocorrencias || typeof ocorrencias !== "object") {
    return base;
  }

  const lista = Array.isArray(
    (ocorrencias as { pendencias?: unknown }).pendencias,
  )
    ? (ocorrencias as { pendencias: unknown[] }).pendencias
    : [];

  for (const item of lista) {
    const texto = JSON.stringify(item).toLocaleUpperCase("pt-BR");

    if (texto.includes("FÉRIAS") || texto.includes("FERIAS")) {
      base.ferias += 1;
    } else if (texto.includes("CASAMENTO") || texto.includes("LUTO")) {
      base.casamento += 1;
    } else if (texto.includes("SANGUE")) {
      base.doacao += 1;
    } else if (texto.includes("FAMÍLIA") || texto.includes("FAMILIA")) {
      base.familia += 1;
    } else if (texto.includes("SAÚDE") || texto.includes("SAUDE")) {
      base.saude += 1;
    }
  }

  return base;
}

function resolverNomeOficialOrgao(
  unidade: BoletimPdfProps["boletim"]["unidade"],
) {
  const estado = unidade.uf ? estadosPorUf[unidade.uf] : null;

  if (estado) {
    return `JUSTIÇA FEDERAL DE 1ª INSTÂNCIA ${estado}`;
  }

  return normalizarTexto(unidade.orgao?.nome ?? "JUSTIÇA FEDERAL");
}

function normalizarTexto(texto: string) {
  return texto.trim().toLocaleUpperCase("pt-BR");
}

function dividirEmPaginas<T>(itens: T[], tamanho: number) {
  if (itens.length === 0) {
    return [[]] as T[][];
  }

  const paginas: T[][] = [];

  for (let indice = 0; indice < itens.length; indice += tamanho) {
    paginas.push(itens.slice(indice, indice + tamanho));
  }

  return paginas;
}
