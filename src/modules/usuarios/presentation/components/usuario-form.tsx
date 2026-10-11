"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";

import { SearchableSelect } from "@/components/ui";
import { SwitchField } from "@/components/ui/switch";

import {
  tiposUsuario,
  type UsuarioFormState,
} from "../../application/schemas/usuario.schema";

type PerfilItem = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
};

type OrgaoItem = {
  id: string;
  sigla: string;
  nome: string;
};

type UsuarioFormProps = {
  action: (
    state: UsuarioFormState,
    formData: FormData,
  ) => Promise<UsuarioFormState>;
  perfis: PerfilItem[];
  orgaos: OrgaoItem[];
  permitirEscopoGlobal?: boolean;
  valoresIniciais?: {
    matricula?: string;
    nome?: string;
    email?: string | null;
    tipo?: string;
    ativo?: boolean;
    perfis?: string[];
    perfisEscopos?: Record<string, string>;
  };
  modo: "criar" | "editar";
};

const estadoInicial: UsuarioFormState = { sucesso: false, mensagem: null };

const rotulosTipoUsuario: Record<string, string> = {
  SERVIDOR: "Servidor",
  SISTEMA: "Sistema",
  EXTERNO: "Externo",
  PRESTADOR: "Prestador",
  ESTAGIARIO: "Estagiário",
  VOLUNTARIO: "Voluntário",
};

function obterErro(erros: Record<string, string[]> | undefined, campo: string) {
  return erros?.[campo]?.[0];
}

function Etapa({
  numero,
  titulo,
  descricao,
  children,
}: {
  numero: number;
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative pl-11">
      <span className="absolute left-0 top-0 flex size-7 items-center justify-center rounded-full bg-[var(--secp-theme-accent)] text-sm font-bold text-[var(--secp-theme-accent-contrast)]">
        {numero}
      </span>
      <span className="absolute bottom-0 left-[0.8125rem] top-8 w-px bg-border" />
      <div className="pb-8">
        <h2 className="text-lg font-semibold text-foreground">{titulo}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{descricao}</p>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

function CampoTexto({
  id,
  label,
  descricao,
  erro,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  descricao: string;
  erro?: string;
}) {
  return (
    <div>
      <div className="secp-floating-field">
        <label htmlFor={id}>{label}</label>
        <input
          {...props}
          id={id}
          name={props.name ?? id}
          placeholder=" "
          className="secp-floating-control"
        />
      </div>
      <p className="mt-1.5 px-3 text-xs leading-4 text-muted-foreground">
        {descricao}
      </p>
      {erro ? <p className="mt-1 px-3 text-xs text-red-600">{erro}</p> : null}
    </div>
  );
}

export function UsuarioForm({
  action,
  perfis,
  orgaos,
  permitirEscopoGlobal = false,
  valoresIniciais,
  modo,
}: UsuarioFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const campos = estado.campos ?? valoresIniciais;

  return (
    <form action={formAction} className="max-w-5xl">
      {estado.mensagem ? (
        <div role="alert" className="mb-6 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {estado.mensagem}
        </div>
      ) : null}

      <Etapa
        numero={1}
        titulo="Dados do usuário"
        descricao="Informe os dados usados para identificação e autenticação da conta."
      >
        <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
          <CampoTexto
            id="matricula"
            label="Matrícula/Login"
            descricao="Identificador institucional usado para acessar o SECP."
            defaultValue={campos?.matricula ?? ""}
            erro={obterErro(estado.erros, "matricula")}
            required
          />

          <div>
            <div className="secp-floating-field" data-filled="true">
              <label htmlFor="tipo">Tipo de usuário</label>
              <SearchableSelect
                id="tipo"
                name="tipo"
                defaultValue={campos?.tipo ?? "SERVIDOR"}
                placeholder="Selecione o tipo"
                searchPlaceholder="Pesquisar tipo..."
                emptyMessage="Nenhum tipo encontrado."
                options={tiposUsuario.map((tipo) => ({
                  value: tipo,
                  label: rotulosTipoUsuario[tipo] ?? tipo,
                  searchText: tipo,
                }))}
                required
              />
            </div>
            <p className="mt-1.5 px-3 text-xs leading-4 text-muted-foreground">
              Define a natureza do vínculo da conta com a instituição.
            </p>
            {obterErro(estado.erros, "tipo") ? (
              <p className="mt-1 px-3 text-xs text-red-600">{obterErro(estado.erros, "tipo")}</p>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <CampoTexto
              id="nome"
              label="Nome completo"
              descricao="Nome exibido em telas, relatórios e registros de auditoria."
              defaultValue={campos?.nome ?? ""}
              erro={obterErro(estado.erros, "nome")}
              required
            />
          </div>

          <CampoTexto
            id="email"
            label="E-mail"
            descricao="Endereço usado para comunicações e recuperação de acesso."
            type="email"
            defaultValue={campos?.email ?? ""}
            erro={obterErro(estado.erros, "email")}
          />

          <CampoTexto
            id="senha"
            label={modo === "criar" ? "Senha local" : "Nova senha local"}
            descricao={modo === "criar" ? "Opcional, exceto para contas com autenticação local." : "Preencha somente para alterar a senha atual."}
            type="password"
            erro={obterErro(estado.erros, "senha")}
          />

          <div className="flex items-center justify-between gap-4 rounded border bg-muted/40 p-4 md:col-span-2">
            <div>
              <label htmlFor="usuario-ativo" className="text-sm font-semibold">Usuário ativo</label>
              <p className="mt-1 text-xs leading-4 text-muted-foreground">
                Permite que a conta autentique e utilize as funções autorizadas.
              </p>
            </div>
            <SwitchField
              id="usuario-ativo"
              name="ativo"
              defaultChecked={campos?.ativo ?? true}
            />
          </div>
        </div>
      </Etapa>

      <Etapa
        numero={2}
        titulo="Perfis e escopos de acesso"
        descricao="Escolha as atribuições do usuário e a seccional em que cada perfil será válido."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {perfis.map((perfil) => (
            <label key={perfil.id} className="flex cursor-pointer gap-3 rounded border bg-card p-4 text-sm transition hover:border-[var(--secp-theme-accent)]">
              <input
                type="checkbox"
                name="perfis"
                value={perfil.id}
                defaultChecked={(campos?.perfis ?? []).includes(perfil.id)}
                className="mt-1 size-4 accent-[var(--secp-theme-accent)]"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{perfil.nome}</span>
                <code className="mt-1 block text-xs text-muted-foreground">{perfil.codigo}</code>
                {perfil.descricao ? (
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{perfil.descricao}</span>
                ) : null}
                <span className="mt-3 block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Escopo de atuação</span>
                  <SearchableSelect
                    id={`perfil-orgao-${perfil.id}`}
                    name={`perfilOrgao:${perfil.id}`}
                    defaultValue={campos?.perfisEscopos?.[perfil.id] ?? ""}
                    placeholder={perfil.codigo === "MASTER" && permitirEscopoGlobal ? "Global - todas as seccionais" : "Selecione a seccional"}
                    searchPlaceholder="Pesquisar seccional..."
                    emptyMessage="Nenhuma seccional encontrada."
                    options={orgaos.map((orgao) => ({
                      value: orgao.id,
                      label: `${orgao.sigla} - ${orgao.nome}`,
                      searchText: `${orgao.sigla} ${orgao.nome}`,
                    }))}
                  />
                </span>
              </span>
            </label>
          ))}
        </div>
      </Etapa>

      <div className="flex justify-end gap-3 border-t pt-5">
        <button
          type="submit"
          disabled={pendente}
          className="secp-theme-primary-action inline-flex items-center justify-center gap-2 rounded px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendente ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          {modo === "criar" ? "Criar usuário" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
