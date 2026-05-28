import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { listarMarcacoesBrutas } from "@/modules/marcacoes-brutas/infrastructure/repositories/marcacao-bruta.repository";
import { MarcacoesBrutasTable } from "@/modules/marcacoes-brutas/presentation/components/marcacoes-brutas-table";
import { reprocessarMarcacoesBrutasPendentesAction } from "@/modules/marcacoes-brutas/application/actions/reprocessar-marcacoes-brutas-pendentes.action";

type MarcacoesBrutasPageProps = {
  searchParams?: Promise<{
    busca?: string;
    origem?: string;
    processada?: string;
  }>;
};

export default async function MarcacoesBrutasPage({
  searchParams,
}: MarcacoesBrutasPageProps) {
  const params = searchParams ? await searchParams : {};

  const marcacoes = await listarMarcacoesBrutas({
    busca: params.busca,
    origem: params.origem,
    processada: params.processada,
    limite: 200,
  });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Marcações Brutas" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Marcações brutas
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Fonte oficial das marcações
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Consulte os registros brutos imutáveis recebidos por equipamento
          biométrico, importação AFD, registro web autorizado ou reconhecimento
          facial autorizado.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Fonte oficial"
        titulo="Registro bruto imutável"
        descricao="As marcações brutas preservam o dado original recebido pelo SECP. A marcação classificada usada na apuração é derivada deste registro."
      />

      <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">Filtros</h2>

        <form className="mt-4 grid gap-4 md:grid-cols-4">
          <input
            name="busca"
            defaultValue={params.busca ?? ""}
            placeholder="CPF, matrícula, equipamento, NSR..."
            className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm md:col-span-2"
          />

          <select
            name="origem"
            defaultValue={params.origem ?? ""}
            className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
          >
            <option value="">Todas as origens</option>
            <option value="EQUIPAMENTO_BIOMETRICO">
              Equipamento biométrico
            </option>
            <option value="IMPORTACAO_AFD">Importação AFD</option>
            <option value="WEB_AUTORIZADO">Web autorizado</option>
            <option value="FACIAL_AUTORIZADO">Facial autorizado</option>
          </select>

          <select
            name="processada"
            defaultValue={params.processada ?? ""}
            className="h-10 rounded-md border bg-[var(--card)] px-3 text-sm"
          >
            <option value="">Todos os status</option>
            <option value="true">Processadas</option>
            <option value="false">Pendentes</option>
          </select>

          <button
            type="submit"
            className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950 md:col-span-2"
          >
            Filtrar
          </button>
        </form>
      </section>

      <section className="rounded-xl border bg-(--card) p-5 text-(--card-foreground) shadow-sm">
        <h2 className="text-lg font-bold">Reprocessamento</h2>

        <p className="mt-2 text-sm leading-6 text-(--muted-foreground)">
          Tente processar novamente marcações brutas pendentes, especialmente
          após cadastro ou atualização de servidores.
        </p>

        <form action={reprocessarMarcacoesBrutasPendentesAction} className="mt-4">
          <button
            type="submit"
            className="rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
          >
            Reprocessar pendentes
          </button>
        </form>
      </section>

      <MarcacoesBrutasTable marcacoes={marcacoes} />
    </div>
  );
}