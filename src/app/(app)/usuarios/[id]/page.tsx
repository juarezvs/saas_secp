import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, UserRound } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  buscarUsuarioPorId,
  listarPerfisAtivosParaUsuario,
} from "@/modules/usuarios/infrastructure/repositories/usuario.repository";
import { PerfisUsuarioCard } from "@/modules/usuarios/presentation/components/perfis-usuario-card";
import { VincularPerfilUsuarioForm } from "@/modules/usuarios/presentation/components/vincular-perfil-usuario-form";

type UsuarioDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function UsuarioDetalhePage({
  params,
}: UsuarioDetalhePageProps) {
  await exigirPermissaoOuRedirecionar("usuarios:gerenciar:global");

  const { id } = await params;

  const [usuario, perfisAtivos] = await Promise.all([
    buscarUsuarioPorId(id),
    listarPerfisAtivosParaUsuario(),
  ]);

  if (!usuario) {
    notFound();
  }

  const lotacaoAtual = usuario.servidor?.lotacoes[0];
  const jornadaAtual = usuario.servidor?.jornadas[0];

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Usuários", href: "/usuarios" },
          { label: usuario.nome },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Usuário
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {usuario.nome}
          </h1>

          <p className="mt-2 font-mono text-sm text-[var(--muted-foreground)]">
            {usuario.matricula}
          </p>
        </div>

        <Link
          href={`/usuarios/${usuario.id}/editar`}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <Edit className="size-4" aria-hidden="true" />
          Editar usuário
        </Link>
      </section>

      <RegraPortariaCard
        artigo="Controle de acesso institucional"
        titulo="Conta, perfis e vínculos funcionais"
        descricao="A conta de usuário representa a identidade de acesso ao sistema. Perfis definem permissões e o vínculo funcional conecta a conta ao servidor, lotação, jornada e marcações."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <InfoCard label="Tipo" value={usuario.tipo} />
        <InfoCard label="Status" value={usuario.ativo ? "Ativo" : "Inativo"} />
        <InfoCard label="Perfis" value={String(usuario.perfis.length)} />
        <InfoCard
          label="Servidor"
          value={usuario.servidor ? "Vinculado" : "Não vinculado"}
        />
      </section>

      <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
        <div className="flex items-center gap-2 border-b p-5">
          <UserRound className="size-5 text-blue-900 dark:text-blue-300" />
          <h2 className="text-lg font-bold">Dados da conta</h2>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Info label="Nome" value={usuario.nome} />
          <Info label="Matrícula/Login" value={usuario.matricula} />
          <Info label="E-mail" value={usuario.email ?? "-"} />
          <Info label="Tipo" value={usuario.tipo} />
          <Info
            label="Lotação atual"
            value={
              lotacaoAtual
                ? `${lotacaoAtual.unidade.sigla} — ${lotacaoAtual.unidade.nome}`
                : "-"
            }
          />
          <Info
            label="Jornada atual"
            value={
              jornadaAtual
                ? `${jornadaAtual.jornada.codigo} — ${jornadaAtual.jornada.nome}`
                : "-"
            }
          />
        </div>
      </section>

      <PerfisUsuarioCard usuarioId={usuario.id} perfis={usuario.perfis} />

      <VincularPerfilUsuarioForm
        usuarioId={usuario.id}
        perfis={perfisAtivos}
      />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
      <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
      <h2 className="mt-2 text-xl font-bold">{value}</h2>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-[var(--muted)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}