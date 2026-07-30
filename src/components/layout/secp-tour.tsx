"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react";

type TourStep = {
  id: string;
  target?: string;
  titulo: string;
  descricao: string;
};

const TOUR_SERVIDOR: TourStep[] = [
  {
    id: "boas-vindas",
    titulo: "Bem-vindo ao passeio pelo SECP",
    descricao:
      "Este tour apresenta os principais pontos da navegação do servidor. Você pode avançar, voltar ou encerrar quando quiser.",
  },
  {
    id: "menu",
    target: "[data-tour='menu-lateral']",
    titulo: "Menu lateral",
    descricao:
      "Aqui ficam as funcionalidades liberadas para o perfil ativo. O SECP mostra apenas as opções compatíveis com suas permissões.",
  },
  {
    id: "perfil",
    target: "[data-tour='perfil-ativo']",
    titulo: "Perfil ativo",
    descricao:
      "Quando você tiver mais de um perfil, use este campo para alternar o papel de atuação no sistema.",
  },
  {
    id: "registrar-ponto",
    target: "[data-tour='menu-/marcacoes/registrar']",
    titulo: "Registrar ponto",
    descricao:
      "Use esta opção para registrar a marcação pelo SECP, quando essa permissão estiver disponível para o servidor.",
  },
  {
    id: "ponto-hoje",
    target: "[data-tour='menu-/marcacoes']",
    titulo: "Ponto de hoje",
    descricao:
      "Acompanhe as marcações do dia e confira rapidamente se entrada, saída e demais registros foram processados.",
  },
  {
    id: "historico",
    target: "[data-tour='menu-/historico-marcacoes']",
    titulo: "Histórico de marcações",
    descricao:
      "Consulte registros anteriores e veja a linha do tempo das marcações feitas no SECP ou importadas dos relógios.",
  },
  {
    id: "espelho",
    target: "[data-tour='menu-/espelho-ponto']",
    titulo: "Espelho de ponto",
    descricao:
      "Confira a apuração mensal, marcações, situações, saldos, débitos, créditos e informações de homologação.",
  },
  {
    id: "solicitacoes",
    target: "[data-tour='menu-/solicitacoes']",
    titulo: "Solicitações de ponto",
    descricao:
      "Abra solicitações de ajuste, abono, compensação, atividade externa, viagem, capacitação e outras ocorrências.",
  },
  {
    id: "banco-horas",
    target: "[data-tour='menu-/banco-horas']",
    titulo: "Banco de horas",
    descricao:
      "Acompanhe seu saldo, vencimentos, créditos, débitos e solicitações relacionadas ao banco de horas.",
  },
  {
    id: "conteudo",
    target: "[data-tour='conteudo-principal']",
    titulo: "Área de trabalho",
    descricao:
      "O conteúdo da opção escolhida aparece nesta área. Os filtros, tabelas, cards e ações ficam organizados conforme cada funcionalidade.",
  },
  {
    id: "fim",
    target: "[data-tour='tour-secp']",
    titulo: "Passeio concluído",
    descricao:
      "Pronto. Sempre que precisar rever este guia, clique novamente no ícone da varinha mágica.",
  },
];

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function obterRetangulo(selector?: string): Rect | null {
  if (!selector || typeof document === "undefined") {
    return null;
  }

  const element = document.querySelector(selector);

  if (!element) {
    return null;
  }

  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });

  const rect = element.getBoundingClientRect();

  return {
    top: Math.max(rect.top - 8, 8),
    left: Math.max(rect.left - 8, 8),
    width: rect.width + 16,
    height: rect.height + 16,
  };
}

function proximoIndiceDisponivel(passos: TourStep[], atual: number, direcao: 1 | -1) {
  let indice = atual + direcao;

  while (indice >= 0 && indice < passos.length) {
    const passo = passos[indice];

    if (!passo.target || document.querySelector(passo.target)) {
      return indice;
    }

    indice += direcao;
  }

  return atual;
}

export function SecpTourServidor({
  onOpenChange,
}: {
  onOpenChange: (aberto: boolean) => void;
}) {
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const passoAtual = TOUR_SERVIDOR[indiceAtual] ?? TOUR_SERVIDOR[0];
  const primeiro = indiceAtual === 0;
  const ultimo = indiceAtual === TOUR_SERVIDOR.length - 1;

  const posicaoCard = useMemo(() => {
    if (!rect) {
      return "left-1/2 top-1/2 w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2";
    }

    const cardAltura = 260;
    const abaixoCabe = rect.top + rect.height + cardAltura + 24 < window.innerHeight;
    const top = abaixoCabe
      ? rect.top + rect.height + 16
      : Math.max(16, rect.top - cardAltura - 16);
    const left = Math.min(
      Math.max(16, rect.left),
      Math.max(16, window.innerWidth - 464),
    );

    return { top, left };
  }, [rect]);

  useEffect(() => {
    function atualizarRetangulo() {
      window.setTimeout(() => {
        setRect(obterRetangulo(passoAtual.target));
      }, 120);
    }

    atualizarRetangulo();
    window.addEventListener("resize", atualizarRetangulo);
    window.addEventListener("scroll", atualizarRetangulo, true);

    return () => {
      window.removeEventListener("resize", atualizarRetangulo);
      window.removeEventListener("scroll", atualizarRetangulo, true);
    };
  }, [passoAtual.target]);

  useEffect(() => {
    function tratarTecla(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }

      if (event.key === "ArrowRight") {
        setIndiceAtual((indice) => proximoIndiceDisponivel(TOUR_SERVIDOR, indice, 1));
      }

      if (event.key === "ArrowLeft") {
        setIndiceAtual((indice) => proximoIndiceDisponivel(TOUR_SERVIDOR, indice, -1));
      }
    }

    document.addEventListener("keydown", tratarTecla);

    return () => document.removeEventListener("keydown", tratarTecla);
  }, [onOpenChange]);

  function avancar() {
    if (ultimo) {
      onOpenChange(false);
      return;
    }

    setIndiceAtual((indice) => proximoIndiceDisponivel(TOUR_SERVIDOR, indice, 1));
  }

  function voltar() {
    setIndiceAtual((indice) => proximoIndiceDisponivel(TOUR_SERVIDOR, indice, -1));
  }

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]" />

      {rect && (
        <div
          className="pointer-events-none absolute rounded-xl border-2 border-white bg-white/10 shadow-[0_0_0_9999px_rgba(15,23,42,0.58),0_18px_55px_rgba(15,23,42,0.35)] ring-4 ring-[var(--secp-theme-accent)]/45 transition-all duration-200"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      )}

      <div
        className={
          typeof posicaoCard === "string"
            ? `absolute ${posicaoCard}`
            : "absolute w-[min(calc(100vw-2rem),28rem)]"
        }
        style={typeof posicaoCard === "string" ? undefined : posicaoCard}
      >
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-card text-card-foreground shadow-2xl ring-1 ring-white/70">
          <div className="border-b border-[var(--border)] bg-gradient-to-r from-secp-blue-900 via-secp-blue-800 to-secp-blue-700 px-4 py-3 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase text-white/70">
                  Tour do servidor
                </p>
                <h2 className="mt-1 text-base font-semibold">{passoAtual.titulo}</h2>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/10 transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label="Fechar tour"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            <p className="text-sm leading-6 text-muted-foreground">
              {passoAtual.descricao}
            </p>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-muted-foreground">
                {indiceAtual + 1} de {TOUR_SERVIDOR.length}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={voltar}
                  disabled={primeiro}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={avancar}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-secp-blue-900 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-secp-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {ultimo ? (
                    <>
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Concluir
                    </>
                  ) : (
                    <>
                      Avançar
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
