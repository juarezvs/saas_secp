import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { abrirFechamentoMensalAction } from "@/modules/homologacao/application/actions/abrir-fechamento-mensal.action";
import {
  listarFechamentosMensais,
  listarUnidadesParaHomologacao,
} from "@/modules/homologacao/infrastructure/repositories/homologacao.repository";
import {
  classeStatusHomologacao,
  rotuloStatusFechamento,
} from "@/modules/homologacao/application/services/formatar-homologacao.service";

export default async function HomologacaoPage() {
  //   await exigirPermissaoOuRedirecionar("homologacao:gerenciar:chefia");
  await exigirUmaDasPermissoesOuRedirecionar([
    "homologacao:gerenciar:chefia",
    "homologacao:gerenciar:global",
  ]);

  const [unidades, fechamentos] = await Promise.all([
    listarUnidadesParaHomologacao(),
    listarFechamentosMensais(),
  ]);

  const hoje = new Date();
  const mesAnterior = hoje.getMonth() === 0 ? 12 : hoje.getMonth();
  const anoReferencia =
    hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Homologação" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Homologação mensal
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Fechamentos mensais
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Abra o fechamento mensal da unidade, valide pendências e homologue a
          frequência dos servidores subordinados.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Homologação mensal e Boletim de Frequência"
        titulo="Prazo de homologação e encaminhamento"
        descricao="A chefia homologa a frequência mensal e o resultado servirá de base para o Boletim de Frequência encaminhado à área de gestão de pessoas."
      />

      <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">Abrir ou preparar fechamento</h2>

        <form
          action={abrirFechamentoMensalAction}
          className="mt-4 grid gap-4 md:grid-cols-5"
        >
          <select
            name="unidadeId"
            className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm md:col-span-2"
            required
          >
            <option value="">Selecione a unidade</option>
            {unidades.map((unidade) => (
              <option key={unidade.id} value={unidade.id}>
                {unidade.sigla} — {unidade.nome}
              </option>
            ))}
          </select>

          <input
            type="number"
            name="anoReferencia"
            defaultValue={anoReferencia}
            className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            required
          />

          <input
            type="number"
            name="mesReferencia"
            min={1}
            max={12}
            defaultValue={mesAnterior}
            className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
            required
          />

          <label className="flex items-center gap-2 rounded-md border bg-[var(--muted)] px-3 text-sm">
            <input type="checkbox" name="recalcularAntes" />
            Recalcular antes
          </label>

          <button
            type="submit"
            className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950 md:col-span-5"
          >
            Preparar fechamento
          </button>
        </form>
      </section>

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <CalendarCheck className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Fechamentos recentes</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Referência</th>
                <th className="px-5 py-3">Unidade</th>
                <th className="px-5 py-3">Servidores</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Aberto por</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {fechamentos.map((fechamento) => (
                <tr key={fechamento.id} className="border-b last:border-b-0">
                  <td className="px-5 py-4 font-semibold">
                    {String(fechamento.mesReferencia).padStart(2, "0")}/
                    {fechamento.anoReferencia}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {fechamento.unidade.sigla}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {fechamento.unidade.nome}
                    </div>
                  </td>

                  <td className="px-5 py-4">{fechamento.servidores.length}</td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${classeStatusHomologacao(
                        fechamento.status,
                      )}`}
                    >
                      {rotuloStatusFechamento(fechamento.status)}
                    </span>
                  </td>

                  <td className="px-5 py-4">{fechamento.abertoPor.nome}</td>

                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/homologacao/${fechamento.id}`}
                      className="text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
                    >
                      Detalhar
                    </Link>
                  </td>
                </tr>
              ))}

              {fechamentos.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhum fechamento mensal encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
