"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  MessageCircle,
  Search,
  Send,
  X,
} from "lucide-react";
import type { PosicaoChatInternoAcessibilidade } from "@/modules/auth/application/services/preferencias-acessibilidade.service";

type NotificacaoChat = {
  id: string;
  categoria: string;
  prioridade: "alta" | "media" | "baixa";
  titulo: string;
  descricao: string;
  href: string;
  criadoEm: string;
  origem: string;
  lida: boolean;
};

type ConversaChat = {
  id: string;
  nome: string;
  detalhe: string;
  avatar: string;
  totalNaoLidas: number;
  ultimaData: string;
  mensagens: NotificacaoChat[];
};

type EstadoArrastoChat = {
  pointerId: number | null;
  offsetX: number;
  offsetY: number;
  inicioX: number;
  inicioY: number;
  moveu: boolean;
};

const CHAT_MARGIN = 16;
const CHAT_BUTTON_WIDTH_ESTIMADO = 190;
const CHAT_BUTTON_HEIGHT_ESTIMADO = 56;
const CHAT_PANEL_WIDTH_ESTIMADO = 760;
const CHAT_PANEL_HEIGHT_RATIO = 0.76;
const CHAT_DRAG_THRESHOLD = 4;
const CHAT_BREADCRUMB_Y = 74;

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function origemConversa(notificacao: NotificacaoChat) {
  const match = notificacao.descricao.match(
    /^(.+?)\s+(enviou|solicitou|criou)/i,
  );
  const nome = match?.[1]?.replace(/^"|"$/g, "").trim();

  return {
    nome: nome || notificacao.origem || "SECP",
    detalhe: notificacao.origem,
  };
}

function formatarHora(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Manaus",
  }).format(new Date(data));
}

function agruparConversas(notificacoes: NotificacaoChat[]) {
  const mapa = new Map<string, ConversaChat>();

  for (const notificacao of notificacoes) {
    const origem = origemConversa(notificacao);
    const id = `${origem.nome}-${origem.detalhe}`;
    const conversa =
      mapa.get(id) ??
      ({
        id,
        nome: origem.nome,
        detalhe: origem.detalhe,
        avatar: iniciais(origem.nome || "SE"),
        totalNaoLidas: 0,
        ultimaData: notificacao.criadoEm,
        mensagens: [],
      } satisfies ConversaChat);

    conversa.mensagens.push(notificacao);
    conversa.totalNaoLidas += notificacao.lida ? 0 : 1;
    if (new Date(notificacao.criadoEm) > new Date(conversa.ultimaData)) {
      conversa.ultimaData = notificacao.criadoEm;
    }
    mapa.set(id, conversa);
  }

  return Array.from(mapa.values())
    .map((conversa) => ({
      ...conversa,
      mensagens: conversa.mensagens.sort(
        (a, b) =>
          new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime(),
      ),
    }))
    .sort(
      (a, b) =>
        new Date(b.ultimaData).getTime() - new Date(a.ultimaData).getTime(),
    );
}

function isPosicaoChatInterno(
  valor: unknown,
): valor is PosicaoChatInternoAcessibilidade {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return false;
  }

  const objeto = valor as Record<string, unknown>;

  return Number.isFinite(Number(objeto.x)) && Number.isFinite(Number(objeto.y));
}

function limitarPosicaoChat(
  posicao: PosicaoChatInternoAcessibilidade,
  elemento?: HTMLElement | null,
): PosicaoChatInternoAcessibilidade {
  if (typeof window === "undefined") {
    return posicao;
  }

  const largura = elemento?.offsetWidth || CHAT_BUTTON_WIDTH_ESTIMADO;
  const altura = elemento?.offsetHeight || CHAT_BUTTON_HEIGHT_ESTIMADO;
  const maxX = Math.max(CHAT_MARGIN, window.innerWidth - largura - CHAT_MARGIN);
  const maxY = Math.max(CHAT_MARGIN, window.innerHeight - altura - CHAT_MARGIN);

  return {
    x: Math.min(Math.max(Math.round(posicao.x), CHAT_MARGIN), maxX),
    y: Math.min(Math.max(Math.round(posicao.y), CHAT_MARGIN), maxY),
  };
}

function obterPosicaoPadraoChat(
  elemento?: HTMLElement | null,
): PosicaoChatInternoAcessibilidade {
  if (typeof window === "undefined") {
    return {
      x: CHAT_MARGIN,
      y: CHAT_MARGIN,
    };
  }

  const largura = elemento?.offsetWidth || CHAT_BUTTON_WIDTH_ESTIMADO;
  const altura = elemento?.offsetHeight || CHAT_BUTTON_HEIGHT_ESTIMADO;

  return limitarPosicaoChat(
    {
      x: Math.round((window.innerWidth - largura) / 2),
      y: CHAT_BREADCRUMB_Y,
    },
    elemento,
  );
}

function obterPosicaoPadraoPainelChat(
  elemento?: HTMLElement | null,
): PosicaoChatInternoAcessibilidade {
  if (typeof window === "undefined") {
    return {
      x: CHAT_MARGIN,
      y: CHAT_MARGIN,
    };
  }

  const largura =
    elemento?.offsetWidth ||
    Math.min(window.innerWidth * 0.92, CHAT_PANEL_WIDTH_ESTIMADO);
  const altura =
    elemento?.offsetHeight ||
    Math.round(window.innerHeight * CHAT_PANEL_HEIGHT_RATIO);

  return limitarPosicaoChat(
    {
      x: window.innerWidth - largura - CHAT_MARGIN,
      y: window.innerHeight - altura - CHAT_MARGIN,
    },
    elemento,
  );
}

async function carregarPosicaoChatInterno() {
  const response = await fetch("/api/sessao/acessibilidade", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as {
    preferencias?: { chatInternoPosicao?: unknown };
  } | null;
  const posicao = payload?.preferencias?.chatInternoPosicao;

  return isPosicaoChatInterno(posicao)
    ? {
        x: Number(posicao.x),
        y: Number(posicao.y),
      }
    : null;
}

async function salvarPosicaoChatInterno(
  posicao: PosicaoChatInternoAcessibilidade,
) {
  await fetch("/api/sessao/acessibilidade", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chatInternoPosicao: posicao,
    }),
  }).catch(() => undefined);
}

export function ChatInternoWidget({
  perfilAtivoCodigo,
  totalInicial,
}: {
  perfilAtivoCodigo: string;
  totalInicial: number;
}) {
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const posicaoRef = useRef<PosicaoChatInternoAcessibilidade | null>(null);
  const arrastoRef = useRef<EstadoArrastoChat>({
    pointerId: null,
    offsetX: 0,
    offsetY: 0,
    inicioX: 0,
    inicioY: 0,
    moveu: false,
  });
  const [aberto, setAberto] = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const [busca, setBusca] = useState("");
  const [notificacoes, setNotificacoes] = useState<NotificacaoChat[]>([]);
  const [totalContador, setTotalContador] = useState(totalInicial);
  const [carregando, setCarregando] = useState(false);
  const [posicao, setPosicao] =
    useState<PosicaoChatInternoAcessibilidade | null>(null);
  const conversas = useMemo(
    () => agruparConversas(notificacoes),
    [notificacoes],
  );
  const conversasFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    if (!termo) return conversas;

    return conversas.filter(
      (conversa) =>
        conversa.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
        conversa.mensagens.some((mensagem) =>
          `${mensagem.titulo} ${mensagem.descricao}`
            .toLocaleLowerCase("pt-BR")
            .includes(termo),
        ),
    );
  }, [busca, conversas]);
  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(null);
  const conversaAtiva =
    conversas.find((conversa) => conversa.id === conversaAtivaId) ??
    conversasFiltradas[0] ??
    null;
  const totalNaoLidas = notificacoes.length
    ? notificacoes.filter((notificacao) => !notificacao.lida).length
    : totalContador;

  const posicionar = useCallback(
    (
      proximaPosicao: PosicaoChatInternoAcessibilidade,
      elemento?: HTMLElement | null,
    ) => {
      const posicaoLimitada = limitarPosicaoChat(
        proximaPosicao,
        elemento ?? painelRef.current ?? botaoRef.current,
      );

      posicaoRef.current = posicaoLimitada;
      setPosicao(posicaoLimitada);

      return posicaoLimitada;
    },
    [],
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const response = await fetch("/api/notificacoes?chat=1", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        notificacoes?: NotificacaoChat[];
      };
      setNotificacoes(payload.notificacoes ?? []);
      setTotalContador(
        (payload.notificacoes ?? []).filter((notificacao) => !notificacao.lida)
          .length,
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarContador = useCallback(async () => {
    try {
      const response = await fetch("/api/notificacoes/contador", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { total?: number };
      setTotalContador(Number(payload.total ?? 0));
    } catch {
      setTotalContador(totalInicial);
    }
  }, [totalInicial]);

  useEffect(() => {
    setNotificacoes([]);
    setConversaAtivaId(null);
    setTotalContador(totalInicial);
    void carregarContador();
  }, [perfilAtivoCodigo, totalInicial, carregarContador]);

  useEffect(() => {
    if (aberto) {
      void carregar();
    }
  }, [aberto, carregar]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (aberto) void carregar();
    }, 45_000);

    return () => window.clearInterval(timer);
  }, [aberto, carregar]);

  useEffect(() => {
    let cancelado = false;

    void carregarPosicaoChatInterno()
      .then((posicaoSalva) => {
        if (cancelado) {
          return;
        }

        posicionar(posicaoSalva ?? obterPosicaoPadraoChat(botaoRef.current));
      })
      .catch(() => {
        if (!cancelado) {
          posicionar(obterPosicaoPadraoChat(botaoRef.current));
        }
      });

    return () => {
      cancelado = true;
    };
  }, [posicionar]);

  useEffect(() => {
    function aoRedimensionar() {
      setPosicao((posicaoAtual) => {
        const elemento = aberto ? painelRef.current : botaoRef.current;
        const proximaPosicao = posicaoAtual
          ? limitarPosicaoChat(posicaoAtual, elemento)
          : aberto
            ? obterPosicaoPadraoPainelChat(elemento)
            : obterPosicaoPadraoChat(elemento);

        posicaoRef.current = proximaPosicao;

        return proximaPosicao;
      });
    }

    window.addEventListener("resize", aoRedimensionar);

    return () => window.removeEventListener("resize", aoRedimensionar);
  }, [aberto]);

  function iniciarArrasto(
    evento: PointerEvent<HTMLElement>,
    elementoReferencia: HTMLElement,
    ignorarControles = true,
  ) {
    if (evento.button !== 0) {
      return;
    }

    const alvo = evento.target as HTMLElement;

    if (
      ignorarControles &&
      alvo.closest("button, a, input, textarea, select")
    ) {
      return;
    }

    const rect = elementoReferencia.getBoundingClientRect();
    const posicaoAtual =
      posicaoRef.current ??
      posicao ??
      (aberto
        ? obterPosicaoPadraoPainelChat(elementoReferencia)
        : obterPosicaoPadraoChat(elementoReferencia));

    arrastoRef.current = {
      pointerId: evento.pointerId,
      offsetX: evento.clientX - rect.left,
      offsetY: evento.clientY - rect.top,
      inicioX: evento.clientX,
      inicioY: evento.clientY,
      moveu: false,
    };

    posicaoRef.current = posicaoAtual;
    setPosicao(posicaoAtual);
    elementoReferencia.setPointerCapture(evento.pointerId);
  }

  function moverArrasto(
    evento: PointerEvent<HTMLElement>,
    elementoReferencia: HTMLElement,
  ) {
    const arrasto = arrastoRef.current;

    if (arrasto.pointerId !== evento.pointerId) {
      return;
    }

    if (
      !arrasto.moveu &&
      Math.hypot(
        evento.clientX - arrasto.inicioX,
        evento.clientY - arrasto.inicioY,
      ) > CHAT_DRAG_THRESHOLD
    ) {
      arrasto.moveu = true;
    }

    if (!arrasto.moveu) {
      return;
    }

    evento.preventDefault();
    posicionar(
      {
        x: evento.clientX - arrasto.offsetX,
        y: evento.clientY - arrasto.offsetY,
      },
      elementoReferencia,
    );
  }

  function finalizarArrasto(
    evento: PointerEvent<HTMLElement>,
    elementoReferencia: HTMLElement,
    abrirAoClique: boolean,
  ) {
    const arrasto = arrastoRef.current;

    if (arrasto.pointerId !== evento.pointerId) {
      return;
    }

    arrastoRef.current = {
      pointerId: null,
      offsetX: 0,
      offsetY: 0,
      inicioX: 0,
      inicioY: 0,
      moveu: false,
    };

    try {
      elementoReferencia.releasePointerCapture(evento.pointerId);
    } catch {
      // Alguns navegadores liberam a captura automaticamente.
    }

    if (arrasto.moveu) {
      const posicaoFinal = limitarPosicaoChat(
        posicaoRef.current ??
          (aberto
            ? obterPosicaoPadraoPainelChat(elementoReferencia)
            : obterPosicaoPadraoChat(elementoReferencia)),
        elementoReferencia,
      );
      posicaoRef.current = posicaoFinal;
      setPosicao(posicaoFinal);
      void salvarPosicaoChatInterno(posicaoFinal);
      return;
    }

    if (abrirAoClique) {
      setAberto(true);
    }
  }

  function aoPointerDownBotao(evento: PointerEvent<HTMLButtonElement>) {
    iniciarArrasto(evento, evento.currentTarget, false);
  }

  function aoPointerMoveBotao(evento: PointerEvent<HTMLButtonElement>) {
    moverArrasto(evento, evento.currentTarget);
  }

  function aoPointerUpBotao(evento: PointerEvent<HTMLButtonElement>) {
    finalizarArrasto(evento, evento.currentTarget, true);
  }

  function aoPointerCancelBotao(evento: PointerEvent<HTMLButtonElement>) {
    finalizarArrasto(evento, evento.currentTarget, false);
  }

  function aoPointerDownPainel(evento: PointerEvent<HTMLElement>) {
    if (painelRef.current) {
      iniciarArrasto(evento, painelRef.current);
    }
  }

  function aoPointerMovePainel(evento: PointerEvent<HTMLElement>) {
    if (painelRef.current) {
      moverArrasto(evento, painelRef.current);
    }
  }

  function aoPointerUpPainel(evento: PointerEvent<HTMLElement>) {
    if (painelRef.current) {
      finalizarArrasto(evento, painelRef.current, false);
    }
  }

  function aoPointerCancelPainel(evento: PointerEvent<HTMLElement>) {
    if (painelRef.current) {
      finalizarArrasto(evento, painelRef.current, false);
    }
  }

  async function marcarComoLida(notificacao: NotificacaoChat) {
    setNotificacoes((atuais) =>
      atuais.map((item) =>
        item.id === notificacao.id ? { ...item, lida: true } : item,
      ),
    );
    await fetch("/api/notificacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificacaoId: notificacao.id }),
    });
  }

  if (!aberto) {
    return (
      <button
        ref={botaoRef}
        type="button"
        onPointerDown={aoPointerDownBotao}
        onPointerMove={aoPointerMoveBotao}
        onPointerUp={aoPointerUpBotao}
        onPointerCancel={aoPointerCancelBotao}
        className="fixed z-50 inline-flex h-14 touch-none select-none items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 font-black text-slate-950 shadow-2xl shadow-slate-950/20 transition hover:shadow-2xl"
        style={
          posicao
            ? {
                left: posicao.x,
                top: posicao.y,
              }
            : {
                right: CHAT_MARGIN,
                bottom: CHAT_MARGIN,
              }
        }
        aria-label="Abrir chat interno"
        title="Clique para abrir. Arraste para mover."
      >
        <MessageCircle className="size-5 text-[#5135f5]" aria-hidden="true" />
        <span>Mensagens</span>
        {totalNaoLidas > 0 ? (
          <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">
            {totalNaoLidas > 99 ? "99+" : totalNaoLidas}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div
      ref={painelRef}
      className="fixed z-50 flex max-h-[76vh] w-[min(92vw,760px)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl shadow-slate-950/25"
      onPointerMove={aoPointerMovePainel}
      onPointerUp={aoPointerUpPainel}
      onPointerCancel={aoPointerCancelPainel}
      style={
        posicao
          ? {
              left: posicao.x,
              top: posicao.y,
            }
          : {
              right: CHAT_MARGIN,
              bottom: CHAT_MARGIN,
            }
      }
    >
      <section className="w-full border-r border-slate-200 md:w-80">
        <header
          className="flex h-14 touch-none select-none items-center justify-between border-b border-slate-200 px-4"
          onPointerDown={aoPointerDownPainel}
          onPointerMove={aoPointerMovePainel}
          onPointerUp={aoPointerUpPainel}
          onPointerCancel={aoPointerCancelPainel}
          title="Arraste para mover o chat."
        >
          <div className="flex items-center gap-2 font-black">
            <MessageCircle className="size-5 text-[#5135f5]" />
            Mensagens
            {totalNaoLidas > 0 ? (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                {totalNaoLidas} novas
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-slate-100"
              onClick={() => setMinimizado((valor) => !valor)}
              aria-label="Minimizar mensagens"
            >
              <ChevronDown className="size-4" />
            </button>
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-slate-100"
              onClick={() => setAberto(false)}
              aria-label="Fechar mensagens"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        {!minimizado ? (
          <>
            <div className="p-3">
              <label className="flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm text-slate-500">
                <Search className="size-4" />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  placeholder="Pesquisar mensagens"
                />
              </label>
            </div>

            <div className="max-h-[calc(76vh-7rem)] overflow-y-auto px-2 pb-2">
              {conversasFiltradas.map((conversa) => (
                <button
                  key={conversa.id}
                  type="button"
                  onClick={() => setConversaAtivaId(conversa.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                    conversaAtiva?.id === conversa.id
                      ? "bg-[#5135f5]/10"
                      : "hover:bg-slate-100"
                  }`}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-white">
                    {conversa.avatar}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold">
                        {conversa.nome}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatarHora(conversa.ultimaData)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {conversa.mensagens.at(-1)?.descricao}
                    </span>
                  </span>
                  {conversa.totalNaoLidas > 0 ? (
                    <span className="rounded-full bg-[#5135f5] px-2 py-1 text-xs font-black text-white">
                      {conversa.totalNaoLidas}
                    </span>
                  ) : null}
                </button>
              ))}

              {conversasFiltradas.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">
                  {carregando ? "Carregando mensagens..." : "Nenhuma mensagem."}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </section>

      {!minimizado && conversaAtiva ? (
        <section className="hidden min-w-0 flex-1 flex-col md:flex">
          <header className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
            <div className="min-w-0">
              <p className="truncate font-black">{conversaAtiva.nome}</p>
              <p className="truncate text-xs text-slate-500">
                {conversaAtiva.detalhe}
              </p>
            </div>
          </header>

          <div className="flex max-h-[calc(76vh-7rem)] flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 p-4">
            {conversaAtiva.mensagens.map((mensagem) => (
              <div
                key={mensagem.id}
                className={`rounded-2xl border p-4 shadow-sm ${
                  mensagem.prioridade === "alta"
                    ? "border-amber-200 bg-amber-50 text-amber-950"
                    : "border-slate-200 bg-white text-slate-950"
                }`}
              >
                <div className="flex items-start gap-2">
                  {mensagem.lida ? (
                    <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
                  ) : (
                    <Bell className="mt-0.5 size-4 text-[#5135f5]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{mensagem.titulo}</p>
                    <p className="mt-1 text-sm leading-6">
                      {mensagem.descricao}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-500">
                        {formatarHora(mensagem.criadoEm)}
                      </span>
                      <Link
                        href={mensagem.href}
                        onClick={() => void marcarComoLida(mensagem)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#5135f5] px-3 text-sm font-black text-white hover:bg-[#452add]"
                      >
                        Analisar
                        <Send className="size-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
