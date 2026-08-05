import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  Hourglass,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { Card } from "@/components/ui";

type DashboardGenericoProps = {
  nome: string;
  perfilNome?: string | null;
  permissoes: string[];
};

const atalhos = [
  {
    titulo: "Espelho de ponto",
    descricao: "Consulte apurações, marcações, créditos e débitos.",
    href: "/espelho-ponto",
    icon: CalendarDays,
    permissoes: ["espelho-ponto:visualizar:proprio", "apuracao:consultar:global"],
  },
  {
    titulo: "Minha equipe",
    descricao: "Acompanhe presença, pendências e rotinas dos subordinados.",
    href: "/minha-equipe/presencas",
    icon: UsersRound,
    permissoes: ["minha-equipe:consultar:chefia", "minha-equipe:consultar:global"],
  },
  {
    titulo: "Homologação",
    descricao: "Gerencie fechamento mensal e validação da frequência.",
    href: "/homologacao",
    icon: ShieldCheck,
    permissoes: ["homologacao:gerenciar:chefia", "homologacao:gerenciar:global"],
  },
  {
    titulo: "Banco de horas",
    descricao: "Consulte saldos, vencimentos, solicitações e compensações.",
    href: "/banco-horas",
    icon: Hourglass,
    permissoes: ["banco-horas:consultar:chefia", "banco-horas:consultar:global"],
  },
  {
    titulo: "Horas extras",
    descricao: "Solicitação, análise, execução e folha do serviço extraordinário.",
    href: "/horas-extras",
    icon: CalendarClock,
    permissoes: ["horas-extras:visualizar:proprio", "horas-extras:analisar:chefia"],
  },
  {
    titulo: "Boletins",
    descricao: "Emita e acompanhe boletins de frequência por unidade.",
    href: "/boletim-frequencia",
    icon: FileSpreadsheet,
    permissoes: ["boletim-frequencia:gerar:chefia", "boletim-frequencia:consultar:global"],
  },
  {
    titulo: "Solicitações",
    descricao: "Acompanhe pedidos, análises e regularizações de ponto.",
    href: "/solicitacoes",
    icon: ClipboardCheck,
    permissoes: ["solicitacoes:consultar:proprio", "solicitacoes:analisar:chefia"],
  },
  {
    titulo: "Painel executivo",
    descricao: "Indicadores institucionais e visão gerencial consolidada.",
    href: "/painel-executivo",
    icon: BarChart3,
    permissoes: ["painel-executivo:visualizar:global"],
  },
  {
    titulo: "Administração",
    descricao: "Configurações, usuários, cadastros, integrações e auditoria.",
    href: "/administracao",
    icon: Settings,
    permissoes: ["configuracoes:gerenciar:global", "usuarios:gerenciar:global"],
  },
];

function permitido(permissoesPerfil: string[], permissoesAtalho: string[]) {
  return permissoesAtalho.some((permissao) => permissoesPerfil.includes(permissao));
}

export function DashboardGenerico({
  nome,
  perfilNome,
  permissoes,
}: DashboardGenericoProps) {
  const cards = atalhos.filter((atalho) => permitido(permissoes, atalho.permissoes));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-[var(--card)] p-6 shadow-sm">
        <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
          {perfilNome ?? "Perfil ativo"}
        </p>
        <h1 className="mt-2 text-2xl font-bold">Olá, {nome}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
          Suas rotinas principais estão organizadas abaixo conforme as permissões
          do perfil ativo.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link key={card.href} href={card.href}>
              <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:border-blue-800 hover:shadow-md">
                <div className="flex items-start gap-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border bg-[var(--muted)]">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-base font-bold">{card.titulo}</span>
                    <span className="mt-1 block text-sm leading-6 text-[var(--muted-foreground)]">
                      {card.descricao}
                    </span>
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

