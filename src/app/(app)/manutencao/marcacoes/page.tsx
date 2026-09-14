import Link from "next/link";
import { Fingerprint, Search } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  montarGradeMarcacoesManutencao,
  obterPessoaParaManutencaoMarcacoes,
  pesquisarPessoasParaManutencaoMarcacoes,
  PERMISSOES_MANUTENCAO_MARCACOES,
} from "@/modules/marcacoes/infrastructure/repositories/manutencao-marcacoes.repository";
import { ManutencaoMarcacoesGrid } from "@/modules/marcacoes/presentation/components/manutencao-marcacoes-grid";

type ManutencaoMarcacoesPageProps = {
  searchParams?: Promise<{
    competencia?: string;
    q?: string;
    servidorId?: string;
  }>;
};

function competenciaAtual() {
  const agora = new Date();

  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function normalizarCompetencia(valor?: string | null) {
  if (!valor || !/^\d{4}-\d{2}$/.test(valor)) {
    return competenciaAtual();
  }

  const mes = Number(valor.slice(5, 7));

  if (mes < 1 || mes > 12) {
    return competenciaAtual();
  }

  return valor;
}

export default async function ManutencaoMarcacoesPage({
  searchParams,
}: ManutencaoMarcacoesPageProps) {
  const [permissao, params] = await Promise.all([
    exigirUmaDasPermissoesOuRedirecionar(PERMISSOES_MANUTENCAO_MARCACOES),
    searchParams,
  ]);
  const competencia = normalizarCompetencia(params?.competencia);
  const termoBusca = params?.q?.trim() ?? "";
  const servidorId = params?.servidorId?.trim() ?? "";
  const podeGlobal = permissao.permissoes.includes(
    "marcacao:manutencao:global",
  ) && permissao.perfilAtivoEscopoGlobal;
  const orgaoIdsPermitidos = podeGlobal ? null : (permissao.orgaoIds ?? []);
  const [pessoas, pessoaSelecionada] = await Promise.all([
    pesquisarPessoasParaManutencaoMarcacoes({
      termo: termoBusca,
      orgaoIdsPermitidos,
    }),
    servidorId
      ? obterPessoaParaManutencaoMarcacoes({
          servidorId,
          orgaoIdsPermitidos,
        })
      : Promise.resolve(null),
  ]);
  const linhas =
    pessoaSelecionada && servidorId
      ? await montarGradeMarcacoesManutencao({
          servidorId,
          competencia,
        })
      : [];

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Manutenção" },
          { label: "Marcações" },
        ]}
      />

      <PageHeader
        icon={Fingerprint}
        titulo="Manutenção de Marcações"
        descricao="Inclua, altere ou cancele marcações de ponto por competência."
      />

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <form className="grid gap-3 lg:grid-cols-[11rem_minmax(18rem,1fr)_auto] lg:items-end">
          <label className="grid gap-1.5 text-sm font-semibold text-foreground">
            Competência
            <input
              type="month"
              name="competencia"
              defaultValue={competencia}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-[var(--secp-theme-accent)] focus:ring-2 focus:ring-[var(--secp-theme-accent-soft)]"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-semibold text-foreground">
            Pessoa
            <input
              type="search"
              name="q"
              defaultValue={termoBusca}
              placeholder="Nome ou matrícula"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-[var(--secp-theme-accent)] focus:ring-2 focus:ring-[var(--secp-theme-accent-soft)]"
            />
          </label>

          <Button type="submit" leftIcon={<Search className="size-4" />}>
            Pesquisar
          </Button>
        </form>

        {termoBusca.length > 0 && pessoas.length === 0 && (
          <div className="mt-4 rounded-md border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Nenhuma pessoa encontrada para a pesquisa informada.
          </div>
        )}

        {pessoas.length > 0 && (
          <div className="mt-4 grid gap-2">
            {pessoas.map((pessoa) => (
              <Link
                key={pessoa.id}
                href={`/manutencao/marcacoes?competencia=${competencia}&q=${encodeURIComponent(
                  termoBusca,
                )}&servidorId=${pessoa.id}`}
                className={[
                  "flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm transition",
                  pessoa.id === servidorId
                    ? "border-[var(--secp-theme-accent)] bg-[var(--secp-theme-accent-soft)]"
                    : "border-border bg-background hover:border-[var(--secp-theme-accent)]",
                ].join(" ")}
              >
                <span className="font-bold text-foreground">{pessoa.nome}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {pessoa.matricula} • {pessoa.orgaoSigla}
                  {pessoa.unidadeSigla ? ` • ${pessoa.unidadeSigla}` : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {pessoaSelecionada && (
        <section className="space-y-4">
          <div className="rounded-lg border border-border bg-gradient-to-br from-[#004b93]/8 via-card to-card p-4 shadow-sm">
            <div className="text-xs font-black uppercase text-[var(--secp-theme-accent)]">
              Pessoa selecionada
            </div>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-foreground">
                  {pessoaSelecionada.nome}
                </h2>
                <p className="text-sm font-medium text-muted-foreground">
                  {pessoaSelecionada.matricula} • {pessoaSelecionada.orgaoSigla}
                  {pessoaSelecionada.unidadeSigla
                    ? ` • ${pessoaSelecionada.unidadeSigla}`
                    : ""}
                </p>
              </div>
              <span className="rounded-md border border-border bg-background px-3 py-2 text-sm font-bold text-foreground">
                {competencia}
              </span>
            </div>
          </div>

          <ManutencaoMarcacoesGrid servidorId={servidorId} linhas={linhas} />
        </section>
      )}
    </div>
  );
}
