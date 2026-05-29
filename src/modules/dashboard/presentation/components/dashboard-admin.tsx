import Link from "next/link";
import {
  Activity,
  DatabaseZap,
  FileUp,
  ShieldAlert,
  Users,
  UserCog,
} from "lucide-react";

import { prisma } from "@/shared/infrastructure/database/prisma";

import { DashboardCard } from "./dashboard-card";

export async function DashboardAdmin({ usuarioId }: { usuarioId: string }) {
  const [
    totalUsuarios,
    totalServidores,
    marcacoesBrutasPendentes,
    importacoesAfdPendentes,
    eventosAuditoria,
    eventosAuditoriaUsuario,
    servidoresSemCpf,
  ] = await Promise.all([
    prisma.usuario.count(),

    prisma.servidor.count({
      where: {
        ativo: true,
      },
    }),

    prisma.marcacaoBruta.count({
      where: {
        processada: false,
      },
    }),

    prisma.importacaoAfd.count({
      where: {
        status: {
          in: ["RECEBIDA", "EM_PROCESSAMENTO", "PROCESSADA_COM_ERROS", "ERRO"],
        },
      },
    }),

    prisma.auditoriaEvento.count(),

    prisma.auditoriaEvento.count({
      where: {
        usuarioId,
      },
    }),

    prisma.servidor.count({
      where: {
        ativo: true,
        OR: [{ cpf: null }, { cpf: "" }],
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Dashboard administrativo
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Visão geral do SECP
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Monitore cadastros, importações AFD, marcações brutas, auditoria e
          pendências operacionais do sistema.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DashboardCard
          titulo="Usuários"
          valor={totalUsuarios}
          descricao="Total de usuários cadastrados no SECP."
          icon={Users}
        />

        <DashboardCard
          titulo="Servidores ativos"
          valor={totalServidores}
          descricao="Servidores ativos vinculados ao sistema."
          icon={UserCog}
        />

        <DashboardCard
          titulo="Marcações brutas pendentes"
          valor={marcacoesBrutasPendentes}
          descricao="Registros brutos ainda não processados."
          icon={DatabaseZap}
        />

        <DashboardCard
          titulo="Importações AFD pendentes"
          valor={importacoesAfdPendentes}
          descricao="Arquivos AFD recebidos, em processamento ou com erro."
          icon={FileUp}
        />

        <DashboardCard
          titulo="Eventos de auditoria"
          valor={eventosAuditoria}
          descricao="Eventos registrados na trilha de auditoria."
          icon={Activity}
        />

        <DashboardCard
          titulo="Minhas ações auditadas"
          valor={eventosAuditoriaUsuario}
          descricao="Eventos de auditoria vinculados ao administrador logado."
          icon={Activity}
        />

        <DashboardCard
          titulo="Servidores sem CPF"
          valor={servidoresSemCpf}
          descricao="Pendência que pode impedir vínculo de marcações AFD."
          icon={ShieldAlert}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Atalho href="/usuarios" titulo="Gerenciar usuários" />
        <Atalho href="/servidores" titulo="Gerenciar servidores" />
        <Atalho href="/afd" titulo="Importar AFD" />
        <Atalho href="/marcacoes-brutas" titulo="Marcações brutas" />
        <Atalho href="/auditoria" titulo="Auditoria" />
        <Atalho href="/integracoes" titulo="Integrações" />
        <Atalho href="/jornadas" titulo="Jornadas" />
        <Atalho href="/homologacao" titulo="Homologação" />
      </section>
    </div>
  );
}

function Atalho({ href, titulo }: { href: string; titulo: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-[var(--card)] p-5 text-sm font-semibold text-[var(--card-foreground)] shadow-sm transition hover:bg-[var(--muted)]"
    >
      {titulo}
    </Link>
  );
}