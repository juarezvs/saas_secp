import { Clock3 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui";
import { EspelhoPontoFiltrosAuto } from "@/modules/apuracao/presentation/components/espelho-ponto-filtros-auto";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { obterRotuloTipoMarcacao } from "@/modules/marcacoes/application/services/classificar-marcacao.service";
import { formatarDataHoraPtBr } from "@/modules/marcacoes/application/services/data-marcacao.service";
import { listarHistoricoMarcacoesDoUsuario } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { OrigemMarcacaoIcon } from "@/modules/marcacoes/presentation/components/origem-marcacao-icon";

type HistoricoMarcacoesPageProps = {
  searchParams?: Promise<{
    competencia?: string;
    anoReferencia?: string;
    mesReferencia?: string;
  }>;
};

function normalizarCompetencia(params: {
  competencia?: string;
  anoReferencia?: string;
  mesReferencia?: string;
}) {
  const hoje = new Date();
  const matchCompetencia = params.competencia?.match(/^(\d{4})-(\d{2})$/);
  const anoCompetencia = matchCompetencia ? Number(matchCompetencia[1]) : null;
  const mesCompetencia = matchCompetencia ? Number(matchCompetencia[2]) : null;
  const anoParam = params.anoReferencia ? Number(params.anoReferencia) : null;
  const mesParam = params.mesReferencia ? Number(params.mesReferencia) : null;

  return {
    anoReferencia:
      anoCompetencia && Number.isInteger(anoCompetencia)
        ? anoCompetencia
        : anoParam && Number.isInteger(anoParam)
          ? anoParam
          : hoje.getFullYear(),
    mesReferencia:
      mesCompetencia &&
      Number.isInteger(mesCompetencia) &&
      mesCompetencia >= 1 &&
      mesCompetencia <= 12
        ? mesCompetencia
        : mesParam &&
            Number.isInteger(mesParam) &&
            mesParam >= 1 &&
            mesParam <= 12
          ? mesParam
          : hoje.getMonth() + 1,
  };
}

function competenciaParaInput(anoReferencia: number, mesReferencia: number) {
  return `${anoReferencia}-${String(mesReferencia).padStart(2, "0")}`;
}

export default async function HistoricoMarcacoesPage({
  searchParams,
}: HistoricoMarcacoesPageProps) {
  const [permissao, params] = await Promise.all([
    exigirUmaDasPermissoesOuRedirecionar([
      "marcacoes:consultar:proprio",
      "marcacoes:visualizar:proprio",
    ]),
    searchParams,
  ]);
  const { anoReferencia, mesReferencia } = normalizarCompetencia(params ?? {});
  const competenciaInput = competenciaParaInput(anoReferencia, mesReferencia);
  const resultado = permissao.usuarioId
    ? await listarHistoricoMarcacoesDoUsuario({
        usuarioId: permissao.usuarioId,
        anoReferencia,
        mesReferencia,
      })
    : { servidor: null, marcacoes: [] };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Histórico de Marcações" }]} />

      <PageHeader
        icon={Clock3}
        titulo="Histórico de Marcações"
        descricao="Consulte seus registros do mês atual ou selecione outra competência."
        artigo="Art. 6"
        regraTitulo="Histórico individual"
        regraDescricao="O histórico exibe marcações válidas ou pendentes da competência selecionada."
      />

      <Card className="p-5">
        <EspelhoPontoFiltrosAuto
          competencia={competenciaInput}
          className="w-full sm:w-64"
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Data/hora</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Fonte</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {resultado.marcacoes.map((marcacao) => (
                <tr key={marcacao.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4">
                    {formatarDataHoraPtBr(
                      marcacao.dataHora,
                      marcacao.fusoHorario,
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {obterRotuloTipoMarcacao(marcacao.tipo)}
                  </td>
                  <td className="px-5 py-4">
                    <OrigemMarcacaoIcon origem={marcacao.fonte} />
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        marcacao.status === "VALIDA"
                          ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {marcacao.status}
                    </span>
                  </td>
                </tr>
              ))}

              {resultado.marcacoes.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhuma marcação encontrada na competência selecionada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
