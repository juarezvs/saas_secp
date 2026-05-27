import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, ShieldCheck, UserRound } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  buscarServidorPorId,
  listarUnidadesAtivasParaLotacao,
} from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { vincularLotacaoAction } from "@/modules/servidores/application/actions/vincular-lotacao.action";
import { LotacaoForm } from "@/modules/servidores/presentation/components/lotacao-form";
import { ServidorLotacoesCard } from "@/modules/servidores/presentation/components/servidor-lotacoes-card";

type ServidorDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ServidorDetalhePage({
  params,
}: ServidorDetalhePageProps) {
  await exigirPermissaoOuRedirecionar("servidores:gerenciar:global");

  const { id } = await params;

  const [servidor, unidades] = await Promise.all([
    buscarServidorPorId(id),
    listarUnidadesAtivasParaLotacao(),
  ]);

  if (!servidor) {
    notFound();
  }

  const actionLotacao = vincularLotacaoAction.bind(null, servidor.id);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Servidores", href: "/servidores" },
          { label: servidor.matricula },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Servidor
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {servidor.usuario.nome}
          </h1>

          <p className="mt-2 font-mono text-sm text-[var(--muted-foreground)]">
            Matrícula: {servidor.matricula}
          </p>
        </div>

        <Link
          href={`/servidores/${servidor.id}/editar`}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <Edit className="size-4" aria-hidden="true" />
          Editar servidor
        </Link>
      </section>

      <RegraPortariaCard
        artigo="Arts. 8º e 16"
        titulo="Lotação como base da apuração e homologação"
        descricao="A lotação define a unidade em que a carga mensal será apurada e a chefia responsável pela análise, compensação e homologação da frequência."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Órgão</p>
          <h2 className="mt-2 text-2xl font-bold">{servidor.orgao.sigla}</h2>
        </div>

        <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Vínculo</p>
          <h2 className="mt-2 text-base font-bold">{servidor.vinculo}</h2>
        </div>

        <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Perfis</p>
          <h2 className="mt-2 text-2xl font-bold">
            {servidor.usuario.perfis.length}
          </h2>
        </div>

        <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Status</p>
          <h2 className="mt-2 text-2xl font-bold">
            {servidor.ativo ? "Ativo" : "Inativo"}
          </h2>
        </div>
      </section>

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <UserRound className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Dados do usuário</h2>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">Nome</p>
            <p className="mt-1 font-semibold">{servidor.usuario.nome}</p>
          </div>

          <div>
            <p className="text-sm text-[var(--muted-foreground)]">E-mail</p>
            <p className="mt-1 font-semibold">
              {servidor.usuario.email ?? "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-[var(--muted-foreground)]">
              Nome funcional
            </p>
            <p className="mt-1 font-semibold">
              {servidor.nomeFuncional ?? "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-[var(--muted-foreground)]">
              Tipo de usuário
            </p>
            <p className="mt-1 font-semibold">{servidor.usuario.tipo}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <ShieldCheck className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Perfis vinculados</h2>
        </div>

        <div className="divide-y">
          {servidor.usuario.perfis.map((usuarioPerfil) => (
            <div
              key={usuarioPerfil.id}
              className="flex flex-col justify-between gap-2 p-5 md:flex-row md:items-center"
            >
              <div>
                <p className="font-semibold">{usuarioPerfil.perfil.nome}</p>
                <p className="font-mono text-xs text-[var(--muted-foreground)]">
                  {usuarioPerfil.perfil.codigo}
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${
                  usuarioPerfil.ativo
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {usuarioPerfil.ativo ? "Ativo" : "Inativo"}
              </span>
            </div>
          ))}

          {servidor.usuario.perfis.length === 0 && (
            <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
              Nenhum perfil vinculado a este usuário.
            </div>
          )}
        </div>
      </section>

      <ServidorLotacoesCard lotacoes={servidor.lotacoes} />

      <LotacaoForm action={actionLotacao} unidades={unidades} />
    </div>
  );
}