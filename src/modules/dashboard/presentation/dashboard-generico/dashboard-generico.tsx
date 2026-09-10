import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Compass,
  DatabaseZap,
  FileSpreadsheet,
  Hourglass,
  Settings,
  ShieldCheck,
  UserCog,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/components/ui";
import {
  DashboardFeatureCard,
  type DashboardFeatureCardColor,
} from "@/modules/dashboard/presentation/components/dashboard-feature-card";
import { PageHeader } from "@/components/layout/page-header";
import type { FavoritoUsuarioPerfilDto } from "@/modules/favoritos/application/favoritos-usuario-perfil.service";
import { DashboardFavoritoCard } from "@/modules/favoritos/presentation/dashboard-favorito-card";
import { PERMISSAO_PAINEL_EXECUTIVO } from "@/modules/painel-executivo/presentation/painel-executivo-data";

type DashboardGenericoProps = {
  nome: string;
  perfilNome?: string | null;
  permissoes: string[];
  favoritos?: FavoritoUsuarioPerfilDto[];
  somenteFavoritos?: boolean;
};

const atalhos: Array<{
  titulo: string;
  descricao: string;
  href: string;
  icon: LucideIcon;
  permissoes: string[];
  cor: DashboardFeatureCardColor;
}> = [
  {
    titulo: "Espelho de ponto",
    descricao: "Consulte apuracoes, marcacoes, creditos e debitos da frequencia.",
    href: "/espelho-ponto",
    icon: CalendarDays,
    permissoes: ["espelho-ponto:visualizar:proprio", "apuracao:consultar:global"],
    cor: "azul",
  },
  {
    titulo: "Minha equipe",
    descricao: "Acompanhe presenca, pendencias, ferias e rotinas dos subordinados.",
    href: "/minha-equipe/presencas",
    icon: UsersRound,
    permissoes: ["minha-equipe:consultar:chefia", "minha-equipe:consultar:global"],
    cor: "verde",
  },
  {
    titulo: "Homologacao",
    descricao: "Gerencie fechamento mensal e validacao da frequencia.",
    href: "/homologacao",
    icon: ShieldCheck,
    permissoes: ["homologacao:gerenciar:chefia", "homologacao:gerenciar:global"],
    cor: "cinza",
  },
  {
    titulo: "Banco de horas",
    descricao: "Consulte saldos, vencimentos, solicitacoes e compensacoes.",
    href: "/banco-horas",
    icon: Hourglass,
    permissoes: ["banco-horas:consultar:chefia", "banco-horas:consultar:global"],
    cor: "dourado",
  },
  {
    titulo: "Horas extras",
    descricao: "Solicite, analise e acompanhe a execucao do servico extraordinario.",
    href: "/horas-extras",
    icon: CalendarClock,
    permissoes: ["horas-extras:visualizar:proprio", "horas-extras:analisar:chefia"],
    cor: "azul-claro",
  },
  {
    titulo: "Boletins",
    descricao: "Emita e acompanhe boletins de frequencia por unidade.",
    href: "/boletim-frequencia",
    icon: FileSpreadsheet,
    permissoes: ["boletim-frequencia:gerar:chefia", "boletim-frequencia:consultar:global"],
    cor: "verde-escuro",
  },
  {
    titulo: "Solicitacoes",
    descricao: "Acompanhe pedidos, analises e regularizacoes de ponto.",
    href: "/solicitacoes",
    icon: ClipboardCheck,
    permissoes: ["solicitacoes:consultar:proprio", "solicitacoes:analisar:chefia"],
    cor: "azul",
  },
  {
    titulo: "Painel executivo",
    descricao: "Acesse indicadores institucionais e visao gerencial consolidada.",
    href: "/painel-executivo",
    icon: BarChart3,
    permissoes: [PERMISSAO_PAINEL_EXECUTIVO],
    cor: "cinza",
  },
  {
    titulo: "Administracao",
    descricao: "Gerencie configuracoes, usuarios, cadastros e auditoria.",
    href: "/administracao",
    icon: Settings,
    permissoes: ["configuracoes:gerenciar:global", "usuarios:gerenciar:global"],
    cor: "dourado",
  },
  {
    titulo: "Cadastros",
    descricao: "Acesse pessoas, unidades, perfis e estruturas administrativas.",
    href: "/servidores",
    icon: UserCog,
    permissoes: ["servidores:gerenciar:global", "servidores:consultar:global"],
    cor: "verde",
  },
  {
    titulo: "Integracoes",
    descricao: "Acompanhe SARH, equipamentos biometricos, AFD e rotinas externas.",
    href: "/administracao/integracoes",
    icon: DatabaseZap,
    permissoes: [
      "integracoes:gerenciar:global",
      "integracoes-sarh:executar:global",
      "integracoes-sarh:reprocessar:global",
      "afd:importar:global",
    ],
    cor: "azul-claro",
  },
  {
    titulo: "Rotinas",
    descricao: "Acesse jornadas, regulamentacao, calendarios e parametros do ponto.",
    href: "/jornadas",
    icon: Wrench,
    permissoes: [
      "jornadas:gerenciar:global",
      "regulamentacao-ponto:gerenciar:global",
      "calendario-institucional:gerenciar:global",
    ],
    cor: "verde-escuro",
  },
];

function permitido(permissoesPerfil: string[], permissoesAtalho: string[]) {
  return permissoesAtalho.some((permissao) => permissoesPerfil.includes(permissao));
}

export function DashboardGenerico({
  nome,
  perfilNome,
  permissoes,
  favoritos = [],
  somenteFavoritos = false,
}: DashboardGenericoProps) {
  const cards = atalhos.filter((atalho) => permitido(permissoes, atalho.permissoes));
  const mostrarAtalhosPadrao = !somenteFavoritos;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Compass}
        titulo="Dashboard do perfil"
        descricao={`Ola, ${nome}. As principais funcionalidades liberadas para o perfil ativo aparecem abaixo como atalhos de trabalho.`}
        actions={
          <p className="rounded-md border bg-[var(--muted)] px-3 py-2 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
            {somenteFavoritos ? "Meus favoritos" : (perfilNome ?? "Painel padrao")}
          </p>
        }
      />

      {favoritos.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-black text-[var(--foreground)]">
              Meus favoritos
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Atalhos salvos para o usuario no perfil ativo.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {favoritos.map((favorito, indice) => (
              <DashboardFavoritoCard
                key={favorito.id}
                favorito={favorito}
                indice={indice}
              />
            ))}
          </div>
        </section>
      )}

      {somenteFavoritos && favoritos.length === 0 && (
        <Card className="p-6">
          <p className="text-base font-semibold">Nenhum favorito salvo</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            Use o icone de estrela no cabecalho das telas para montar os
            favoritos deste usuario e perfil.
          </p>
        </Card>
      )}

      {mostrarAtalhosPadrao && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {cards.map((card) => {
            return (
              <DashboardFeatureCard
                key={card.href}
                href={card.href}
                titulo={card.titulo}
                descricao={card.descricao}
                icon={card.icon}
                cor={card.cor}
              />
            );
          })}
        </div>
      )}

      {mostrarAtalhosPadrao && cards.length === 0 && (
        <Card className="p-6">
          <p className="text-base font-semibold">Nenhuma rotina disponivel</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            O perfil ativo esta valido, mas ainda nao possui permissoes de
            navegacao associadas. Ajuste as permissoes do perfil para exibir os
            atalhos principais neste painel.
          </p>
        </Card>
      )}
    </div>
  );
}
