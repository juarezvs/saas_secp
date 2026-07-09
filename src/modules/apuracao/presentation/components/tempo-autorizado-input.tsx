"use client";

import { useState } from "react";

function minutosParaTexto(minutos: number) {
  const horas = Math.floor(Math.max(0, minutos) / 60);
  const resto = Math.max(0, minutos) % 60;

  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(
    2,
    "0",
  )}`;
}

function textoParaMinutos(valor: string) {
  const match = valor.match(/^(\d{1,3}):([0-5]\d)$/);

  if (!match) {
    return 0;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function mascararTempo(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 5);

  if (!digitos) {
    return "00:00";
  }

  const preenchido = digitos.padStart(3, "0");
  const minutos = Math.min(Number(preenchido.slice(-2)), 59);
  const horas = Number(preenchido.slice(0, -2));

  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(
    2,
    "0",
  )}`;
}

export function TempoAutorizadoInput({
  name,
  minutos,
  minutosMaximos,
  className,
  ariaLabel,
  title,
}: {
  name: string;
  minutos: number;
  minutosMaximos: number;
  className?: string;
  ariaLabel?: string;
  title?: string;
}) {
  const [valor, setValor] = useState(minutosParaTexto(minutos));

  return (
    <input
      type="text"
      name={name}
      value={valor}
      inputMode="numeric"
      pattern="\d{1,3}:[0-5]\d"
      maxLength={6}
      className={className}
      aria-label={ariaLabel}
      title={title}
      onChange={(event) => setValor(mascararTempo(event.target.value))}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={() => {
        const minutosInformados = textoParaMinutos(valor);

        if (minutosInformados > minutosMaximos) {
          setValor(minutosParaTexto(minutosMaximos));
          return;
        }

        setValor(mascararTempo(valor));
      }}
    />
  );
}
