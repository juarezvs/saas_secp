import {
  DataTableShell,
  DataTableToolbar,
  StandardDataTable,
  type DataTableFiltro,
} from "@/components/listagens";
import { excluirSolicitacaoAction } from "../../application/actions/excluir-solicitacao.action";
import {
  rotuloStatusSolicitacao,
  rotuloTipoSolicitacao,
} from "../../application/services/fluxo-solicitacao.service";
import { dataPeriodoSolicitacaoParaExibicao } from "../../application/services/periodo-solicitacao.service";
import { resolverFusoHorarioUnidade } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

type SolicitacaoItem = {
  id: string;
  tipo: string;
  status: string;
  titulo: string;
  criadoEm: Date;
  dataReferencia: Date | null;
  dataInicio: Date | null;
  dataFim: Date | null;
  usuarioSolicitanteId: string;
  servidor: {
    matricula: string;
    nomeFuncional?: string | null;
    usuario: { nome: string };
  };
  unidade: {
    sigla: string;
    codigo?: string | null;
    nome?: string | null;
    fusoHorario?: string | null;
  } | null;
  analisadaPor: { nome: string; matricula: string } | null;
};
type ServidorFiltroItem = {
  id: string;
  matricula: string;
  nomeFuncional?: string | null;
  usuario: { nome: string };
};
const tipos = [
  "AJUSTE_PONTO",
  "EXCLUSAO_MARCACAO",
  "COMPENSACAO",
  "ABONO_JUSTIFICATIVA",
  "ATIVIDADE_EXTERNA",
  "VIAGEM_SERVICO",
  "CAPACITACAO",
  "DISPENSA_PONTO",
  "HORA_CREDITO_PREVIA",
  "FOLGA_BANCO_HORAS",
  "CONVERSAO_DIA_ESPECIAL_BANCO_HORAS",
  "CONVERSAO_EXCEDENTE_BANCO_HORAS",
];
function formatarData(data: Date | null, fuso = "UTC") {
  return data
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: fuso }).format(data)
    : null;
}
function periodo(item: SolicitacaoItem) {
  if (item.dataReferencia) return formatarData(item.dataReferencia) ?? "-";
  const fuso = resolverFusoHorarioUnidade(item.unidade);
  const inicio = formatarData(
    dataPeriodoSolicitacaoParaExibicao(item.tipo, item.dataInicio, "inicio"),
    fuso,
  );
  const fim = formatarData(
    dataPeriodoSolicitacaoParaExibicao(item.tipo, item.dataFim, "fim"),
    fuso,
  );
  return inicio && fim && inicio !== fim
    ? `${inicio} a ${fim}`
    : (inicio ?? fim ?? "-");
}

export function SolicitacoesTable({
  solicitacoes,
  tipoSelecionado,
  competencia,
  servidorFiltro,
  servidoresFiltro = [],
  mostrarFiltroServidor,
  paginacao,
  usuarioIdAtual,
  podeExcluirSolicitacoes = true,
}: {
  solicitacoes: SolicitacaoItem[];
  tipoSelecionado?: string;
  competencia: string;
  servidorFiltro?: string;
  servidoresFiltro?: ServidorFiltroItem[];
  mostrarFiltroServidor?: boolean;
  usuarioIdAtual?: string;
  podeExcluirSolicitacoes?: boolean;
  paginacao?: {
    total: number;
    pagina: number;
    totalPaginas: number;
    itensPorPagina: number;
    montarHrefPagina: (pagina: number) => string;
  };
}) {
  const filtros: DataTableFiltro[] = [
    {
      nome: "competencia",
      label: "Competência",
      tipo: "competencia",
      defaultValue: competencia,
    },
    {
      nome: "tipo",
      label: "Tipo",
      tipo: "select",
      defaultValue: tipoSelecionado,
      options: [
        { value: "", label: "Todos" },
        ...tipos.map((tipo) => ({
          value: tipo,
          label: rotuloTipoSolicitacao(tipo),
        })),
      ],
    },
  ];
  if (mostrarFiltroServidor)
    filtros.push({
      nome: "servidor",
      label: "Servidor",
      tipo: "searchable-select",
      defaultValue: servidorFiltro,
      options: [
        { value: "", label: "Todos" },
        ...servidoresFiltro.map((servidor) => ({
          value: `${servidor.matricula} - ${nomeServidor(servidor)}`,
          label: `${servidor.matricula} - ${nomeServidor(servidor)}`,
        })),
      ],
    });
  const page = paginacao ?? {
    total: solicitacoes.length,
    pagina: 1,
    totalPaginas: 1,
    itensPorPagina: Math.max(solicitacoes.length, 10),
    montarHrefPagina: () => "/solicitacoes",
  };
  return (
    <DataTableShell
      title="Solicitações"
      total={page.total}
      pagina={page.pagina}
      totalPaginas={page.totalPaginas}
      itensPorPagina={page.itensPorPagina}
      montarHrefPagina={page.montarHrefPagina}
      toolbar={
        <DataTableToolbar
          filtros={filtros}
          novoHref="/solicitacoes/nova"
          novoLabel="Nova solicitação"
          visualizarHrefBase="/solicitacoes"
        />
      }
    >
      <StandardDataTable
        columns={[
          { key: "criada", label: "Criada em" },
          { key: "referencia", label: "Referência" },
          { key: "servidor", label: "Servidor" },
          { key: "unidade", label: "Unidade" },
          { key: "tipo", label: "Tipo" },
          { key: "titulo", label: "Título" },
          { key: "status", label: "Status" },
          { key: "analista", label: "Analisado por" },
        ]}
        rows={solicitacoes.map((item) => ({
          id: item.id,
          label: item.titulo,
          visualizarHref: `/solicitacoes/${item.id}`,
          cells: {
            criada: { value: formatarData(item.criadoEm) ?? "-" },
            referencia: { value: periodo(item) },
            servidor: {
              value: nomeServidor(item.servidor),
              detail: item.servidor.matricula,
            },
            unidade: { value: item.unidade?.sigla ?? "-" },
            tipo: { value: rotuloTipoSolicitacao(item.tipo) },
            titulo: { value: item.titulo },
            status: {
              value: rotuloStatusSolicitacao(item.status),
              tone:
                item.status === "DEFERIDA"
                  ? "success"
                  : item.status === "INDEFERIDA"
                    ? "danger"
                    : "muted",
            },
            analista: {
              value: item.analisadaPor?.nome ?? "-",
              detail: item.analisadaPor?.matricula,
            },
          },
          actionItems:
            podeExcluirSolicitacoes &&
            usuarioIdAtual === item.usuarioSolicitanteId &&
            item.status === "ENVIADA" ? (
              <form action={excluirSolicitacaoAction.bind(null, item.id)}>
                <button
                  type="submit"
                  className="w-full rounded-sm px-2 py-1.5 text-left text-xs text-red-700 hover:bg-red-50"
                >
                  Excluir
                </button>
              </form>
            ) : undefined,
        }))}
        emptyMessage="Nenhuma solicitação encontrada."
        minWidth={1120}
      />
    </DataTableShell>
  );
}
