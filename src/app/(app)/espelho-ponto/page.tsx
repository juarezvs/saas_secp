import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { EspelhoPontoMensal } from "@/modules/apuracao/presentation/components/espelho-ponto-mensal";
import {
  buscarServidorComUsuarioPorUsuarioId,
  listarApuracoesDoServidorNoMes,
} from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";

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
  const hoje = new Date();

  const ano = Number(params.ano ?? hoje.getFullYear());
  const mes = Number(params.mes ?? hoje.getMonth() + 1);

  const servidor = session?.user
    ? await buscarServidorComUsuarioPorUsuarioId(session.user.id)
    : null;

  const apuracoes = servidor
    ? await listarApuracoesDoServidorNoMes({
        servidorId: servidor.id,
        ano,
        mes,
      })
    : [];

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

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Consulte a consolidação preliminar das apurações diárias do mês.
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
        <a
          href={`/api/relatorios/espelho/${servidor.id}/pdf?ano=${ano}&mes=${mes}`}
          className="inline-flex items-center justify-center rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          Exportar espelho em PDF
        </a>
      )}

      <EspelhoPontoMensal apuracoes={apuracoes} />
    </div>
  );
}
