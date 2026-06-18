import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Clock3,
  Hourglass,
  Inbox,
  ShieldCheck,
} from "lucide-react";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, Card, CardContent } from "@/components/ui";
import { EmptyState } from "@/components/ui/empty-state";
import { abrirNotificacaoAction } from "@/modules/notificacoes/application/actions/abrir-notificacao.action";
import {
  listarNotificacoesUsuario,
  type NotificacaoCategoria,
  type NotificacaoPrioridade,
  type NotificacaoUsuario,
} from "@/modules/notificacoes/application/notificacoes.service";

const rotulosCategoria: Record<NotificacaoCategoria, string> = {
  solicitacao: "Solicitação",
  frequencia: "Frequência",
  banco_horas: "Banco de horas",
  homologacao: "Homologação",
};

const rotulosPrioridade: Record<NotificacaoPrioridade, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

const variantesPrioridade: Record<
  NotificacaoPrioridade,
  "critico" | "pendente" | "regular"
> = {
  alta: "critico",
  media: "pendente",
  baixa: "regular",
};

const iconesCategoria = {
  solicitacao: Clock3,
  frequencia: Bell,
  banco_horas: Hourglass,
  homologacao: ShieldCheck,
} satisfies Record<NotificacaoCategoria, typeof Bell>;

function formatarDataHora(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Manaus",
  }).format(data);
}

function contarPorPrioridade(notificacoes: NotificacaoUsuario[]) {
  return notificacoes.reduce(
    (acc, notificacao) => {
      acc[notificacao.prioridade] += 1;
      return acc;
    },
    {
      alta: 0,
      media: 0,
      baixa: 0,
    } satisfies Record<NotificacaoPrioridade, number>,
  );
}

function NotificacaoCard({ notificacao }: { notificacao: NotificacaoUsuario }) {
  const Icone = iconesCategoria[notificacao.categoria];

  return (
    <Card interactive className={notificacao.lida ? "opacity-75" : undefined}>
      <CardContent className="p-0">
        <form action={abrirNotificacaoAction}>
          <input type="hidden" name="notificacaoId" value={notificacao.id} />
          <input type="hidden" name="href" value={notificacao.href} />
          <button
            type="submit"
            className="grid w-full gap-4 p-5 text-left transition hover:bg-muted/50 md:grid-cols-[auto_1fr_auto]"
        >
            <span className="flex size-11 items-center justify-center rounded-md bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200">
              <Icone className="size-5" aria-hidden="true" />
            </span>

            <span className="min-w-0 space-y-2">
              <span className="flex flex-wrap items-center gap-2">
                <Badge>{rotulosCategoria[notificacao.categoria]}</Badge>
                <Badge variant={variantesPrioridade[notificacao.prioridade]}>
                  Prioridade {rotulosPrioridade[notificacao.prioridade]}
                </Badge>
                <Badge variant={notificacao.lida ? "default" : "aguardando"}>
                  {notificacao.lida ? "Lida" : "Não lida"}
                </Badge>
                <span className="text-xs font-medium text-muted-foreground">
                  {notificacao.origem}
                </span>
              </span>

              <span className="block text-base font-bold text-foreground">
                {notificacao.titulo}
              </span>
              <span className="block text-sm leading-6 text-muted-foreground">
                {notificacao.descricao}
              </span>
            </span>

            <span className="text-sm font-medium text-muted-foreground md:text-right">
              {formatarDataHora(notificacao.criadoEm)}
            </span>
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

export default async function NotificacoesPage() {
  const session = await auth();
  const notificacoes = session?.user
    ? await listarNotificacoesUsuario(session.user.id)
    : [];
  const resumo = contarPorPrioridade(notificacoes);
  const totalNaoLidas = notificacoes.filter((notificacao) => !notificacao.lida).length;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Notificações" }]} />

      <PageHeader
        icon={Bell}
        titulo="Notificações"
        descricao="Acompanhe pendências e retornos gerados a partir dos dados reais de frequência, solicitações, banco de horas e homologação."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-sm font-medium text-muted-foreground">Ativas</p>
            <p className="mt-2 text-3xl font-bold">{notificacoes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm font-medium text-muted-foreground">
              Não lidas
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-900 dark:text-blue-200">
              {totalNaoLidas}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm font-medium text-muted-foreground">
              Prioridade alta
            </p>
            <p className="mt-2 text-3xl font-bold text-secp-danger">
              {resumo.alta}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm font-medium text-muted-foreground">
              Prioridade média
            </p>
            <p className="mt-2 text-3xl font-bold">{resumo.media}</p>
          </CardContent>
        </Card>
      </section>

      {notificacoes.length > 0 ? (
        <section className="space-y-3">
          {notificacoes.map((notificacao) => (
            <NotificacaoCard
              key={notificacao.id}
              notificacao={notificacao}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          icon={Inbox}
          title="Nenhuma notificação ativa"
          description="Quando houver solicitação para análise, retorno de pedido, pendência de frequência ou banco de horas, ela aparecerá aqui."
          action={
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Voltar ao dashboard
            </Link>
          }
        />
      )}
    </div>
  );
}
