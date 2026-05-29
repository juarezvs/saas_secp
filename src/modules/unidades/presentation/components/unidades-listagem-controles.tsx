"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, FileText, Search } from "lucide-react";

type OrgaoOption = {
  id: string;
  sigla: string;
};

export function UnidadesListagemControles({
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

  const [busca, setBusca] = useState(searchParams.get("busca") ?? "");

  const paramsAtuais = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  function aplicarParametro(nome: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (valor) params.set(nome, valor);
    else params.delete(nome);

    params.set("pagina", "1");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const atual = searchParams.get("busca") ?? "";

      if (busca !== atual) {
        aplicarParametro("busca", busca);
      }
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [busca]);

  return (
    <div className="space-y-4 border-b p-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-bold">Unidades cadastradas</h2>
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
        <div className="lg:col-span-2">
          <label className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
            Consulta geral
          </label>

          <div className="mt-2 flex h-10 items-center gap-2 rounded-md border px-3">
            <Search className="size-4 text-[var(--muted-foreground)]" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Consulta aplicada após 3 segundos"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <FiltroTexto
          label="Sigla"
          value={paramsAtuais.get("sigla") ?? ""}
          onChange={(valor) => aplicarParametro("sigla", valor)}
        />

        <FiltroTexto
          label="Nome"
          value={paramsAtuais.get("nome") ?? ""}
          onChange={(valor) => aplicarParametro("nome", valor)}
        />

        <FiltroTexto
          label="Superior"
          value={paramsAtuais.get("superior") ?? ""}
          onChange={(valor) => aplicarParametro("superior", valor)}
        />

        <FiltroSelect
          label="Órgão"
          value={paramsAtuais.get("orgaoId") ?? ""}
          onChange={(valor) => aplicarParametro("orgaoId", valor)}
          options={[
            { value: "", label: "Todos" },
            ...orgaos.map((orgao) => ({ value: orgao.id, label: orgao.sigla })),
          ]}
        />

        <FiltroSelect
          label="Tipo"
          value={paramsAtuais.get("tipo") ?? ""}
          onChange={(valor) => aplicarParametro("tipo", valor)}
          options={[
            { value: "", label: "Todos" },
            { value: "SECAO_JUDICIARIA", label: "Seção Judiciária" },
            { value: "SUBSECAO_JUDICIARIA", label: "Subseção" },
            { value: "NUCLEO", label: "Núcleo" },
            { value: "SECRETARIA", label: "Secretaria" },
            { value: "SECAO", label: "Seção" },
            { value: "SETOR", label: "Setor" },
            { value: "SERVICO", label: "Serviço" },
            { value: "VARA", label: "Vara" },
            { value: "GABINETE", label: "Gabinete" },
          ]}
        />

        <FiltroSelect
          label="Status"
          value={paramsAtuais.get("status") ?? ""}
          onChange={(valor) => aplicarParametro("status", valor)}
          options={[
            { value: "", label: "Todos" },
            { value: "ativa", label: "Ativas" },
            { value: "inativa", label: "Inativas" },
          ]}
        />
      </div>
    </div>
  );
}

function FiltroTexto({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
}) {
  const [valor, setValor] = useState(value);

  useEffect(() => {
    setValor(value);
  }, [value]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (valor !== value) onChange(valor);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [valor, value, onChange]);

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
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
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