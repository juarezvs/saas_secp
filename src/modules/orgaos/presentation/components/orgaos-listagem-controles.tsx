"use client";

import {
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DataTableExportButtons } from "@/components/listagens/data-table-export-buttons";
import { Button, Modal } from "@/components/ui";

type OrgaosListagemControlesProps = {
  exportCsvHref: string;
  exportPdfHref: string;
  fusosHorarios?: {
    valor: string;
    rotulo: string;
  }[];
};

export function OrgaosListagemControles({
  exportCsvHref,
  exportPdfHref,
  fusosHorarios = [],
}: OrgaosListagemControlesProps) {
  const nomesFiltros = [
    "busca",
    "sigla",
    "nome",
    "codigoExternoSarh",
    "status",
    "fusoHorario",
  ] as const;
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quantidadeFiltros = useMemo(
    () => nomesFiltros.filter((nome) => searchParams.get(nome)?.trim()).length,
    [searchParams],
  );

  function navegarComFiltros(params: URLSearchParams) {
    params.set("pagina", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
      setAberto(false);
    });
  }

  function aplicarFiltros(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams(searchParams.toString());

    for (const nome of nomesFiltros) {
      const valor = String(formData.get(nome) ?? "").trim();
      if (valor) params.set(nome, valor);
      else params.delete(nome);
    }

    navegarComFiltros(params);
  }

  function limparFiltros() {
    const params = new URLSearchParams(searchParams.toString());
    for (const nome of nomesFiltros) params.delete(nome);
    navegarComFiltros(params);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setAberto(true)}
          leftIcon={<SlidersHorizontal className="size-4" aria-hidden="true" />}
          aria-label={
            quantidadeFiltros
              ? `Filtros, ${quantidadeFiltros} ativos`
              : "Abrir filtros"
          }
        >
          Filtros
          {quantidadeFiltros > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-[var(--primary)] text-xs text-[var(--primary-foreground)]">
              {quantidadeFiltros}
            </span>
          )}
        </Button>
        <DataTableExportButtons
          csvHref={exportCsvHref}
          pdfHref={exportPdfHref}
        />
      </div>

      <Modal
        open={aberto}
        onOpenChange={setAberto}
        title="Filtros"
        description="Refine a lista de órgãos pelos critérios desejados."
        className="max-h-[88vh] w-[min(94vw,720px)] overflow-y-auto"
      >
        <form onSubmit={aplicarFiltros}>
          <Secao titulo="Identificação">
            <CampoTexto
              nome="busca"
              label="Consulta geral"
              valor={searchParams.get("busca") ?? ""}
              placeholder="Nome, sigla ou código SARH"
              className="sm:col-span-2"
            />
            <CampoTexto
              nome="sigla"
              label="Sigla"
              valor={searchParams.get("sigla") ?? ""}
            />
            <CampoTexto
              nome="nome"
              label="Nome"
              valor={searchParams.get("nome") ?? ""}
            />
            <CampoTexto
              nome="codigoExternoSarh"
              label="Código SARH"
              valor={searchParams.get("codigoExternoSarh") ?? ""}
              className="sm:col-span-2"
            />
          </Secao>

          <Secao titulo="Situação e localização" separada>
            <CampoSelect
              nome="status"
              label="Status"
              valor={searchParams.get("status") ?? ""}
              opcoes={[
                { value: "", label: "Todos" },
                { value: "ativo", label: "Ativos" },
                { value: "inativo", label: "Inativos" },
              ]}
            />
            <CampoSelect
              nome="fusoHorario"
              label="Fuso horário"
              valor={searchParams.get("fusoHorario") ?? ""}
              opcoes={[
                { value: "", label: "Todos" },
                ...fusosHorarios.map((fuso) => ({
                  value: fuso.valor,
                  label: fuso.rotulo,
                })),
              ]}
            />
          </Secao>

          <div className="sticky -bottom-6 mt-6 flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--card)] py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={limparFiltros}
              disabled={pending || quantidadeFiltros === 0}
            >
              Limpar filtros
            </Button>
            <Button type="submit" loading={pending}>
              Aplicar filtros
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

const inputClassName =
  "mt-2 h-10 w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] shadow-sm outline-none transition-colors focus:border-[var(--ring)]";

function Secao({
  titulo,
  separada = false,
  children,
}: {
  titulo: string;
  separada?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={
        separada ? "mt-6 border-t border-[var(--border)] pt-5" : undefined
      }
    >
      <h3 className="text-sm font-semibold text-[var(--foreground)]">
        {titulo}
      </h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function CampoTexto({
  nome,
  label,
  valor,
  placeholder,
  className,
}: {
  nome: string;
  label: string;
  valor: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <input
        key={`${nome}-${valor}`}
        name={nome}
        defaultValue={valor}
        placeholder={placeholder}
        className={inputClassName}
      />
    </label>
  );
}

function CampoSelect({
  nome,
  label,
  valor,
  opcoes,
}: {
  nome: string;
  label: string;
  valor: string;
  opcoes: { value: string; label: string }[];
}) {
  return (
    <label>
      <span className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <select
        key={`${nome}-${valor}`}
        name={nome}
        defaultValue={valor}
        className={inputClassName}
      >
        {opcoes.map((opcao) => (
          <option key={opcao.value || "todos"} value={opcao.value}>
            {opcao.label}
          </option>
        ))}
      </select>
    </label>
  );
}
