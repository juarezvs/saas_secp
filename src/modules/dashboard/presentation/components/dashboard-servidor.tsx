import Link from "next/link";
import { Clock3, CalendarDays, FileText, ShieldCheck } from "lucide-react";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { DashboardCard } from "./dashboard-card";

export async function DashboardServidor({ usuarioId }: { usuarioId: string }) {
  const servidor = await prisma.servidor.findFirst({
    where: {
      usuarioId,
      ativo: true,
    },
    include: {
      usuario: true,
      lotacoes: {
        where: {
          status: "ATIVO",
        },
        include: {
          unidade: true,
        },
        orderBy: {
          dataInicio: "desc",
        },
        take: 1,
      },
    },
  });

  if (!servidor) {
    return (
      <div className="space-y-6">
        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
            Dashboard do servidor
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Cadastro não localizado
          </h1>

          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Seu usuário ainda não está vinculado a um servidor ativo.
          </p>
        </section>
      </div>
    );
  }

  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  const hojeFim = new Date();
  hojeFim.setHours(23, 59, 59, 999);

  const inicioMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );
  const fimMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    1,
  );

  const [marcacoesHoje, apuracoesMes, solicitacoesPendentes, biometria] =
    await Promise.all([
      prisma.marcacao.count({
        where: {
          servidorId: servidor.id,
          dataHora: {
            gte: hojeInicio,
            lte: hojeFim,
          },
        },
      }),

      prisma.apuracaoDiaria.count({
        where: {
          servidorId: servidor.id,
          dataReferencia: {
            gte: inicioMes,
            lt: fimMes,
          },
        },
      }),

      prisma.solicitacao.count({
        where: {
          servidorId: servidor.id,
          status: {
            in: ["ENVIADA", "EM_ANALISE"],
          },
        },
      }),

      prisma.biometriaFacialServidor.findFirst({
        where: {
          servidorId: servidor.id,
          status: "ATIVO",
        },
        select: {
          id: true,
        },
      }),
    ]);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Dashboard do servidor
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Olá, {servidor.usuario.nome}
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Acompanhe suas marcações, espelho de ponto, solicitações e situação
          biométrica.
        </p>

        {servidor.lotacoes[0] && (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Lotação atual: {servidor.lotacoes[0].unidade.sigla} —{" "}
            {servidor.lotacoes[0].unidade.nome}
          </p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          titulo="Marcações hoje"
          valor={marcacoesHoje}
          descricao="Quantidade de registros realizados no dia."
          icon={Clock3}
        />

        <DashboardCard
          titulo="Dias apurados no mês"
          valor={apuracoesMes}
          descricao="Dias com apuração calculada na competência atual."
          icon={CalendarDays}
        />

        <DashboardCard
          titulo="Solicitações pendentes"
          valor={solicitacoesPendentes}
          descricao="Solicitações próprias ainda não concluídas."
          icon={FileText}
        />

        <DashboardCard
          titulo="Biometria facial"
          valor={biometria ? "Ativa" : "Pendente"}
          descricao="Situação do cadastro facial para registro autorizado."
          icon={ShieldCheck}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Atalho href="/marcacoes/registrar" titulo="Registrar marcação" />
        <Atalho href="/espelho-ponto" titulo="Ver espelho mensal" />
        <Atalho href="/banco-horas" titulo="Banco de horas" />
        <Atalho href="/biometria/cadastro" titulo="Cadastrar biometria" />
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
