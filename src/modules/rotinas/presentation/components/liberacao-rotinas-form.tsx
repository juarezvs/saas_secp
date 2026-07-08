"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RotinaComPermissoes } from "../../application/services/liberacao-rotinas.service";

type LiberacaoRotinasFormProps = {
  rotinas: RotinaComPermissoes[];
  action: (formData: FormData) => void | Promise<void>;
};

function formatarRecurso(recurso: string) {
  return recurso
    .split("-")
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      loading={pending}
      leftIcon={<Save className="size-4" aria-hidden="true" />}
    >
      Salvar liberações
    </Button>
  );
}

export function LiberacaoRotinasForm({
  rotinas,
  action,
}: LiberacaoRotinasFormProps) {
  const [liberacoes, setLiberacoes] = useState<Record<string, boolean>>(() => {
    const estado: Record<string, boolean> = {};

    for (const rotina of rotinas) {
      estado[`rotina:${rotina.recurso}`] = rotina.liberada;

      for (const permissao of rotina.permissoes) {
        estado[`permissao:${permissao.codigo}`] = permissao.liberada;
      }
    }

    return estado;
  });
  const totalLiberado = useMemo(
    () =>
      rotinas.reduce(
        (total, rotina) =>
          total +
          rotina.permissoes.filter(
            (permissao) => liberacoes[`permissao:${permissao.codigo}`],
          ).length,
        0,
      ),
    [liberacoes, rotinas],
  );
  const totalPermissoes = rotinas.reduce(
    (total, rotina) => total + rotina.permissoes.length,
    0,
  );

  function alternarRotina(recurso: string, valor: boolean) {
    const rotina = rotinas.find((item) => item.recurso === recurso);

    if (!rotina) {
      return;
    }

    setLiberacoes((estadoAtual) => {
      const proximo = {
        ...estadoAtual,
        [`rotina:${recurso}`]: valor,
      };

      for (const permissao of rotina.permissoes) {
        proximo[`permissao:${permissao.codigo}`] = valor;
      }

      return proximo;
    });
  }

  function alternarPermissao(
    recurso: string,
    permissaoCodigo: string,
    valor: boolean,
  ) {
    const rotina = rotinas.find((item) => item.recurso === recurso);

    setLiberacoes((estadoAtual) => {
      const proximo = {
        ...estadoAtual,
        [`permissao:${permissaoCodigo}`]: valor,
      };

      if (rotina) {
        proximo[`rotina:${recurso}`] = rotina.permissoes.every((permissao) =>
          permissao.codigo === permissaoCodigo
            ? valor
            : estadoAtual[`permissao:${permissao.codigo}`],
        );
      }

      return proximo;
    });
  }

  return (
    <form action={action} className="space-y-5">
      {Object.entries(liberacoes).map(([chave, valor]) => (
        <input
          key={chave}
          type="hidden"
          name={chave}
          value={valor ? "true" : "false"}
        />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {totalLiberado} de {totalPermissoes} permissões liberadas
          </p>
          <p className="text-xs text-muted-foreground">
            As permissões desmarcadas deixam de aparecer e de autorizar acesso.
          </p>
        </div>
        <SubmitButton />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {rotinas.map((rotina) => {
          const totalRotina = rotina.permissoes.length;
          const liberadasRotina = rotina.permissoes.filter(
            (permissao) => liberacoes[`permissao:${permissao.codigo}`],
          ).length;
          const rotinaLiberada = liberadasRotina === totalRotina;
          const rotinaParcial =
            liberadasRotina > 0 && liberadasRotina < totalRotina;

          return (
            <section
              key={rotina.recurso}
              className="rounded-md border bg-card p-4 text-card-foreground shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
                <label className="flex min-w-0 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={rotinaLiberada}
                    onChange={(event) =>
                      alternarRotina(rotina.recurso, event.target.checked)
                    }
                    className="mt-1 size-4 rounded border-slate-300"
                  />
                  <span className="min-w-0">
                    <span className="block font-bold">
                      {formatarRecurso(rotina.recurso)}
                    </span>
                    <code className="mt-1 block text-xs text-muted-foreground">
                      {rotina.recurso}
                    </code>
                  </span>
                </label>

                <Badge variant={rotinaLiberada ? "homologado" : "bloqueado"}>
                  {rotinaParcial
                    ? `${liberadasRotina}/${totalRotina}`
                    : rotinaLiberada
                      ? "Liberada"
                      : "Bloqueada"}
                </Badge>
              </div>

              <div className="mt-3 grid gap-2">
                {rotina.permissoes.map((permissao) => {
                  const liberada =
                    liberacoes[`permissao:${permissao.codigo}`] ?? true;

                  return (
                    <label
                      key={permissao.codigo}
                      className="flex cursor-pointer gap-3 rounded-md border bg-muted/60 p-3 text-sm transition hover:border-blue-300"
                    >
                      <input
                        type="checkbox"
                        checked={liberada}
                        onChange={(event) =>
                          alternarPermissao(
                            rotina.recurso,
                            permissao.codigo,
                            event.target.checked,
                          )
                        }
                        className="mt-1 size-4 rounded border-slate-300"
                      />

                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2 font-semibold">
                          {permissao.acao}:{permissao.escopo}
                          {liberada && (
                            <Check
                              className="size-4 text-secp-green-700"
                              aria-hidden="true"
                            />
                          )}
                        </span>

                        <code className="mt-1 block break-words text-xs text-muted-foreground">
                          {permissao.codigo}
                        </code>

                        {permissao.descricao && (
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {permissao.descricao}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </form>
  );
}
