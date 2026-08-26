"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

import { Button, Modal, SearchableSelect } from "@/components/ui";
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
  const [estado, formAction, pendente] = useActionState(
    atribuirPessoaPerfilAction,
    estadoInicial,
  );

  useEffect(() => {
    if (estado.sucesso) {
      router.refresh();
    }
  }, [estado.sucesso, router]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        leftIcon={<UserPlus className="size-4" aria-hidden="true" />}
        onClick={() => setOpen(true)}
      >
        Atribuir à pessoa
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Atribuir à pessoa"
        description={`Selecione a pessoa que receberá o perfil ${perfilNome}.`}
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="perfilId" value={perfilId} />

          {estado.mensagem && !estado.sucesso && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            >
              {estado.mensagem}
            </div>
          )}

          {estado.mensagem && estado.sucesso && (
            <div
              role="status"
              className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
            >
              {estado.mensagem}
            </div>
          )}

          <SearchableSelect
            id="atribuir-perfil-pessoa"
            name="usuarioId"
            defaultValue={estado.campos?.usuarioId ?? ""}
            placeholder="Selecione a pessoa"
            searchPlaceholder="Pesquisar por nome, matrícula, lotação ou seccional..."
            emptyMessage="Nenhuma pessoa encontrada no escopo do perfil ativo."
            options={pessoas.map((pessoa) => ({
              value: pessoa.usuarioId,
              label: `${pessoa.matricula} - ${pessoa.nome} (${pessoa.orgaoSigla})`,
              searchText: `${pessoa.matricula} ${pessoa.nome} ${pessoa.orgaoSigla} ${pessoa.lotacao ?? ""}`,
            }))}
            required
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pendente || pessoas.length === 0}
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
