"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, UserPlus, UsersRound } from "lucide-react";

import { Button, Modal } from "@/components/ui";
import {
  atribuirPessoaPerfilAction,
  type AtribuirPessoaPerfilState,
} from "../../application/actions/atribuir-pessoa-perfil.action";

type PessoaOption = {
  usuarioId: string;
  matricula: string;
  nome: string;
  orgaoSigla: string;
  lotacao?: string | null;
};

const estadoInicial: AtribuirPessoaPerfilState = {
  sucesso: false,
  mensagem: null,
};

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function AtribuirPessoaPerfilModal({
  perfilId,
  perfilNome,
  pessoas,
}: {
  perfilId: string;
  perfilNome: string;
  pessoas: PessoaOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [estado, formAction, pendente] = useActionState(
    atribuirPessoaPerfilAction,
    estadoInicial,
  );

  const pessoasFiltradas = useMemo(() => {
    const termo = normalizarBusca(busca.trim());

    if (!termo) {
      return pessoas.slice(0, 80);
    }

    return pessoas
      .filter((pessoa) =>
        normalizarBusca(
          `${pessoa.matricula} ${pessoa.nome} ${pessoa.orgaoSigla} ${
            pessoa.lotacao ?? ""
          }`,
        ).includes(termo),
      )
      .slice(0, 80);
  }, [busca, pessoas]);

  useEffect(() => {
    if (estado.sucesso) {
      setSelecionados([]);
      router.refresh();
    }
  }, [estado.sucesso, router]);

  function alternarUsuario(usuarioId: string) {
    setSelecionados((atuais) =>
      atuais.includes(usuarioId)
        ? atuais.filter((id) => id !== usuarioId)
        : [...atuais, usuarioId],
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        leftIcon={<UsersRound className="size-4" aria-hidden="true" />}
        onClick={() => setOpen(true)}
      >
        Atribuir em lote
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Atribuir perfil em lote"
        description={`Selecione as pessoas que receberao o perfil ${perfilNome}.`}
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="perfilId" value={perfilId} />
          {selecionados.map((usuarioId) => (
            <input
              key={usuarioId}
              type="hidden"
              name="usuarioIds"
              value={usuarioId}
            />
          ))}

          {estado.mensagem && (
            <div
              role={estado.sucesso ? "status" : "alert"}
              className={`rounded-lg border p-3 text-sm ${
                estado.sucesso
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              }`}
            >
              {estado.mensagem}
            </div>
          )}

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar por nome, matricula, lotacao ou seccional..."
              className="h-10 w-full rounded-md border bg-[var(--card)] pl-9 pr-3 text-sm outline-none focus:border-blue-800"
            />
          </div>

          <div className="rounded-md border">
            <div className="flex items-center justify-between border-b px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)]">
              <span>{selecionados.length} selecionado(s)</span>
              <span>{pessoasFiltradas.length} exibido(s)</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {pessoasFiltradas.map((pessoa) => (
                <label
                  key={pessoa.usuarioId}
                  className="flex cursor-pointer items-start gap-3 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-[var(--muted)]"
                >
                  <input
                    type="checkbox"
                    checked={selecionados.includes(pessoa.usuarioId)}
                    onChange={() => alternarUsuario(pessoa.usuarioId)}
                    className="mt-1 size-4 rounded border-slate-300"
                  />
                  <span>
                    <span className="block font-semibold">
                      {pessoa.matricula} - {pessoa.nome}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {pessoa.orgaoSigla}
                      {pessoa.lotacao ? ` - ${pessoa.lotacao}` : ""}
                    </span>
                  </span>
                </label>
              ))}

              {pessoasFiltradas.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-[var(--muted-foreground)]">
                  Nenhuma pessoa encontrada no escopo do perfil ativo.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pendente || selecionados.length === 0}
              leftIcon={
                pendente ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <UserPlus className="size-4" aria-hidden="true" />
                )
              }
            >
              Atribuir
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
