import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarRange } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { resolverEscopoServidoresRecesso } from "@/modules/recesso-forense/application/services/escopo-recesso-forense.service";
import {
  atualizarConvocacaoRecessoAction,
  criarConvocacaoRecessoAction,
} from "@/modules/recesso-forense/application/actions/recesso-forense.actions";
import {
  buscarRecessoForensePorId,
  listarServidoresParaRecesso,
  listarUnidadesParaRecesso,
} from "@/modules/recesso-forense/infrastructure/repositories/recesso-forense.repository";
import { ConvocacaoRecessoForm } from "@/modules/recesso-forense/presentation/components/convocacao-recesso-form";
import { ConvocacoesRecessoPanel } from "@/modules/recesso-forense/presentation/components/convocacoes-recesso-panel";

type RecessoConvocacoesPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    convocacao?: string;
    servidor?: string;
  }>;
};

export default async function RecessoConvocacoesPage({
  params,
  searchParams,
}: RecessoConvocacoesPageProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "recesso:convocacao:gerenciar",
    "recesso:gerenciar:global",
    "recesso:homologar:chefia",
  ]);

  const { id } = await params;
  const filtros = await searchParams;
  const escopoRecesso = await resolverEscopoServidoresRecesso(permissao);
  const podeGerenciarPortarias =
    !escopoRecesso.restrito &&
    (permissao.permissoes.includes("recesso:convocacao:gerenciar") ||
      permissao.permissoes.includes("recesso:gerenciar:global"));
  const [recesso, unidades, servidores] = await Promise.all([
    buscarRecessoForensePorId(id, {
      servidorIdsPermitidos: escopoRecesso.servidorIdsPermitidos,
    }),
    listarUnidadesParaRecesso(),
    listarServidoresParaRecesso({
      servidorIdsPermitidos: escopoRecesso.servidorIdsPermitidos,
    }),
  ]);

  if (!recesso) {
    notFound();
  }

  const convocacaoSelecionada = podeGerenciarPortarias
    ? recesso.convocacoes.find(
        (convocacao) => convocacao.id === filtros.convocacao,
      ) ?? null
    : null;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Recesso forense", href: "/recesso-forense" },
          { label: String(recesso.ano), href: `/recesso-forense/${recesso.id}` },
          { label: "Convocações" },
        ]}
      />

      <PageHeader
        icon={CalendarRange}
        titulo={`Convocacoes do recesso ${recesso.ano}`}
        descricao="Cadastre portarias, servidores convocados por dia e chefia especifica do recesso."
        artigo="Recesso forense"
        regraTitulo="Convocação por data"
        regraDescricao="O servidor pode ser convocado em dias específicos do período de 20/12 a 06/01, com escolha entre pecúnia e folga quando aplicável."
        actions={
          <Link
            href={`/recesso-forense/${recesso.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar ao recesso
          </Link>
        }
      />

      {podeGerenciarPortarias && (
        <ConvocacaoRecessoForm
          key={convocacaoSelecionada?.id ?? "nova"}
          recessoId={recesso.id}
          action={
            convocacaoSelecionada
              ? atualizarConvocacaoRecessoAction
              : criarConvocacaoRecessoAction
          }
          unidades={unidades}
          servidores={servidores}
          convocacao={convocacaoSelecionada ?? undefined}
        />
      )}

      <ConvocacoesRecessoPanel
        recesso={recesso}
        servidores={servidores}
        podeEditarPortaria={podeGerenciarPortarias}
        podeGerenciarConvocados={!escopoRecesso.perfilServidor}
        edicao={{
          convocacaoId: filtros.convocacao,
          servidorId: filtros.servidor,
        }}
      />
    </div>
  );
}
