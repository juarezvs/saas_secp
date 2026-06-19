import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Edit, ListChecks, UsersRound } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarEscalaAction } from "@/modules/jornadas/application/actions/criar-escala.action";
import { buscarJornadaPorId } from "@/modules/jornadas/infrastructure/repositories/jornada.repository";
import { EscalaForm } from "@/modules/jornadas/presentation/components/escala-form";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

type JornadaDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

function minutosParaHoras(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${resto}`;
}

function formatarData(data: Date | null) {
  if (!data) return "Atual";
  return new Intl.DateTimeFormat("pt-BR").format(data);
}

const rotulosDia: Record<string, string> = {
  DOMINGO: "Dom",
  SEGUNDA: "Seg",
  TERCA: "Ter",
  QUARTA: "Qua",
  QUINTA: "Qui",
  SEXTA: "Sex",
  SABADO: "Sáb",
};

function descreverDiaEscala(dia: {
  diaSemana: string;
  trabalha: boolean;
  horarioEntrada: string | null;
  horarioSaida: string | null;
  intervaloInicio: string | null;
  intervaloFim: string | null;
  cargaPrevistaMinutos: number;
}) {
  if (!dia.trabalha) {
    return `${rotulosDia[dia.diaSemana] ?? dia.diaSemana}: folga`;
  }

  const intervalo =
    dia.intervaloInicio && dia.intervaloFim
      ? `, intervalo ${dia.intervaloInicio}-${dia.intervaloFim}`
      : "";

  return `${rotulosDia[dia.diaSemana] ?? dia.diaSemana}: ${
    dia.horarioEntrada ?? "-"
  }-${dia.horarioSaida ?? "-"}${intervalo}, ${minutosParaHoras(
    dia.cargaPrevistaMinutos,
  )}`;
}

export default async function JornadaDetalhePage({
  params,
}: JornadaDetalhePageProps) {
  await exigirPermissaoOuRedirecionar("jornadas:gerenciar:global");

  const { id } = await params;
  const jornada = await buscarJornadaPorId(id);

  if (!jornada) {
    notFound();
  }

  const actionEscala = criarEscalaAction.bind(null, jornada.id);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Jornadas", href: "/jornadas" },
          { label: jornada.codigo },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Jornada
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {jornada.nome}
          </h1>
          <p className="mt-2 font-mono text-sm text-[var(--muted-foreground)]">
            {jornada.codigo}
          </p>
        </div>

        <Link
          href={`/jornadas/${jornada.id}/editar`}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <Edit className="size-4" aria-hidden="true" />
          Editar jornada
        </Link>
      </section>

      <RegraPortariaCard
        artigo="Arts. 4º, §6º, e 8º"
        titulo="Carga diária e intervalo"
        descricao="A jornada cadastrada será usada para comparar a carga mensal esperada com as horas efetivamente registradas pelo servidor."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Tipo</p>
          <h2 className="mt-2 text-base font-bold">{jornada.tipo}</h2>
        </div>
        <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Carga diária</p>
          <h2 className="mt-2 text-2xl font-bold">
            {minutosParaHoras(jornada.cargaDiariaMinutos)}
          </h2>
        </div>
        <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Intervalo</p>
          <h2 className="mt-2 text-base font-bold">
            {jornada.exigeIntervalo ? "Exigido" : "Não exigido"}
          </h2>
        </div>
        <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Status</p>
          <h2 className="mt-2 text-2xl font-bold">
            {jornada.ativo ? "Ativa" : "Inativa"}
          </h2>
        </div>
      </section>

      <section className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Parâmetros da jornada</h2>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Info label="Entrada padrão" value={jornada.horarioEntradaPadrao ?? "-"} />
          <Info label="Saída padrão" value={jornada.horarioSaidaPadrao ?? "-"} />
          <Info
            label="Intervalo mínimo"
            value={
              jornada.intervaloMinimoMinutos
                ? `${jornada.intervaloMinimoMinutos} min`
                : "-"
            }
          />
          <Info
            label="Intervalo máximo"
            value={
              jornada.intervaloMaximoMinutos
                ? `${jornada.intervaloMaximoMinutos} min`
                : "-"
            }
          />
          <Info
            label="Entrada mínima diferenciada"
            value={jornada.entradaMinimaDiferenciada ?? "-"}
          />
          <Info
            label="Saída máxima diferenciada"
            value={jornada.saidaMaximaDiferenciada ?? "-"}
          />
        </div>
      </section>

      <EscalaForm
        action={actionEscala}
        valoresPadrao={{
          horarioEntradaPadrao: jornada.horarioEntradaPadrao,
          horarioSaidaPadrao: jornada.horarioSaidaPadrao,
          cargaDiariaMinutos: jornada.cargaDiariaMinutos,
          exigeIntervalo: jornada.exigeIntervalo,
          intervaloMinimoMinutos: jornada.intervaloMinimoMinutos,
        }}
      />

      <section className="rounded-xl border bg-[var(--card)] shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <ListChecks className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Escalas cadastradas</h2>
        </div>

        <div className="divide-y">
          {jornada.escalas.map((escala) => (
            <div key={escala.id} className="space-y-4 p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="font-semibold">{escala.nome}</p>
                  <p className="font-mono text-xs text-[var(--muted-foreground)]">
                    {escala.codigo}
                  </p>
                  {escala.descricao && (
                    <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
                      {escala.descricao}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="w-fit rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                    {escala.tipo}
                  </span>
                  <span
                    className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${
                      escala.ativo
                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {escala.ativo ? "Ativa" : "Inativa"}
                  </span>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {escala.dias.map((dia) => (
                  <div
                    key={dia.id}
                    className="rounded-lg border bg-[var(--muted)] px-3 py-2 text-sm"
                  >
                    {descreverDiaEscala(dia)}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {jornada.escalas.length === 0 && (
            <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
              Nenhuma escala cadastrada para esta jornada.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-[var(--card)] shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <UsersRound className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Servidores vinculados</h2>
        </div>

        <div className="divide-y">
          {jornada.servidores.map((vinculo) => (
            <div
              key={vinculo.id}
              className="flex flex-col justify-between gap-3 p-5 md:flex-row md:items-center"
            >
              <div>
                <p className="font-semibold">{nomeServidor(vinculo.servidor)}</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Matrícula: {vinculo.servidor.matricula}
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {formatarData(vinculo.dataInicio)} →{" "}
                  {formatarData(vinculo.dataFim)}
                </p>
                <p className="mt-2 text-xs font-semibold">
                  {vinculo.horarioDiferenciadoAutorizado
                    ? "Horário diferenciado autorizado (06:00–19:00)"
                    : "Expediente padrão (08:00–18:00)"}
                </p>
                {vinculo.horarioDiferenciadoAutorizado &&
                  vinculo.justificativa && (
                    <p className="mt-1 max-w-2xl text-xs text-[var(--muted-foreground)]">
                      Base da autorização: {vinculo.justificativa}
                    </p>
                  )}
              </div>

              <span
                className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${
                  vinculo.ativo
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {vinculo.ativo ? "Vigente" : "Encerrada"}
              </span>
            </div>
          ))}

          {jornada.servidores.length === 0 && (
            <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
              Nenhum servidor vinculado a esta jornada.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-[var(--muted)] p-4">
      <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
