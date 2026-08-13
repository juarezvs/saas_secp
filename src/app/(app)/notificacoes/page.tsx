import Link from "next/link";
import { Bell, CheckCircle2, Inbox } from "lucide-react";

import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui";
import { EmptyState } from "@/components/ui/empty-state";
import {
  listarNotificacoesUsuario,
  type NotificacaoPrioridade,
  type NotificacaoUsuario,
} from "@/modules/notificacoes/application/notificacoes.service";
import { NotificacoesListaFiltrada } from "@/modules/notificacoes/presentation/components/notificacoes-lista-filtrada";

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

export default async function NotificacoesPage() {
  const session = await auth();
  const notificacoes = session?.user
    ? await listarNotificacoesUsuario(session.user.id, {
        perfilAtivo: session.user.perfilAtivo,
      })
    : [];
  const resumo = contarPorPrioridade(notificacoes);
  const totalNaoLidas = notificacoes.filter((notificacao) => !notificacao.lida).length;
  const notificacoesLista = notificacoes.map((notificacao) => ({
    ...notificacao,
    criadoEm: notificacao.criadoEm.toISOString(),
  }));

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
        <NotificacoesListaFiltrada notificacoes={notificacoesLista} />
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
