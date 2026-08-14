"use client";

import { useMemo, useState } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";

import { Button, Modal } from "@/components/ui";

type IdentificadoresPontoFieldProps = {
  valorInicial?: string[];
  matricula?: string;
  erro?: string;
};

function normalizar(valor: string) {
  return valor.trim().toUpperCase();
}

export function IdentificadoresPontoField({
  valorInicial,
  matricula,
  erro,
}: IdentificadoresPontoFieldProps) {
  const iniciais = useMemo(() => {
    const valores = [
      ...(valorInicial?.length ? valorInicial : []),
      ...(matricula ? [matricula] : []),
    ];
    const vistos = new Set<string>();

    return valores
      .map((valor) => valor.trim())
      .filter(Boolean)
      .filter((valor) => {
        const chave = normalizar(valor);
        if (vistos.has(chave)) return false;
        vistos.add(chave);
        return true;
      });
  }, [matricula, valorInicial]);
  const [identificadores, setIdentificadores] = useState(iniciais);
  const [valor, setValor] = useState("");
  const [indiceEdicao, setIndiceEdicao] = useState<number | null>(null);
  const [indiceExclusao, setIndiceExclusao] = useState<number | null>(null);
  const valorTratado = valor.trim();

  function limparEdicao() {
    setValor("");
    setIndiceEdicao(null);
  }

  function adicionarOuSalvar() {
    if (!valorTratado) {
      return;
    }

    const chave = normalizar(valorTratado);
    const jaExiste = identificadores.some(
      (item, indice) => normalizar(item) === chave && indice !== indiceEdicao,
    );

    if (jaExiste) {
      return;
    }

    if (indiceEdicao === null) {
      setIdentificadores((atuais) => [...atuais, valorTratado]);
    } else {
      setIdentificadores((atuais) =>
        atuais.map((item, indice) =>
          indice === indiceEdicao ? valorTratado : item,
        ),
      );
    }

    limparEdicao();
  }

  function editar(indice: number) {
    setIndiceEdicao(indice);
    setValor(identificadores[indice] ?? "");
  }

  function confirmarExclusao() {
    if (indiceExclusao === null) {
      return;
    }

    setIdentificadores((atuais) =>
      atuais.filter((_, indice) => indice !== indiceExclusao),
    );
    setIndiceExclusao(null);
  }

  return (
    <div className="space-y-3 md:col-span-2">
      {identificadores.map((identificador) => (
        <input
          key={normalizar(identificador)}
          type="hidden"
          name="identificadoresPonto"
          value={identificador}
        />
      ))}

      <div className="space-y-2">
        <label htmlFor="identificadorPonto" className="text-sm font-semibold">
          Identificador de ponto
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="identificadorPonto"
            type="text"
            value={valor}
            onChange={(event) => setValor(event.target.value)}
            placeholder={matricula || "Identificador enviado pelo equipamento"}
            className="h-11 min-w-0 flex-1 rounded-md border bg-[var(--card)] px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
          <Button
            type="button"
            onClick={adicionarOuSalvar}
            leftIcon={
              indiceEdicao === null ? (
                <Plus className="size-4" aria-hidden="true" />
              ) : (
                <Edit2 className="size-4" aria-hidden="true" />
              )
            }
          >
            {indiceEdicao === null ? "Adicionar" : "Salvar"}
          </Button>
          {indiceEdicao !== null && (
            <Button type="button" variant="outline" onClick={limparEdicao}>
              Cancelar
            </Button>
          )}
        </div>
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">
          Use este campo para associar marcacoes recebidas de equipamentos
          biometricos a esta pessoa.
        </p>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </div>

      <div className="rounded-lg border">
        {identificadores.length > 0 ? (
          <ul className="divide-y">
            {identificadores.map((identificador, indice) => (
              <li
                key={`${normalizar(identificador)}:${indice}`}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-mono text-sm font-semibold">
                    {identificador}
                  </p>
                  {indice === 0 && (
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Principal
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editar(indice)}
                    className="inline-flex size-9 items-center justify-center rounded-md border hover:bg-[var(--muted)]"
                    aria-label={`Editar identificador ${identificador}`}
                    title="Editar"
                  >
                    <Edit2 className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndiceExclusao(indice)}
                    className="inline-flex size-9 items-center justify-center rounded-md border text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
                    aria-label={`Excluir identificador ${identificador}`}
                    title="Excluir"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5 text-sm text-[var(--muted-foreground)]">
            Nenhum identificador adicionado.
          </div>
        )}
      </div>

      <Modal
        open={indiceExclusao !== null}
        onOpenChange={(open) => {
          if (!open) setIndiceExclusao(null);
        }}
        title="Excluir identificador?"
        description="Esta acao remove o identificador do cadastro da pessoa."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIndiceExclusao(null)}
            >
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={confirmarExclusao}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="font-mono text-sm font-semibold">
          {indiceExclusao !== null
            ? (identificadores[indiceExclusao] ?? "")
            : ""}
        </p>
      </Modal>
    </div>
  );
}
