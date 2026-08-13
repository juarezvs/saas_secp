"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Clock3,
  Filter,
  Fingerprint,
  Hourglass,
  Inbox,
  ShieldCheck,
} from "lucide-react";

import { Badge, Button, Card, CardContent } from "@/components/ui";
import { abrirNotificacaoAction } from "@/modules/notificacoes/application/actions/abrir-notificacao.action";
import type {
  NotificacaoCategoria,
  NotificacaoPrioridade,
  NotificacaoUsuario,
} from "@/modules/notificacoes/application/notificacoes.service";

export type NotificacaoListaItem = Omit<NotificacaoUsuario, "criadoEm"> & {
  criadoEm: string;
};

const rotulosCategoria: Record<NotificacaoCategoria, string> = {
  solicitacao: "Solicitação",
  frequencia: "Frequência",
  banco_horas: "Banco de horas",
  homologacao: "Homologação",
  marcacao: "Marcação",
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
  marcacao: Fingerprint,
} satisfies Record<NotificacaoCategoria, typeof Bell>;

function formatarDataHora(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Manaus",
  }).format(new Date(data));
}

function NotificacaoCard({
  notificacao,
}: {
  notificacao: NotificacaoListaItem;
}) {
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
            <span className="secp-theme-icon flex size-11 items-center justify-center rounded-md">
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

export function NotificacoesListaFiltrada({
  notificacoes,
}: {
  notificacoes: NotificacaoListaItem[];
}) {
  const [mostrarNaoLidas, setMostrarNaoLidas] = useState(true);
  const [mostrarLidas, setMostrarLidas] = useState(false);
  const [filtroAberto, setFiltroAberto] = useState(false);

  const { lidas, naoLidas } = useMemo(
    () => ({
      lidas: notificacoes.filter((notificacao) => notificacao.lida),
      naoLidas: notificacoes.filter((notificacao) => !notificacao.lida),
    }),
    [notificacoes],
  );

  const grupos = [
    ...(mostrarNaoLidas
      ? [
          {
            titulo: "Não lidas",
            descricao: "Notificações pendentes de leitura",
            notificacoes: naoLidas,
          },
        ]
      : []),
    ...(mostrarLidas
      ? [
          {
            titulo: "Lidas",
            descricao: "Notificações já abertas",
            notificacoes: lidas,
          },
        ]
      : []),
  ];

  const totalFiltrado = grupos.reduce(
    (total, grupo) => total + grupo.notificacoes.length,
    0,
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Notificações</h2>
          <p className="text-sm text-muted-foreground">
            Exibindo {totalFiltrado} de {notificacoes.length} notificações.
          </p>
        </div>

        <div className="relative self-start">
          <Button
            type="button"
            variant="outline"
            leftIcon={<Filter className="size-4" aria-hidden="true" />}
            aria-expanded={filtroAberto}
            aria-controls="filtros-notificacoes"
            onClick={() => setFiltroAberto((aberto) => !aberto)}
          >
            Filtrar
          </Button>

          {filtroAberto ? (
            <div
              id="filtros-notificacoes"
              className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-border bg-card p-3 shadow-lg"
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Status da leitura
              </p>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/60">
                <span>Não lidas</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {naoLidas.length}
                  <input
                    type="checkbox"
                    checked={mostrarNaoLidas}
                    onChange={(event) =>
                      setMostrarNaoLidas(event.target.checked)
                    }
                    className="size-4 rounded border-border text-blue-900"
                  />
                </span>
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/60">
                <span>Lidas</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {lidas.length}
                  <input
                    type="checkbox"
                    checked={mostrarLidas}
                    onChange={(event) => setMostrarLidas(event.target.checked)}
                    className="size-4 rounded border-border text-blue-900"
                  />
                </span>
              </label>
            </div>
          ) : null}
        </div>
      </div>

      {totalFiltrado > 0 ? (
        <div className="space-y-6">
          {grupos.map((grupo) =>
            grupo.notificacoes.length > 0 ? (
              <div key={grupo.titulo} className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    {grupo.titulo}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {grupo.descricao}
                  </p>
                </div>
                <div className="space-y-3">
                  {grupo.notificacoes.map((notificacao) => (
                    <NotificacaoCard
                      key={notificacao.id}
                      notificacao={notificacao}
                    />
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <Inbox className="size-5" aria-hidden="true" />
            Nenhuma notificação encontrada para o filtro selecionado.
          </CardContent>
        </Card>
      )}
    </section>
  );
}
