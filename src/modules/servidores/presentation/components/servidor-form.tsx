"use client";

import Image from "next/image";
import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import { SearchableSelect } from "@/components/ui";
import {
  tiposVinculoServidor,
  type ServidorFormState,
} from "../../application/schemas/servidor.schema";

type OrgaoItem = {
  id: string;
  sigla: string;
  nome: string;
};

type ServidorFormProps = {
  action: (
    state: ServidorFormState,
    formData: FormData,
  ) => Promise<ServidorFormState>;
  orgaos: OrgaoItem[];
  valoresIniciais?: {
    orgaoId?: string;
    matricula?: string;
    cpf: string;
    nome?: string;
    email?: string | null;
    nomeFuncional?: string | null;
    tipoUsuario?: string;
    vinculo?: string;
    cargoDescricao?: string | null;
    funcaoDescricao?: string | null;
    descricaoProvimentoSarh?: string | null;
    descricaoSituacaoSarh?: string | null;
    sinalizacaoForaExpediente?: string | null;
    ativo?: boolean;
  };
  modo: "criar" | "editar";
};

const estadoInicial: ServidorFormState = {
  sucesso: false,
  mensagem: null,
};

const rotulosVinculo: Record<string, string> = {
  EFETIVO: "Efetivo",
  CEDIDO: "Cedido",
  REQUISITADO: "Requisitado",
  REDISTRIBUIDO: "RedistribuÃ­do",
  REMOVIDO: "Removido",
  EXERCICIO_PROVISORIO: "ExercÃ­cio provisÃ³rio",
};

function obterErro(erros: Record<string, string[]> | undefined, campo: string) {
  return erros?.[campo]?.[0];
}

export function ServidorForm({
  action,
  orgaos,
  valoresIniciais,
  modo,
}: ServidorFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);

  const campos = {
    ...valoresIniciais,
    ...estado.campos,
  };

  return (
    <form action={formAction} className="space-y-6">
      <input
        type="hidden"
        name="tipoUsuario"
        value={campos.tipoUsuario ?? "SERVIDOR"}
      />

      {estado.mensagem && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {estado.mensagem}
        </div>
      )}

      <section className="rounded-xl border bg-(--card) p-6 text-(--card-foreground) shadow-sm">
        <h2 className="text-lg font-bold">Dados funcionais</h2>

        {campos?.cpf && (
          <div className="mt-5 flex items-center gap-4 rounded-lg border bg-[var(--muted)] p-4">
            <Image
              src={`/api/servidores/foto/${campos.cpf}`}
              alt=""
              width={76}
              height={76}
              unoptimized
              className="size-[4.75rem] rounded-full border-4 border-white bg-slate-100 object-cover shadow-sm ring-2 ring-blue-100 dark:border-slate-950 dark:bg-slate-800 dark:ring-blue-900/60"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {campos.nomeFuncional ?? campos.nome ?? "Servidor"}
              </p>
              <p className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">
                CPF {campos.cpf}
              </p>
              {campos.cargoDescricao && (
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {campos.cargoDescricao}
                </p>
              )}
              {campos.funcaoDescricao && (
                <p className="mt-1 text-xs font-semibold text-blue-900 dark:text-blue-300">
                  {campos.funcaoDescricao}
                </p>
              )}
              {(campos.descricaoProvimentoSarh ||
                campos.descricaoSituacaoSarh) && (
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {[
                    campos.descricaoProvimentoSarh,
                    campos.descricaoSituacaoSarh,
                  ]
                    .filter(Boolean)
                    .join(" Â· ")}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="orgaoId" className="text-sm font-semibold">
              Ã“rgÃ£o
            </label>

            <SearchableSelect
              id="orgaoId"
              name="orgaoId"
              defaultValue={campos?.orgaoId ?? ""}
              placeholder="Selecione o órgão"
              searchPlaceholder="Pesquisar órgão..."
              emptyMessage="Nenhum órgão encontrado."
              options={orgaos.map((orgao) => ({
                value: orgao.id,
                label: `${orgao.sigla} - ${orgao.nome}`,
                searchText: `${orgao.sigla} ${orgao.nome}`,
              }))}
              required
            />

            {obterErro(estado.erros, "orgaoId") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "orgaoId")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="matricula" className="text-sm font-semibold">
              MatrÃ­cula
            </label>

            <input
              id="matricula"
              name="matricula"
              type="text"
              defaultValue={campos?.matricula ?? ""}
              placeholder="Ex.: AM12345"
              className="h-11 w-full rounded-md border bg-(--card) px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />

            {obterErro(estado.erros, "matricula") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "matricula")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="cpf" className="text-sm font-semibold">
              CPF
            </label>

            <input
              id="cpf"
              name="cpf"
              defaultValue={campos?.cpf ?? ""}
              inputMode="numeric"
              maxLength={14}
              placeholder="000.000.000-00"
              className="h-10 w-full rounded-md border bg-(--card) px-3 text-sm"
              required
            />

            {obterErro(estado.erros, "cpf") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "cpf")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="nome" className="text-sm font-semibold">
              Nome
            </label>

            <input
              id="nome"
              name="nome"
              type="text"
              defaultValue={campos?.nome ?? ""}
              placeholder="Nome completo"
              className="h-11 w-full rounded-md border bg-(--card) px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />

            {obterErro(estado.erros, "nome") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "nome")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-semibold">
              Ã‰-mail
            </label>

            <input
              id="email"
              name="email"
              type="email"
              defaultValue={campos?.email ?? ""}
              placeholder="nome@trf1.jus.br"
              className="h-11 w-full rounded-md border bg-(--card) px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />

            {obterErro(estado.erros, "email") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "email")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="nomeFuncional" className="text-sm font-semibold">
              Nome funcional
            </label>

            <input
              id="nomeFuncional"
              name="nomeFuncional"
              type="text"
              defaultValue={campos?.nomeFuncional ?? ""}
              placeholder="Opcional"
              className="h-11 w-full rounded-md border bg-(--card) px-3 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />

            {obterErro(estado.erros, "nomeFuncional") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "nomeFuncional")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="vinculo" className="text-sm font-semibold">
              Tipo de vÃ­nculo
            </label>

            <SearchableSelect
              id="vinculo"
              name="vinculo"
              defaultValue={campos?.vinculo ?? "EFETIVO"}
              placeholder="Selecione o vínculo"
              searchPlaceholder="Pesquisar vínculo..."
              emptyMessage="Nenhum vínculo encontrado."
              options={tiposVinculoServidor.map((tipo) => ({
                value: tipo,
                label: rotulosVinculo[tipo] ?? tipo,
                searchText: tipo,
              }))}
              required
            />

            {obterErro(estado.erros, "vinculo") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "vinculo")}
              </p>
            )}
          </div>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
            <input
              type="checkbox"
              name="ativo"
              defaultChecked={campos?.ativo ?? true}
              className="size-4 rounded border-slate-300"
            />

            <span>
              <span className="block font-semibold">Servidor ativo</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Servidores inativos nÃ£o devem registrar frequÃªncia ordinÃ¡ria.
              </span>
            </span>
          </label>

          <div className="space-y-2 md:col-span-2">
            <label
              htmlFor="sinalizacaoForaExpediente"
              className="text-sm font-semibold"
            >
              MarcaÃ§Ã£o fora do expediente
            </label>

            <SearchableSelect
              id="sinalizacaoForaExpediente"
              name="sinalizacaoForaExpediente"
              defaultValue={campos?.sinalizacaoForaExpediente ?? "PADRAO"}
              placeholder="Selecione a regra de sinalização"
              searchPlaceholder="Pesquisar regra..."
              emptyMessage="Nenhuma regra encontrada."
              options={[
                { value: "PADRAO", label: "Seguir padrão do órgão" },
                { value: "NAO_SINALIZAR", label: "Não sinalizar" },
                { value: "SINALIZAR", label: "Sinalizar como inconsistência" },
              ]}
            />

            <p className="text-xs leading-5 text-[var(--muted-foreground)]">
              Use a opÃ§Ã£o individual apenas para casos excepcionais; o padrÃ£o do
              SECP Ã© nÃ£o sinalizar marcaÃ§Ãµes fora do expediente.
            </p>

            {obterErro(estado.erros, "sinalizacaoForaExpediente") && (
              <p className="text-sm text-red-600">
                {obterErro(estado.erros, "sinalizacaoForaExpediente")}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}

          {modo === "criar" ? "Criar servidor" : "Salvar alteraÃ§Ãµes"}
        </button>
      </div>
    </form>
  );
}

