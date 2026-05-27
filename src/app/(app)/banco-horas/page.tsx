import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { gerarMovimentosBancoHorasAction } from "@/modules/banco-horas/application/actions/gerar-movimento-banco-horas.action";
import { recalcularSaldoBancoHorasAction } from "@/modules/banco-horas/application/actions/recalcular-saldo-banco-horas.action";
import {
  buscarServidorBancoHorasPorUsuarioId,
  listarMovimentosBancoHoras,
  listarServidoresComBancoHoras,
} from "@/modules/banco-horas/infrastructure/repositories/banco-horas.repository";
import { BancoHorasCard } from "@/modules/banco-horas/presentation/components/banco-horas-card";
import { MovimentosBancoHorasTable } from "@/modules/banco-horas/presentation/components/movimentos-banco-horas-table";
import { recalcularMesServidorAction } from "@/modules/recalculo/application/actions/recalcular-mes-servidor.action";

type ServidorComLotacoes = {
  lotacoes: Array<{
    unidade: {
      sigla: string;
    };
  }>;
};

function temLotacoes(servidor: unknown): servidor is ServidorComLotacoes {
  return (
    typeof servidor === "object" &&
    servidor !== null &&
    "lotacoes" in servidor &&
    Array.isArray((servidor as { lotacoes?: unknown }).lotacoes)
  );
}

export default async function BancoHorasPage({
  searchParams,
}: {
  searchParams?: Promise<{
    servidorId?: string;
    ano?: string;
    mes?: string;
  }>;
}) {
  const session = await auth();
  const params = searchParams ? await searchParams : {};

  const permissoes = session?.user.perfilAtivo?.permissoes ?? [];
  const podeGerenciar = permissoes.includes("banco-horas:gerenciar:global");
  const podeConsultarGlobal = permissoes.includes(
    "banco-horas:consultar:global",
  );

  const hoje = new Date();
  const anoReferencia = Number(params.ano ?? hoje.getFullYear());
  const mesReferencia = Number(params.mes ?? hoje.getMonth() + 1);

  const servidores = podeConsultarGlobal
    ? await listarServidoresComBancoHoras()
    : [];

  const servidorProprio = session?.user
    ? await buscarServidorBancoHorasPorUsuarioId(session.user.id)
    : null;

  const servidorSelecionadoId =
    params.servidorId && podeConsultarGlobal
      ? params.servidorId
      : servidorProprio?.id;

  const servidorSelecionado =
    servidores.find((servidor) => servidor.id === servidorSelecionadoId) ??
    servidorProprio;

  const movimentos = servidorSelecionadoId
    ? await listarMovimentosBancoHoras({
        servidorId: servidorSelecionadoId,
        limite: 100,
      })
    : [];

  const lotacaoPrincipal =
    servidorSelecionado && temLotacoes(servidorSelecionado)
      ? servidorSelecionado.lotacoes[0]
      : null;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Banco de Horas" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Banco de horas
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Saldo e movimentos
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-(--muted-foreground)">
          Consulte créditos, débitos, pendências, horas acima do limite e saldo
          consolidado do banco de horas.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Arts. 10 a 14"
        titulo="Controle individualizado e limite mensal"
        descricao="O banco de horas registra saldo positivo ou negativo para compensação, observando autorização da chefia, prazo de compensação e limite ordinário mensal de 16 horas de crédito."
      />

      {servidorSelecionado ? (
        <section className="rounded-xl border bg-(--card) p-5 shadow-sm">
          <h2 className="text-lg font-bold">
            {servidorSelecionado.usuario.nome}
          </h2>

          <p className="mt-1 text-sm text-(--muted-foreground)">
            Matrícula: {servidorSelecionado.matricula}
            {lotacaoPrincipal
              ? ` • Lotação: ${lotacaoPrincipal.unidade.sigla}`
              : ""}
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Nenhum servidor ativo foi encontrado para o usuário autenticado.
        </section>
      )}

      {servidorSelecionadoId && (
        <a
          href={`/api/relatorios/banco-horas/${servidorSelecionadoId}/pdf?ano=${anoReferencia}&mes=${mesReferencia}`}
          className="inline-flex items-center justify-center rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          Exportar banco de horas em PDF
        </a>
      )}

      {podeConsultarGlobal && servidores.length > 0 && (
        <section className="rounded-xl border bg-(--card) p-5 shadow-sm">
          <h2 className="text-lg font-bold">Selecionar servidor</h2>

          <form className="mt-4 grid gap-4 md:grid-cols-4">
            <select
              name="servidorId"
              defaultValue={servidorSelecionadoId ?? ""}
              className="h-10 rounded-md border bg-(--card) px-3 text-sm md:col-span-2"
            >
              {servidores.map((servidor) => (
                <option key={servidor.id} value={servidor.id}>
                  {servidor.matricula} — {servidor.usuario.nome}
                </option>
              ))}
            </select>

            <input
              type="number"
              name="ano"
              defaultValue={anoReferencia}
              className="h-10 rounded-md border bg-(--card) px-3 text-sm"
            />

            <input
              type="number"
              name="mes"
              min={1}
              max={12}
              defaultValue={mesReferencia}
              className="h-10 rounded-md border bg-(--card) px-3 text-sm"
            />

            <button
              type="submit"
              className="rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-(--muted)"
            >
              Filtrar
            </button>
          </form>
        </section>
      )}

      <BancoHorasCard saldo={servidorSelecionado?.bancoHorasSaldo ?? null} />

      {podeGerenciar && servidorSelecionadoId && (
        <section className="rounded-xl border bg-(--card) p-5 shadow-sm">
          <h2 className="text-lg font-bold">Ações administrativas</h2>

          <div className="mt-4 flex flex-wrap gap-3">
            <form action={gerarMovimentosBancoHorasAction}>
              <input
                type="hidden"
                name="servidorId"
                value={servidorSelecionadoId}
              />
              <input type="hidden" name="anoReferencia" value={anoReferencia} />
              <input type="hidden" name="mesReferencia" value={mesReferencia} />

              <button
                type="submit"
                className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
              >
                Gerar movimentos do mês
              </button>
            </form>

            <form action={recalcularSaldoBancoHorasAction}>
              <input
                type="hidden"
                name="servidorId"
                value={servidorSelecionadoId}
              />

              <button
                type="submit"
                className="rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-(--muted)"
              >
                Recalcular saldo
              </button>
            </form>

            <form action={recalcularMesServidorAction}>
              <input
                type="hidden"
                name="servidorId"
                value={servidorSelecionadoId}
              />
              <input type="hidden" name="anoReferencia" value={anoReferencia} />
              <input type="hidden" name="mesReferencia" value={mesReferencia} />

              <button
                type="submit"
                className="rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-(--muted)"
              >
                Recalcular mês completo
              </button>
            </form>
          </div>

          <p className="mt-3 text-xs text-(--muted-foreground)">
            A geração considera apurações calculadas ainda sem movimento de
            banco de horas no mês selecionado.
          </p>
        </section>
      )}

      <MovimentosBancoHorasTable movimentos={movimentos} />
    </div>
  );
}
