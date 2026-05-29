import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import {
  buscarServidorComUsuarioPorUsuarioId,
  listarApuracoesDoServidorNoMes,
  listarCompetenciasApuracaoDoServidor,
  listarMarcacoesDoServidorNoMes,
} from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";
import { EspelhoPontoMensal } from "@/modules/apuracao/presentation/components/espelho-ponto-mensal";

export default async function EspelhoPontoPage({
  searchParams,
}: {
  searchParams?: Promise<{
    ano?: string;
    mes?: string;
  }>;
}) {
  const session = await auth();
  const params = searchParams ? await searchParams : {};

  const servidor = session?.user
    ? await buscarServidorComUsuarioPorUsuarioId(session.user.id)
    : null;

  const competencias = servidor
    ? await listarCompetenciasApuracaoDoServidor(servidor.id)
    : [];

  const competenciaInicial = competencias[0];

  const ano = Number(
    params.ano ?? competenciaInicial?.ano ?? new Date().getFullYear(),
  );

  const mes = Number(
    params.mes ?? competenciaInicial?.mes ?? new Date().getMonth() + 1,
  );

  const [apuracoes, marcacoes] = servidor
    ? await Promise.all([
        listarApuracoesDoServidorNoMes({
          servidorId: servidor.id,
          ano,
          mes,
        }),
        listarMarcacoesDoServidorNoMes({
          servidorId: servidor.id,
          ano,
          mes,
        }),
      ])
    : [[], []];

  async function selecionarCompetencia(formData: FormData) {
    "use server";

    const competencia = String(formData.get("competencia") ?? "");
    const [anoSelecionado, mesSelecionado] = competencia.split("-");

    const anoParam = Number(anoSelecionado);
    const mesParam = Number(mesSelecionado);

    if (
      !anoSelecionado ||
      !mesSelecionado ||
      Number.isNaN(anoParam) ||
      Number.isNaN(mesParam)
    ) {
      redirect("/espelho-ponto");
    }

    redirect(`/espelho-ponto?ano=${anoParam}&mes=${mesParam}`);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Espelho de ponto" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Espelho de ponto
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Espelho mensal
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-(--muted-foreground)">
          Consulte a consolidação mensal das apurações diárias, marcações,
          créditos e débitos.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Arts. 8º, 16 e 17"
        titulo="Apuração, homologação e boletim"
        descricao="O espelho mensal servirá como base para conferência pelo servidor, homologação pela chefia e futura emissão do Boletim de Frequência."
      />

      {servidor && (
        <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <h2 className="text-lg font-bold">{servidor.usuario.nome}</h2>

          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Matrícula: {servidor.matricula} • Referência:{" "}
            {String(mes).padStart(2, "0")}/{ano}
          </p>
        </section>
      )}

      {servidor && (
        <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <h2 className="text-lg font-bold">Selecionar competência</h2>

          <form
            action={selecionarCompetencia}
            className="mt-4 flex flex-col gap-3 md:flex-row md:items-end"
          >
            <div className="flex-1">
              <label className="text-sm font-semibold" htmlFor="competencia">
                Mês/Ano
              </label>

              <select
                id="competencia"
                name="competencia"
                defaultValue={`${ano}-${String(mes).padStart(2, "0")}`}
                className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
              >
                {competencias.map((competencia) => (
                  <option
                    key={`${competencia.ano}-${competencia.mes}`}
                    value={`${competencia.ano}-${String(
                      competencia.mes,
                    ).padStart(2, "0")}`}
                  >
                    {competencia.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition hover:bg-[var(--muted)]"
            >
              Consultar
            </button>

            <a
              href={`/api/relatorios/espelho/${servidor.id}/pdf?ano=${ano}&mes=${mes}`}
              className="inline-flex h-10 items-center justify-center rounded-md bg-blue-900 px-4 text-sm font-semibold text-white transition hover:bg-blue-950"
            >
              Exportar PDF
            </a>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {competencias.map((competencia) => {
              const ativo = competencia.ano === ano && competencia.mes === mes;

              return (
                <a
                  key={`${competencia.ano}-${competencia.mes}`}
                  href={`/espelho-ponto?ano=${competencia.ano}&mes=${competencia.mes}`}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    ativo
                      ? "bg-blue-900 text-white"
                      : "border hover:bg-[var(--muted)]"
                  }`}
                >
                  {competencia.label}
                </a>
              );
            })}
          </div>
        </section>
      )}

      <EspelhoPontoMensal apuracoes={apuracoes} marcacoes={marcacoes} />
    </div>
  );
}
