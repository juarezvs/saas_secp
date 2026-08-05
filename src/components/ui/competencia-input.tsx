"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "./utils";

export type CompetenciaInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange" | "value" | "defaultValue"
> & {
  label?: string;
  inputClassName?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

const meses = [
  { valor: "01", curto: "Jan", longo: "janeiro" },
  { valor: "02", curto: "Fev", longo: "fevereiro" },
  { valor: "03", curto: "Mar", longo: "março" },
  { valor: "04", curto: "Abr", longo: "abril" },
  { valor: "05", curto: "Mai", longo: "maio" },
  { valor: "06", curto: "Jun", longo: "junho" },
  { valor: "07", curto: "Jul", longo: "julho" },
  { valor: "08", curto: "Ago", longo: "agosto" },
  { valor: "09", curto: "Set", longo: "setembro" },
  { valor: "10", curto: "Out", longo: "outubro" },
  { valor: "11", curto: "Nov", longo: "novembro" },
  { valor: "12", curto: "Dez", longo: "dezembro" },
];

function competenciaAtual() {
  const hoje = new Date();

  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function normalizarCompetencia(value?: string | number | readonly string[]) {
  const texto = typeof value === "string" ? value : "";

  return /^\d{4}-\d{2}$/.test(texto) ? texto : competenciaAtual();
}

function dividirCompetencia(value: string) {
  const [ano, mes] = value.split("-");

  return { ano: Number(ano), mes };
}

function rotuloCompetencia(value: string) {
  const { ano, mes } = dividirCompetencia(value);
  const mesSelecionado = meses.find((item) => item.valor === mes);

  return `${mesSelecionado?.longo ?? mes} de ${ano}`;
}

export function CompetenciaInput({
  id = "competencia",
  name = "competencia",
  label = "Competência",
  className,
  inputClassName,
  value,
  defaultValue,
  onValueChange,
  disabled,
  ...props
}: CompetenciaInputProps) {
  const valorInicial = normalizarCompetencia(value ?? defaultValue);
  const [competencia, setCompetencia] = useState(valorInicial);
  const valorAtual = value ? normalizarCompetencia(value) : competencia;
  const { ano, mes } = dividirCompetencia(valorAtual);
  const [anoVisivel, setAnoVisivel] = useState(ano);
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function fecharAoClicarFora(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  function selecionarMes(novoMes: string) {
    const proximaCompetencia = `${anoVisivel}-${novoMes}`;

    if (!value) {
      setCompetencia(proximaCompetencia);
    }

    onValueChange?.(proximaCompetencia);
    setAberto(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <label
        htmlFor={`${id}-trigger`}
        className="text-sm font-semibold text-[var(--foreground)]"
      >
        {label}
      </label>
      <input id={id} name={name} type="hidden" value={valorAtual} {...props} />
      <button
        id={`${id}-trigger`}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        onClick={() => {
          setAnoVisivel(ano);
          setAberto((atual) => !atual);
        }}
        className={cn(
          "mt-2 flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-[var(--card)] px-3 text-left text-sm capitalize shadow-sm outline-none transition hover:bg-[var(--muted)] focus:border-ring focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-70",
          inputClassName,
        )}
      >
        <span className="truncate">{rotuloCompetencia(valorAtual)}</span>
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {aberto && !disabled && (
        <div
          role="dialog"
          aria-label="Selecionar competência"
          className="absolute z-50 mt-2 w-72 rounded-md border bg-[var(--card)] p-3 text-sm shadow-lg"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setAnoVisivel((atual) => atual - 1)}
              className="inline-flex size-8 items-center justify-center rounded-md border hover:bg-[var(--muted)]"
              aria-label="Ano anterior"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <div className="font-semibold">{anoVisivel}</div>
            <button
              type="button"
              onClick={() => setAnoVisivel((atual) => atual + 1)}
              className="inline-flex size-8 items-center justify-center rounded-md border hover:bg-[var(--muted)]"
              aria-label="Próximo ano"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {meses.map((item) => {
              const selecionado = anoVisivel === ano && item.valor === mes;

              return (
                <button
                  key={item.valor}
                  type="button"
                  onClick={() => selecionarMes(item.valor)}
                  className={cn(
                    "h-9 rounded-md border text-sm font-semibold transition hover:bg-[var(--muted)]",
                    selecionado &&
                      "border-blue-900 bg-blue-900 text-white hover:bg-blue-950",
                  )}
                >
                  {item.curto}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
