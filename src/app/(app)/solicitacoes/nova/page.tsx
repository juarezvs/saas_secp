import { ClipboardList } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { tiposSolicitacao } from "@/modules/solicitacoes/application/schemas/solicitacao.schema";
import { SolicitacaoForm } from "@/modules/solicitacoes/presentation/components/solicitacao-form";

type NovaSolicitacaoPageProps = {
  searchParams?: Promise<{
    tipo?: string;
    dataReferencia?: string;
    dataInicio?: string;
    dataFim?: string;
    horasSolicitadas?: string;
    tipoMarcacao?: string;
    horaAjuste?: string;
    passo?: string;
  }>;
};

function normalizarTipoSolicitacao(valor?: string | null) {
  return tiposSolicitacao.find((tipo) => tipo === valor) ?? "AJUSTE_PONTO";
}

function tipoUsaDataSimples(tipo: string) {
  return [
    "COMPENSACAO",
    "ABONO_JUSTIFICATIVA",
    "VIAGEM_SERVICO",
    "FOLGA_BANCO_HORAS",
  ].includes(tipo);
}

function normalizarPassoInicial(valor?: string, temDataReferencia = false) {
  if (!temDataReferencia) {
    return 0;
  }

  if (valor === "4") {
    return 3;
  }

  if (valor === "3") {
    return 2;
  }

  return 0;
}

function normalizarHorasSolicitadas(valor?: string) {
  const texto = String(valor ?? "").trim();
  const horaMinuto = /^(\d{1,2}):([0-5]\d)$/.exec(texto);

  if (horaMinuto) {
    const horas = Number(horaMinuto[1]) + Number(horaMinuto[2]) / 60;
    return horas > 0 && horas <= 16 ? Math.round(horas * 100) / 100 : undefined;
  }

  const horas = Number(texto.replace(",", "."));

  if (!Number.isFinite(horas) || horas <= 0 || horas > 16) {
    return undefined;
  }

  return Math.round(horas * 100) / 100;
}

function normalizarDataInicio(
  valor: string | undefined,
  dataReferencia: string,
) {
  if (!valor) {
    return `${dataReferencia}T00:00`;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? `${valor}T00:00` : valor;
}

function normalizarDataFim(valor: string | undefined, dataReferencia: string) {
  if (!valor) {
    return `${dataReferencia}T23:59`;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? `${valor}T23:59` : valor;
}

export default async function NovaSolicitacaoPage({
  searchParams,
}: NovaSolicitacaoPageProps) {
  await exigirPermissaoOuRedirecionar("solicitacoes:criar:proprio");
  const params = searchParams ? await searchParams : {};
  const tipoInicial = normalizarTipoSolicitacao(params.tipo);
  const dataReferencia = /^\d{4}-\d{2}-\d{2}$/.test(params.dataReferencia ?? "")
    ? params.dataReferencia
    : undefined;
  const passoInicial = normalizarPassoInicial(
    params.passo,
    Boolean(dataReferencia),
  );
  const horasSolicitadas = normalizarHorasSolicitadas(params.horasSolicitadas);
  const valoresIniciais = dataReferencia
    ? {
        tipo: tipoInicial,
        dataReferencia,
        dataInicio: tipoUsaDataSimples(tipoInicial)
          ? (params.dataInicio ?? dataReferencia)
          : normalizarDataInicio(params.dataInicio, dataReferencia),
        dataFim: tipoUsaDataSimples(tipoInicial)
          ? (params.dataFim ?? dataReferencia)
          : normalizarDataFim(params.dataFim, dataReferencia),
        horasSolicitadas,
        tipoMarcacao: params.tipoMarcacao,
        horaAjuste: params.horaAjuste,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Solicitações", href: "/solicitacoes" },
          { label: "Nova solicitacao" },
        ]}
      />

      <PageHeader
        icon={ClipboardList}
        titulo="Nova solicitacao"
        descricao="Registre pedidos de ajuste, abono, atividade externa, capacitacao, viagem, dispensa de ponto, teletrabalho ou autorizacao previa de horas."
        artigo="Arts. 8, 9, 10, 13, 14, 16 e 18"
        regraTitulo="Solicitação e análise pela chefia"
        regraDescricao="Pedidos que impactam a frequencia devem registrar periodo, justificativa, decisao da chefia e efeitos na apuracao."
      />

      <SolicitacaoForm
        key={`${tipoInicial}-${dataReferencia ?? ""}-${passoInicial}`}
        tipoInicial={tipoInicial}
        valoresIniciais={valoresIniciais}
        etapaInicial={passoInicial}
      />
    </div>
  );
}
