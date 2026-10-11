"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Power, PowerOff, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function DesvincularPerfilUsuarioButton({
  action,
  alterarStatusAction,
  perfilNome,
  ativo,
}: {
  action: () => void | Promise<void>;
  alterarStatusAction: () => void | Promise<void>;
  perfilNome: string;
  ativo: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();

  function executar(acao: () => void | Promise<void>) {
    iniciarTransicao(async () => {
      await acao();
      router.refresh();
    });
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Ações do perfil ${perfilNome}`}
          title="Mais ações"
          disabled={pendente}
          className="grid size-8 place-items-center rounded border border-border bg-card text-muted-foreground transition hover:border-[var(--secp-theme-accent)] hover:text-[var(--secp-theme-accent)]"
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="left"
          align="start"
          sideOffset={6}
          className="z-[100] min-w-44 rounded border border-border bg-card p-1 text-card-foreground shadow-lg"
        >
          <DropdownMenu.Item
            disabled={pendente}
            onSelect={() => executar(alterarStatusAction)}
            className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-left text-sm outline-none transition hover:bg-muted focus:bg-muted data-[disabled]:cursor-wait data-[disabled]:opacity-50"
          >
            {ativo ? (
              <PowerOff className="size-4" aria-hidden="true" />
            ) : (
              <Power className="size-4" aria-hidden="true" />
            )}
            {ativo ? "Inativar" : "Ativar"}
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            disabled={pendente}
            onSelect={(event) => {
              if (
                !window.confirm(
                  `Desvincular o perfil "${perfilNome}" deste usuário?`,
                )
              ) {
                event.preventDefault();
                return;
              }
              executar(action);
            }}
            className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-left text-sm text-red-700 outline-none transition hover:bg-red-50 focus:bg-red-50 data-[disabled]:cursor-wait data-[disabled]:opacity-50 dark:text-red-300 dark:hover:bg-red-950 dark:focus:bg-red-950"
          >
            <Unlink className="size-4" aria-hidden="true" />
            Desvincular
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
