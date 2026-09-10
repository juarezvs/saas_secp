import {
  Activity,
  ClipboardCheck,
  DatabaseZap,
  FileUp,
  Gauge,
  GitBranch,
  ShieldAlert,
  ShieldCheck,
  Users,
  UserCog,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { DashboardCard } from "./dashboard-card";
import { DashboardFeatureCard } from "./dashboard-feature-card";
import type { DashboardFeatureCardColor } from "./dashboard-feature-card";

const atalhosAdministracao: Array<{
  href: string;
  titulo: string;
  descricao: string;
  icon: LucideIcon;
  cor: DashboardFeatureCardColor;
}> = [
  {
    href: "/usuarios",
    titulo: "Gerenciar usuários",
    descricao:
      "Cadastre usuários, perfis de acesso e vínculos administrativos do SECP.",
    icon: Users,
    cor: "azul",
  },
  {
    href: "/servidores",
    titulo: "Gerenciar servidores",
    descricao:
      "Consulte pessoas, vínculos funcionais, identificadores e dados cadastrais.",
    icon: UserCog,
    cor: "verde",
  },
  {
    href: "/afd",
    titulo: "Importar AFD",
    descricao:
      "Acompanhe importações de arquivos de ponto e respectivos processamentos.",
    icon: FileUp,
    cor: "dourado",
  },
  {
    href: "/marcacoes-brutas",
    titulo: "Marcações brutas",
    descricao:
      "Pesquise registros capturados por equipamento, web, facial e integrações.",
    icon: DatabaseZap,
    cor: "azul-claro",
  },
  {
    href: "/auditoria",
    titulo: "Auditoria",
    descricao:
      "Consulte eventos auditáveis e rastreie ações relevantes no sistema.",
    icon: Activity,
    cor: "cinza",
  },
  {
    href: "/administracao/integracoes",
    titulo: "Integrações",
    descricao:
      "Configure conectores institucionais, sincronizações e parâmetros técnicos.",
    icon: GitBranch,
    cor: "verde-escuro",
  },
  {
    href: "/jornadas",
    titulo: "Jornadas",
    descricao:
      "Mantenha cadastros de horários, regras de jornada e referências de apuração.",
    icon: Gauge,
    cor: "azul",
  },
  {
    href: "/homologacao",
    titulo: "Homologação",
    descricao:
      "Acompanhe competências, conferências mensais e pendências de frequência.",
    icon: ClipboardCheck,
    cor: "dourado",
  },
];

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
      <PageHeader
        icon={ShieldCheck}
        titulo="Visão geral do SECP"
        descricao="Dashboard administrativo. Monitore cadastros, importações AFD, marcações brutas, auditoria e pendências operacionais do sistema."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DashboardCard
          titulo="Usuários"
          valor={totalUsuarios}
          descricao="Total de usuários cadastrados no SECP."
          icon={Users}
          cor="azul"
        />

        <DashboardCard
          titulo="Servidores ativos"
          valor={totalServidores}
          descricao="Servidores ativos vinculados ao sistema."
          icon={UserCog}
          cor="verde"
        />

        <DashboardCard
          titulo="Marcações brutas pendentes"
          valor={marcacoesBrutasPendentes}
          descricao="Registros brutos ainda não processados."
          icon={DatabaseZap}
          cor="dourado"
        />

        <DashboardCard
          titulo="Importações AFD pendentes"
          valor={importacoesAfdPendentes}
          descricao="Arquivos AFD recebidos, em processamento ou com erro."
          icon={FileUp}
          cor="azul-claro"
        />

        <DashboardCard
          titulo="Eventos de auditoria"
          valor={eventosAuditoria}
          descricao="Eventos registrados na trilha de auditoria."
          icon={Activity}
          cor="cinza"
        />

        <DashboardCard
          titulo="Minhas ações auditadas"
          valor={eventosAuditoriaUsuario}
          descricao="Eventos de auditoria vinculados ao administrador logado."
          icon={Activity}
          cor="verde-escuro"
        />

        <DashboardCard
          titulo="Servidores sem CPF"
          valor={servidoresSemCpf}
          descricao="Pendência que pode impedir vínculo de marcações AFD."
          icon={ShieldAlert}
          cor="dourado"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {atalhosAdministracao.map((atalho) => (
          <DashboardFeatureCard
            key={atalho.href}
            href={atalho.href}
            titulo={atalho.titulo}
            descricao={atalho.descricao}
            icon={atalho.icon}
            cor={atalho.cor}
          />
        ))}
      </section>
    </div>
  );
}
