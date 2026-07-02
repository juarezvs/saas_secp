import { FileCheck2 } from "lucide-react";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { SearchableSelect } from "@/components/ui";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  recalcularApuracaoDiaAction,
  recalcularApuracaoPeriodoAction,
} from "@/modules/apuracao/application/actions/recalcular-apuracao-dia.action";
import { normalizarDataReferencia } from "@/modules/apuracao/application/services/calcular-tempo.service";
import { ApuracaoDiaCard } from "@/modules/apuracao/presentation/components/apuracao-dia-card";
import {
  buscarApuracaoDiaria,
  buscarServidorComUsuarioPorUsuarioId,
  listarServidoresParaEspelhoPonto,
} from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { listarServidoresParaFiltro } from "@/modules/servidores/infrastructure/repositories/servidor.repository";

export default async function ApuracaoPage() {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "apuracao:consultar:proprio",
    "apuracao:consultar:global",
    "apuracao:recalcular:global",
  ]);

  const session = await auth();

  const servidor = session?.user
    ? await buscarServidorComUsuarioPorUsuarioId(session.user.id)
    : null;

  const hoje = normalizarDataReferencia(new Date());
  const hojeValor = hoje.toISOString().slice(0, 10);
  const podeRecalcularGlobal = permissao.permissoes.includes(
    "apuracao:recalcular:global",
  );
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const servidoresAdministrativos = podeRecalcularGlobal
    ? permissao.perfilAtivoCodigo === "CHEFIA"
      ? await listarServidoresParaEspelhoPonto({
          usuarioId: session?.user.id,
          escopo: "chefia",
        })
      : await listarServidoresParaFiltro({
          orgaoIdsPermitidos: escopoOrgao.global ? undefined : escopoOrgao.orgaoIds,
        })
    : [];
  const servidoresOptions = servidoresAdministrativos.map((item) => {
    const nome = nomeServidor(item) || item.matricula;
    const lotacao = item.lotacoes[0]?.unidade;

    return {
      value: item.id,
      label: `${nome} (${item.matricula})`,
      searchText: `${item.matricula} ${lotacao?.sigla ?? ""} ${
        lotacao?.nome ?? ""
      }`,
    };
  });

  const apuracao = servidor
    ? await buscarApuracaoDiaria({
        servidorId: servidor.id,
        dataReferencia: hoje,
      })
    : null;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Apuração" }]} />

      <PageHeader
        icon={FileCheck2}
        titulo="Apuração de frequência"
        descricao="Calcule a apuração diária com base nas marcações registradas e na jornada vigente do servidor."
        artigo="Art. 8"
        regraTitulo="Carga horaria mensal e horas trabalhadas"
        regraDescricao="A apuração compara as horas efetivamente trabalhadas com a carga horaria prevista, permitindo identificar crédito, débito e inconsistências."
      />

      {servidor ? (
        <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <h2 className="text-lg font-bold">{nomeServidor(servidor)}</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Matrícula: {servidor.matricula}
          </p>

          <form action={recalcularApuracaoDiaAction} className="mt-5 flex gap-3">
            <input type="hidden" name="servidorId" value={servidor.id} />
            <label className="sr-only" htmlFor="dataReferencia">
              Data de referência
            </label>
            <input
              id="dataReferencia"
              type="date"
              name="dataReferencia"
              defaultValue={hojeValor}
              className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            />

            <button
              type="submit"
              className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
            >
              Recalcular
            </button>
          </form>
        </section>
      ) : (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Nenhum servidor ativo foi encontrado para o usuário autenticado.
        </section>
      )}

      {podeRecalcularGlobal && (
        <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <h2 className="text-lg font-bold">Recalcular servidor por período</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Escolha um servidor dentro do seu escopo de acesso e informe o
            período da apuração.
          </p>

          <form
            action={recalcularApuracaoPeriodoAction}
            className="mt-5 grid gap-4 lg:grid-cols-[minmax(280px,1fr)_180px_180px_auto]"
          >
            <div>
              <label className="text-sm font-semibold" htmlFor="servidorId">
                Servidor
              </label>
              <SearchableSelect
                id="servidorId"
                name="servidorId"
                options={servidoresOptions}
                placeholder="Selecione o servidor"
                searchPlaceholder="Pesquisar por matrícula, nome ou lotação..."
                required
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-semibold" htmlFor="dataInicio">
                Data inicial
              </label>
              <input
                id="dataInicio"
                type="date"
                name="dataInicio"
                defaultValue={hojeValor}
                className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-semibold" htmlFor="dataFim">
                Data final
              </label>
              <input
                id="dataFim"
                type="date"
                name="dataFim"
                defaultValue={hojeValor}
                className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="h-10 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white hover:bg-blue-950"
              >
                Recalcular período
              </button>
            </div>
          </form>
        </section>
      )}

      <ApuracaoDiaCard apuracao={apuracao} />
    </div>
  );
}
