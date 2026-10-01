"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui";
import {
  salvarSuporteLoginConfigAction,
  type SuporteLoginConfigState,
} from "../../application/actions/salvar-suporte-login-config.action";

type OrgaoOpcao = {
  id: string;
  sigla: string;
  nome: string;
};

type ConfiguracaoSuporte = {
  id: string;
  orgaoId: string | null;
  orgaoSigla: string;
  orgaoNome: string;
  url: string;
  ativo: boolean;
  atualizadoEm: Date;
};

const estadoInicial: SuporteLoginConfigState = {
  sucesso: false,
  mensagem: null,
};

export function SuporteLoginConfigForm({
  orgaos,
  configuracoes,
}: {
  orgaos: OrgaoOpcao[];
  configuracoes: ConfiguracaoSuporte[];
}) {
  const [estado, action, pendente] = useActionState(
    salvarSuporteLoginConfigAction,
    estadoInicial,
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
      <form action={action} className="space-y-4 rounded-lg border bg-card p-5">
        <div>
          <label htmlFor="orgaoId" className="text-sm font-semibold">
            Abrangência
          </label>
          <select
            id="orgaoId"
            name="orgaoId"
            className="mt-2 h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          >
            <option value="">Global</option>
            {orgaos.map((orgao) => (
              <option key={orgao.id} value={orgao.id}>
                {orgao.sigla} - {orgao.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="url" className="text-sm font-semibold">
            URL da ferramenta de suporte
          </label>
          <input
            id="url"
            name="url"
            type="url"
            required
            placeholder="https://..."
            className="mt-2 h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked
            className="size-4 rounded border-slate-300 accent-blue-900"
          />
          Ativo
        </label>

        {estado.mensagem ? (
          <p
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${
              estado.sucesso
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {estado.mensagem}
          </p>
        ) : null}

        <Button
          type="submit"
          loading={pendente}
          leftIcon={<Save className="size-4" aria-hidden="true" />}
        >
          Salvar URL
        </Button>
      </form>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-base font-bold">URLs cadastradas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--muted)] text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Abrangência</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Atualização</th>
              </tr>
            </thead>
            <tbody>
              {configuracoes.map((configuracao) => (
                <tr key={configuracao.id} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{configuracao.orgaoSigla}</p>
                    <p className="text-xs text-muted-foreground">
                      {configuracao.orgaoNome}
                    </p>
                  </td>
                  <td className="max-w-md truncate px-4 py-3">
                    <a
                      href={configuracao.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-800 hover:underline"
                    >
                      {configuracao.url}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {configuracao.ativo ? "Ativa" : "Inativa"}
                  </td>
                  <td className="px-4 py-3">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(configuracao.atualizadoEm))}
                  </td>
                </tr>
              ))}
              {configuracoes.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Nenhuma URL de suporte cadastrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
