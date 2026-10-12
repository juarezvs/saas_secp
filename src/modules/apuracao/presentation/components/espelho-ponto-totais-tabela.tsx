"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { minutosParaTexto } from "../../application/services/calcular-tempo.service";

export type TipoHoraResumo = {
  id: string;
  label: string;
  quantidade: number;
  minutos: number;
  percentual: number;
  color: string;
  observacao?: string;
  observacaoTone?: "green" | "amber" | "red" | "neutral";
};

type Coluna = "tipo" | "quantidade" | "horas" | "participacao" | "observacao";
type Ordenacao = { coluna: Coluna; direcao: "asc" | "desc" };

export function EspelhoPontoTotaisTabela({ tipos }: { tipos: TipoHoraResumo[] }) {
  const [ordenacao, setOrdenacao] = useState<Ordenacao>({
    coluna: "tipo",
    direcao: "asc",
  });
  const ordenados = useMemo(() => {
    const valor = (tipo: TipoHoraResumo) => {
      if (ordenacao.coluna === "quantidade") return tipo.quantidade;
      if (ordenacao.coluna === "horas") return tipo.minutos;
      if (ordenacao.coluna === "participacao") return tipo.percentual;
      if (ordenacao.coluna === "observacao") return tipo.observacao ?? "";
      return tipo.label;
    };

    return [...tipos].sort((a, b) => {
      const aValor = valor(a);
      const bValor = valor(b);
      const resultado =
        typeof aValor === "number" && typeof bValor === "number"
          ? aValor - bValor
          : String(aValor).localeCompare(String(bValor), "pt-BR", {
              numeric: true,
              sensitivity: "base",
            });
      return ordenacao.direcao === "asc" ? resultado : -resultado;
    });
  }, [ordenacao, tipos]);

  function ordenar(coluna: Coluna) {
    setOrdenacao((atual) => ({
      coluna,
      direcao:
        atual.coluna === coluna && atual.direcao === "asc" ? "desc" : "asc",
    }));
  }

  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[820px] table-fixed border-separate border-spacing-0 text-left text-[11px] xl:min-w-0">
        <colgroup>
          <col className="w-[15rem]" />
          <col className="w-[9rem]" />
          <col className="w-[8rem]" />
          <col className="w-[18rem]" />
          <col className="w-[13rem]" />
        </colgroup>
        <thead className="bg-[var(--muted)]/55 text-[10px] text-[var(--muted-foreground)]">
          <tr>
            <Cabecalho coluna="tipo" label="Tipo de hora" ordenacao={ordenacao} onClick={ordenar} />
            <Cabecalho coluna="quantidade" label="Quantidade de registros" ordenacao={ordenacao} onClick={ordenar} centralizado />
            <Cabecalho coluna="horas" label="Total de horas" ordenacao={ordenacao} onClick={ordenar} centralizado />
            <Cabecalho coluna="participacao" label="Participação" ordenacao={ordenacao} onClick={ordenar} />
            <Cabecalho coluna="observacao" label="Saldo / observação" ordenacao={ordenacao} onClick={ordenar} />
          </tr>
        </thead>
        <tbody>
          {ordenados.map((tipo) => (
            <tr
              key={tipo.id}
              data-espelho-row
              data-search={normalizar(`${tipo.label} ${tipo.observacao ?? ""} ${minutosParaTexto(tipo.minutos)}`)}
              className="border-b last:border-b-0 hover:bg-[var(--muted)]/35"
            >
              <td className="px-3 py-1.5">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <span className={`size-2.5 rounded-full ${tipo.color}`} />
                  {tipo.label}
                </span>
              </td>
              <td className="px-3 py-1.5 text-center font-bold">{tipo.quantidade}</td>
              <td className="px-3 py-1.5 text-center font-bold">{minutosParaTexto(tipo.minutos)}</td>
              <td className="px-3 py-1.5">
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--muted)]">
                    <span className={`block h-full rounded-full ${tipo.color}`} style={{ width: `${Math.min(100, tipo.percentual)}%` }} />
                  </div>
                  <span className="w-12 text-right font-semibold text-[var(--muted-foreground)]">{formatarPercentual(tipo.percentual)}</span>
                </div>
              </td>
              <td className="px-3 py-1.5"><Badge label={tipo.observacao ?? "-"} tone={tipo.observacaoTone ?? "neutral"} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cabecalho({ coluna, label, ordenacao, onClick, centralizado = false }: { coluna: Coluna; label: string; ordenacao: Ordenacao; onClick: (coluna: Coluna) => void; centralizado?: boolean }) {
  const ativa = ordenacao.coluna === coluna;
  const Icon = !ativa ? ArrowUpDown : ordenacao.direcao === "asc" ? ArrowUp : ArrowDown;
  return <th className={`border-b px-3 py-2 font-bold ${centralizado ? "text-center" : ""}`}><button type="button" onClick={() => onClick(coluna)} className="inline-flex items-center gap-1 whitespace-nowrap hover:text-[var(--foreground)]">{label}<Icon className="size-3.5" aria-hidden="true" /></button></th>;
}

function Badge({ label, tone }: { label: string; tone: "green" | "amber" | "red" | "neutral" }) {
  if (label === "-") return <span className="text-[var(--muted-foreground)]">-</span>;
  const classe = tone === "green" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : tone === "amber" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : tone === "red" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" : "text-[var(--muted-foreground)]";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${classe}`}>{label}</span>;
}

function formatarPercentual(valor: number) {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function normalizar(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}
