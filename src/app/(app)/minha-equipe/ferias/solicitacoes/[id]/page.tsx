import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  buscarProgramacaoFeriasPorId,
  montarMapaFeriasEquipe,
  usuarioPodeAnalisarProgramacaoFerias,
} from "@/modules/programacao-ferias/infrastructure/repositories/programacao-ferias.repository";
import {
  DeliberacaoProgramacaoFeriasForm,
  MapaFeriasAnual,
  MensagemFerias,
  StatusProgramacaoFeriasBadge,
} from "@/modules/programacao-ferias/presentation/components/programacao-ferias-ui";
import { formatarDataFerias } from "@/modules/programacao-ferias/application/services/programacao-ferias-status.service";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ ok?: string; erro?: string }>;
};

export default async function DetalheSolicitacaoFeriasChefiaPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, query, permissao] = await Promise.all([
    params,
    searchParams,
    exigirUmaDasPermissoesOuRedirecionar([
      "programacao-ferias:analisar:subordinados",
    ]),
  ]);

  if (!permissao.usuarioId) redirect("/login");

  const [programacao, podeAnalisar] = await Promise.all([
    buscarProgramacaoFeriasPorId(id),
    usuarioPodeAnalisarProgramacaoFerias({
      usuarioId: permissao.usuarioId,
      programacaoId: id,
    }),
  ]);

  if (!programacao || !podeAnalisar) {
    redirect("/minha-equipe/ferias/solicitacoes?erro=Solicitação não localizada.");
  }

  const ano = programacao.dataInicio.getUTCFullYear();
  const mapa = await montarMapaFeriasEquipe({
    usuarioId: permissao.usuarioId,
    ano,
    preview: {
      servidorId: programacao.servidorId,
      dataInicio: programacao.dataInicio,
      dataFim: programacao.dataFim,
      dias: programacao.dias,
      exercicio: programacao.exercicio,
      programacaoId: programacao.id,
    },
  });

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Início", href: "/dashboard" },
          {
            label: "Solicitações de férias",
            href: "/minha-equipe/ferias/solicitacoes",
          },
          { label: "Análise" },
        ]}
      />

      <PageHeader
        icon={CalendarDays}
        titulo="Análise de férias"
        descricao="Confira a programação solicitada e use a prévia anual para identificar sobreposições na equipe."
      />

      <MensagemFerias ok={query?.ok} erro={query?.erro} />

      <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
              Servidor
            </p>
            <p className="mt-1 font-semibold">{programacao.servidor.usuario.nome}</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {programacao.servidor.matricula} · {programacao.unidade?.sigla ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
              Período
            </p>
            <p className="mt-1 font-semibold">
              {formatarDataFerias(programacao.dataInicio)} até{" "}
              {formatarDataFerias(programacao.dataFim)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
              Dias
            </p>
            <p className="mt-1 font-semibold">{programacao.dias}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
              Status
            </p>
            <div className="mt-1">
              <StatusProgramacaoFeriasBadge status={programacao.status} />
            </div>
          </div>
        </div>
      </section>

      <details className="group rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm" open>
        <summary className="flex cursor-pointer items-center justify-between gap-3 p-5 text-sm font-bold">
          Mostrar prévia do mapa de férias
          <span className="rounded-full border px-3 py-1 text-xs group-open:bg-[var(--muted)]">
            {ano}
          </span>
        </summary>
        <div className="border-t p-5">
          <MapaFeriasAnual ano={ano} itens={mapa} titulo="Prévia anual da equipe" />
        </div>
      </details>

      <DeliberacaoProgramacaoFeriasForm programacaoId={programacao.id} />
    </div>
  );
}
