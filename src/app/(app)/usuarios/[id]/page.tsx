import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  CalendarDays,
  Clock3,
  Edit,
  History,
  KeyRound,
  Mail,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  buscarOrgaoAtivoDoServidorUsuario,
  listarOrgaosAtivos,
} from "@/modules/orgaos/infrastructure/repositories/orgao.repository";
import { buscarFotoServidorDataUrl } from "@/modules/servidores/application/services/foto-servidor.service";
import {
  resolverEscopoGestaoUsuarios,
  usuarioEstaNoEscopoGestaoUsuarios,
} from "@/modules/usuarios/application/services/escopo-gestao-usuarios.service";
import {
  buscarUsuarioPorId,
  listarPerfisAtivosParaUsuario,
} from "@/modules/usuarios/infrastructure/repositories/usuario.repository";
import { PerfisUsuarioCard } from "@/modules/usuarios/presentation/components/perfis-usuario-card";
import { VincularPerfilUsuarioForm } from "@/modules/usuarios/presentation/components/vincular-perfil-usuario-form";

type UsuarioDetalhePageProps = {
  params: Promise<{ id: string }>;
};

const ROTULOS_TIPO: Record<string, string> = {
  SERVIDOR: "Servidor",
  SISTEMA: "Sistema",
  EXTERNO: "Externo",
  PRESTADOR: "Prestador",
  ESTAGIARIO: "Estagiário",
  VOLUNTARIO: "Voluntário",
};

function formatarData(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(data);
}

function formatarDataHora(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Manaus",
  }).format(data);
}

export default async function UsuarioDetalhePage({
  params,
}: UsuarioDetalhePageProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "usuarios:gerenciar:global",
    "usuarios:gerenciar:seccional",
  ]);
  const escopoGestaoUsuarios = await resolverEscopoGestaoUsuarios(permissao);
  const { id } = await params;
  const orgaoIdsPermitidosVinculo = escopoGestaoUsuarios.permitirEscopoGlobal
    ? undefined
    : escopoGestaoUsuarios.orgaoIdsPermitidos;

  const [usuario, perfisAtivos, orgaosIniciais, orgaoServidorUsuarioLogado] =
    await Promise.all([
      buscarUsuarioPorId(id),
      listarPerfisAtivosParaUsuario({
        orgaoIdsPermitidos: orgaoIdsPermitidosVinculo,
      }),
      listarOrgaosAtivos(
        escopoGestaoUsuarios.permitirEscopoGlobal
          ? {}
          : { orgaoIdsPermitidos: orgaoIdsPermitidosVinculo },
      ),
      permissao.usuarioId
        ? buscarOrgaoAtivoDoServidorUsuario(permissao.usuarioId)
        : Promise.resolve(null),
    ]);

  if (
    !usuario ||
    !usuarioEstaNoEscopoGestaoUsuarios(usuario, escopoGestaoUsuarios)
  ) {
    notFound();
  }

  const perfisDisponiveis = escopoGestaoUsuarios.permitirEscopoGlobal
    ? perfisAtivos
    : perfisAtivos.filter((perfil) => perfil.codigo !== "MASTER");
  const orgaos =
    !escopoGestaoUsuarios.permitirEscopoGlobal &&
    !orgaosIniciais.length &&
    orgaoServidorUsuarioLogado
      ? [orgaoServidorUsuarioLogado]
      : orgaosIniciais;
  const lotacaoAtual = usuario.servidor?.lotacoes[0];
  const jornadaAtual = usuario.servidor?.jornadas[0];
  const fotoSrc = await buscarFotoServidorDataUrl(
    usuario.servidor?.cpf ?? usuario.cpf,
  );
  const iniciais = usuario.nome
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumb
          items={[
            { label: "Administração", href: "/administracao" },
            { label: "Usuários", href: "/usuarios" },
            { label: usuario.nome },
          ]}
        />
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock3 className="size-3.5" aria-hidden="true" />
          Última atualização em {formatarDataHora(usuario.atualizadoEm)}
        </span>
      </div>

      <PageHeader
        icon={ShieldCheck}
        titulo={usuario.nome}
        descricao={`${ROTULOS_TIPO[usuario.tipo] ?? usuario.tipo} • ${usuario.matricula}. Detalhes da conta, perfis de acesso e informações institucionais.`}
        actions={
          <Link
            href={`/usuarios/${usuario.id}/editar`}
            className="secp-theme-primary-action inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded px-4 text-sm font-semibold transition"
          >
            <Edit className="size-4" aria-hidden="true" />
            Editar usuário
          </Link>
        }
      />

      <section id="informacoes" className="grid gap-3 xl:grid-cols-[minmax(0,2.3fr)_minmax(18rem,1fr)]">
        <div className="grid gap-5 rounded border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 sm:grid-cols-[7rem_minmax(0,1fr)]">
          <div className="flex items-start justify-center">
            {fotoSrc ? (
              <Image
                src={fotoSrc}
                alt={`Foto de ${usuario.nome}`}
                width={104}
                height={104}
                unoptimized
                className="aspect-square size-24 rounded-full border object-cover shadow-sm"
              />
            ) : (
              <span className="secp-theme-icon grid size-24 place-items-center rounded-full text-xl font-bold">
                {iniciais}
              </span>
            )}
          </div>

          <div className="grid min-w-0 gap-x-4 gap-y-5 sm:grid-cols-3">
            <Dado icon={UserRound} label="Nome completo" value={usuario.nome} />
            <Dado icon={KeyRound} label="Matrícula/Login" value={usuario.matricula} />
            <Dado icon={Mail} label="E-mail" value={usuario.email ?? "-"} />
            <div className="sm:col-span-2">
              <Dado
                icon={Building2}
                label="Lotação atual"
                value={
                  lotacaoAtual
                    ? `${lotacaoAtual.unidade.sigla} - ${lotacaoAtual.unidade.nome}`
                    : "Não informada"
                }
              />
            </div>
            <Dado
              icon={Clock3}
              label="Jornada atual"
              value={
                jornadaAtual
                  ? `${jornadaAtual.jornada.codigo} - ${jornadaAtual.jornada.nome}`
                  : "Não informada"
              }
            />
          </div>
        </div>

        <aside className="rounded border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
          <div className="flex items-center gap-3">
            <span className="secp-theme-icon grid size-9 place-items-center rounded">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold">Status da conta</p>
              <div className="mt-1"><StatusBadge ativo={usuario.ativo} /></div>
            </div>
          </div>
          <p className="mt-4 border-b border-border pb-4 text-xs leading-5 text-muted-foreground">
            {usuario.ativo
              ? "Conta autenticando e com acesso liberado ao SECP."
              : "Conta inativa e sem acesso ao SECP."}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Dado icon={KeyRound} label="Tipo de vínculo" value={usuario.servidor ? "Vinculado" : "Sem vínculo"} />
            <Dado icon={CalendarDays} label="Data da criação" value={formatarData(usuario.criadoEm)} />
          </div>
        </aside>
      </section>

      <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label="Seções do usuário">
        <Aba href="#perfis" icon={ShieldCheck} ativa>Perfis e permissões</Aba>
        <Aba href="#informacoes" icon={Building2}>Informações institucionais</Aba>
        <Aba href={`/usuarios/${usuario.id}/editar`} icon={Settings}>Configurações de acesso</Aba>
        <Aba href="/auditoria" icon={History}>Auditoria</Aba>
      </nav>

      <PerfisUsuarioCard usuarioId={usuario.id} perfis={usuario.perfis} />

      <details className="rounded border border-border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
          Vincular novo perfil
        </summary>
        <div className="border-t border-border p-4">
          <VincularPerfilUsuarioForm
            usuarioId={usuario.id}
            perfis={perfisDisponiveis}
            orgaos={orgaos}
            permitirEscopoGlobal={escopoGestaoUsuarios.permitirEscopoGlobal}
          />
        </div>
      </details>
    </div>
  );
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
      ativo
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
    }`}>
      <span className={`size-1.5 rounded-full ${ativo ? "bg-emerald-600" : "bg-slate-500"}`} />
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

function Dado({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="secp-theme-icon grid size-8 shrink-0 place-items-center rounded">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-xs font-semibold" title={value}>{value}</p>
      </div>
    </div>
  );
}

function Aba({
  href,
  icon: Icon,
  ativa = false,
  children,
}: {
  href: string;
  icon: typeof UserRound;
  ativa?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${
        ativa
          ? "border-[var(--secp-theme-accent)] text-[var(--secp-theme-accent)]"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}
