"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, FileText, Search } from "lucide-react";

type OrgaoOption = {
  id: string;
  sigla: string;
};

type SelectOption = {
  value: string;
  label: string;
};

export function ServidoresListagemControles({
  orgaos,
  exportCsvHref,
  exportPdfHref,
}: {
  orgaos: OrgaoOption[];
  exportCsvHref: string;
  exportPdfHref: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const paramsAtuais = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  const aplicarParametro = useCallback(
    (nome: string, valor: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const valorNormalizado = valor.trim();

      if (valorNormalizado) {
        params.set(nome, valorNormalizado);
      } else {
        params.delete(nome);
      }

      params.set("pagina", "1");

      const queryString = params.toString();
      const destino = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        router.push(destino);
      });
    },
    [pathname, router, searchParams],
  );

  const opcoesOrgaos = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Todos" },
      ...orgaos.map((orgao) => ({ value: orgao.id, label: orgao.sigla })),
    ],
    [orgaos],
  );

  const busca = paramsAtuais.get("busca") ?? "";
  const matricula = paramsAtuais.get("matricula") ?? "";
  const cpf = paramsAtuais.get("cpf") ?? "";
  const nome = paramsAtuais.get("nome") ?? "";
  const lotacao = paramsAtuais.get("lotacao") ?? "";
  const orgaoId = paramsAtuais.get("orgaoId") ?? "";
  const vinculo = paramsAtuais.get("vinculo") ?? "";
  const status = paramsAtuais.get("status") ?? "";

  return (
    <div className="space-y-4 border-b p-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-bold">Servidores cadastrados</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Use a pesquisa geral ou filtre diretamente pelas colunas da tabela.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={exportCsvHref}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
          >
            <Download className="size-4" />
            Exportar lista
          </a>

          <a
            href={exportPdfHref}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
          >
            <FileText className="size-4" />
            Exportar PDF
          </a>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-6">
        <FiltroTextoComIcone
          key={`busca-${busca}`}
          className="lg:col-span-2"
          label="Consulta geral"
          nome="busca"
          defaultValue={busca}
          delay={3000}
          placeholder="Consulta aplicada após 3 segundos"
          onDebouncedChange={aplicarParametro}
        />

        <FiltroTexto
          key={`matricula-${matricula}`}
          label="Matrícula"
          nome="matricula"
          defaultValue={matricula}
          delay={3000}
          onDebouncedChange={aplicarParametro}
        />

        <FiltroTexto
          key={`cpf-${cpf}`}
          label="CPF"
          nome="cpf"
          defaultValue={cpf}
          delay={3000}
          onDebouncedChange={aplicarParametro}
        />

        <FiltroTexto
          key={`nome-${nome}`}
          label="Nome"
          nome="nome"
          defaultValue={nome}
          delay={3000}
          onDebouncedChange={aplicarParametro}
        />

        <FiltroTexto
          key={`lotacao-${lotacao}`}
          label="Lotação"
          nome="lotacao"
          defaultValue={lotacao}
          delay={3000}
          onDebouncedChange={aplicarParametro}
        />

        <FiltroSelect
          label="Órgão"
          nome="orgaoId"
          value={orgaoId}
          onChange={aplicarParametro}
          options={opcoesOrgaos}
        />

        <FiltroSelect
          label="Vínculo"
          nome="vinculo"
          value={vinculo}
          onChange={aplicarParametro}
          options={[
            { value: "", label: "Todos" },
            { value: "EFETIVO", label: "Efetivo" },
            { value: "CEDIDO", label: "Cedido" },
            { value: "REQUISITADO", label: "Requisitado" },
            { value: "COMISSIONADO", label: "Comissionado" },
          ]}
        />

        <FiltroSelect
          label="Status"
          nome="status"
          value={status}
          onChange={aplicarParametro}
          options={[
            { value: "", label: "Todos" },
            { value: "ativo", label: "Ativos" },
            { value: "inativo", label: "Inativos" },
          ]}
        />
      </div>
    </div>
  );
}

function FiltroTextoComIcone({
  className,
  label,
  nome,
  defaultValue,
  delay,
  placeholder,
  onDebouncedChange,
}: {
  className?: string;
  label: string;
  nome: string;
  defaultValue: string;
  delay: number;
  placeholder?: string;
  onDebouncedChange: (nome: string, valor: string) => void;
}) {
  const [valor, setValor] = useState(defaultValue);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (valor !== defaultValue) {
        onDebouncedChange(nome, valor);
      }
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [defaultValue, delay, nome, onDebouncedChange, valor]);

  return (
    <div className={className}>
      <label className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        {label}
      </label>

      <div className="mt-2 flex h-10 items-center gap-2 rounded-md border px-3">
        <Search className="size-4 text-[var(--muted-foreground)]" />
        <input
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}

function FiltroTexto({
  label,
  nome,
  defaultValue,
  delay,
  onDebouncedChange,
}: {
  label: string;
  nome: string;
  defaultValue: string;
  delay: number;
  onDebouncedChange: (nome: string, valor: string) => void;
}) {
  const [valor, setValor] = useState(defaultValue);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (valor !== defaultValue) {
        onDebouncedChange(nome, valor);
      }
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [defaultValue, delay, nome, onDebouncedChange, valor]);

  return (
    <div>
      <label className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        {label}
      </label>

      <input
        value={valor}
        onChange={(event) => setValor(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
      />
    </div>
  );
}

function FiltroSelect({
  label,
  nome,
  value,
  onChange,
  options,
}: {
  label: string;
  nome: string;
  value: string;
  onChange: (nome: string, valor: string) => void;
  options: SelectOption[];
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(nome, event.target.value)}
        className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
