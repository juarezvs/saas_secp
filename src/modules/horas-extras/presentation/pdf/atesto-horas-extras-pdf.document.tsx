import { Document, Page, Text, View } from "@react-pdf/renderer";

import { pdfStyles as s } from "@/modules/relatorios/presentation/pdf/pdf-styles";

type ServidorSnapshotAtesto = {
  matricula?: string;
  nome?: string;
  unidade?: string | null;
  autorizadoMinutos?: number;
  totais?: Record<string, number>;
};

type SnapshotAtesto = {
  processoSei?: string;
  documentoAutorizacao?: string;
  mesReferencia?: string;
  servidores?: ServidorSnapshotAtesto[];
  totais?: Record<string, number>;
};

type AtestoHorasExtrasPdfDocumentProps = {
  atesto: {
    texto: string;
    emitidoEm: Date;
    snapshot: unknown;
    gestor: {
      nome: string;
      matricula: string;
    };
    autorizacao: {
      processoSei: string;
      documentoAutorizacao: string;
      mesReferencia: string;
      orgao: {
        sigla: string;
        nome: string;
      };
      unidade: {
        sigla: string;
        nome: string;
      };
    };
  };
};

const CATEGORIAS = [
  "HORA_EXTRA_RECONHECIDA",
  "COMPENSACAO_DEBITO",
  "EXCEDENTE_A_AUTORIZACAO",
  "FORA_FAIXA_PERMITIDA",
  "NAO_AUTORIZADA",
] as const;

const ROTULOS: Record<(typeof CATEGORIAS)[number], string> = {
  HORA_EXTRA_RECONHECIDA: "Reconhecida",
  COMPENSACAO_DEBITO: "Comp. debito",
  EXCEDENTE_A_AUTORIZACAO: "Excedente",
  FORA_FAIXA_PERMITIDA: "Fora faixa",
  NAO_AUTORIZADA: "Nao autorizada",
};

function snapshotAtesto(valor: unknown): SnapshotAtesto {
  return valor && typeof valor === "object" ? (valor as SnapshotAtesto) : {};
}

function minutosParaHora(minutos?: number | null) {
  const total = Math.max(0, minutos ?? 0);
  const horas = Math.floor(total / 60);
  const resto = total % 60;

  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function formatarDataHora(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Manaus",
  }).format(data);
}

export function AtestoHorasExtrasPdfDocument({
  atesto,
}: AtestoHorasExtrasPdfDocumentProps) {
  const snapshot = snapshotAtesto(atesto.snapshot);
  const servidores = snapshot.servidores ?? [];
  const totais = snapshot.totais ?? {};

  return (
    <Document
      title={`Atesto de horas extras ${atesto.autorizacao.mesReferencia}`}
      author="SECP"
      subject="Atesto de servico extraordinario"
      creator="SECP"
      producer="SECP"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <Text style={s.orgao}>
            {atesto.autorizacao.orgao.sigla} - {atesto.autorizacao.orgao.nome}
          </Text>
          <Text style={s.title}>Atesto de Horas Extras</Text>
          <Text style={s.subtitle}>
            Processo {atesto.autorizacao.processoSei} | Documento{" "}
            {atesto.autorizacao.documentoAutorizacao} | Competencia{" "}
            {atesto.autorizacao.mesReferencia}
          </Text>
          <Text style={s.subtitle}>
            Unidade {atesto.autorizacao.unidade.sigla} -{" "}
            {atesto.autorizacao.unidade.nome}
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Declaracao</Text>
          <Text style={{ fontSize: 10, lineHeight: 1.5 }}>{atesto.texto}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Resumo consolidado</Text>
          <View style={s.row}>
            {CATEGORIAS.map((categoria) => (
              <View key={categoria} style={s.infoBox}>
                <Text style={s.label}>{ROTULOS[categoria]}</Text>
                <Text style={s.value}>{minutosParaHora(totais[categoria])}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Servidores atestados</Text>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: "10%" }]}>Matricula</Text>
              <Text style={[s.th, { width: "24%" }]}>Servidor</Text>
              <Text style={[s.th, { width: "24%" }]}>Unidade</Text>
              <Text style={[s.th, { width: "10%" }]}>Autorizado</Text>
              <Text style={[s.th, { width: "10%" }]}>Reconhecida</Text>
              <Text style={[s.th, { width: "10%" }]}>Comp. debito</Text>
              <Text style={[s.th, { width: "12%" }]}>Pendencias</Text>
            </View>

            {servidores.map((servidor) => {
              const pendencias =
                (servidor.totais?.EXCEDENTE_A_AUTORIZACAO ?? 0) +
                (servidor.totais?.FORA_FAIXA_PERMITIDA ?? 0) +
                (servidor.totais?.NAO_AUTORIZADA ?? 0);

              return (
                <View key={`${servidor.matricula}-${servidor.nome}`} style={s.tableRow}>
                  <Text style={[s.td, { width: "10%" }]}>
                    {servidor.matricula ?? "-"}
                  </Text>
                  <Text style={[s.td, { width: "24%" }]}>
                    {servidor.nome ?? "-"}
                  </Text>
                  <Text style={[s.td, { width: "24%" }]}>
                    {servidor.unidade ?? "-"}
                  </Text>
                  <Text style={[s.td, { width: "10%" }]}>
                    {minutosParaHora(servidor.autorizadoMinutos)}
                  </Text>
                  <Text style={[s.td, { width: "10%" }]}>
                    {minutosParaHora(servidor.totais?.HORA_EXTRA_RECONHECIDA)}
                  </Text>
                  <Text style={[s.td, { width: "10%" }]}>
                    {minutosParaHora(servidor.totais?.COMPENSACAO_DEBITO)}
                  </Text>
                  <Text style={[s.td, { width: "12%" }]}>
                    {minutosParaHora(pendencias)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Responsavel pelo atesto</Text>
          <Text>
            {atesto.gestor.nome} - matricula {atesto.gestor.matricula}
          </Text>
          <Text>Emitido em {formatarDataHora(atesto.emitidoEm)}</Text>
        </View>

        <Text style={s.footer}>
          Documento gerado pelo SECP a partir do snapshot do atesto registrado.
        </Text>
      </Page>
    </Document>
  );
}
