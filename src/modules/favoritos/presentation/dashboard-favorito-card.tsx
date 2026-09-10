"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, Modal } from "@/components/ui";
import { cn } from "@/components/ui/utils";
import type { FavoritoUsuarioPerfilDto } from "@/modules/favoritos/application/favoritos-usuario-perfil.service";
import { useFavoritosPerfil } from "./favoritos-provider";

const cores = [
  {
    barra: "bg-[#004b93]",
    icone: "bg-[#004b93]/10 text-[#004b93] ring-[#004b93]/15",
    fundo: "from-[#004b93]/8 via-transparent to-transparent",
    texto: "text-[#004b93]",
    hover: "hover:border-[#004b93]/50",
  },
  {
    barra: "bg-[#00843d]",
    icone: "bg-[#00843d]/10 text-[#006b31] ring-[#00843d]/15",
    fundo: "from-[#00843d]/8 via-transparent to-transparent",
    texto: "text-[#006b31]",
    hover: "hover:border-[#00843d]/50",
  },
  {
    barra: "bg-[#b78b20]",
    icone: "bg-[#b78b20]/10 text-[#8a6616] ring-[#b78b20]/15",
    fundo: "from-[#b78b20]/10 via-transparent to-transparent",
    texto: "text-[#8a6616]",
    hover: "hover:border-[#b78b20]/50",
  },
  {
    barra: "bg-[#5f6b7a]",
    icone: "bg-[#5f6b7a]/10 text-[#475569] ring-[#5f6b7a]/15",
    fundo: "from-[#5f6b7a]/10 via-transparent to-transparent",
    texto: "text-[#475569]",
    hover: "hover:border-[#5f6b7a]/50",
  },
];

export function DashboardFavoritoCard({
  favorito,
  indice,
}: {
  favorito: FavoritoUsuarioPerfilDto;
  indice: number;
}) {
  const router = useRouter();
  const { desfavoritar } = useFavoritosPerfil();
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const [pending, startTransition] = useTransition();
  const tema = cores[indice % cores.length];

  function acessar() {
    router.push(favorito.href);
  }

  function confirmarRemocao() {
    startTransition(() => {
      void desfavoritar(favorito.itemCatalogo).then(() => {
        setConfirmacaoAberta(false);
        router.refresh();
      }).catch(() => undefined);
    });
  }

  return (
    <>
      <Card
        role="link"
        tabIndex={0}
        onClick={acessar}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            acessar();
          }
        }}
        className={cn(
          "group relative flex min-h-56 cursor-pointer overflow-hidden p-0 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg",
          "bg-gradient-to-br",
          tema.fundo,
          tema.hover,
        )}
      >
        <span className={cn("absolute inset-x-0 top-0 h-1", tema.barra)} />
        <div className="flex min-w-0 flex-1 flex-col p-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase text-[var(--muted-foreground)]">
                Favorito
              </p>
              <h2 className="mt-2 min-w-0 text-sm font-black leading-5 text-[var(--card-foreground)]">
                {favorito.titulo}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  "inline-flex size-10 items-center justify-center rounded-lg ring-1",
                  tema.icone,
                )}
              >
                <Star className="size-5 fill-current" aria-hidden="true" />
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmacaoAberta(true);
                }}
                aria-label={`Remover ${favorito.titulo} dos favoritos`}
                title="Remover dos favoritos"
                className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card/90 text-[var(--muted-foreground)] shadow-sm transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <p className="mt-5 line-clamp-4 text-xs leading-5 text-[var(--muted-foreground)]">
            {favorito.descricao}
          </p>

          <span
            className={cn(
              "mt-auto flex items-center justify-between border-t border-border/70 pt-4 text-xs font-black uppercase",
              tema.texto,
            )}
          >
            Acessar
            <ArrowRight
              className="size-4 transition group-hover:translate-x-1"
              aria-hidden="true"
            />
          </span>
        </div>
      </Card>

      <Modal
        open={confirmacaoAberta}
        onOpenChange={setConfirmacaoAberta}
        title="Remover favorito"
        description={`Deseja remover "${favorito.titulo}" dos favoritos deste perfil?`}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmacaoAberta(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={pending}
              onClick={confirmarRemocao}
            >
              Remover
            </Button>
          </>
        }
      >
        <div className="rounded-lg border border-[#b78b20]/30 bg-[#b78b20]/10 p-4 text-sm leading-6 text-[var(--card-foreground)]">
          O card sera removido apenas para o usuario e perfil ativo. A
          funcionalidade continua disponivel no menu se o perfil possuir acesso.
        </div>
      </Modal>
    </>
  );
}
