"use client";

import { useEffect, useState } from "react";

type TempoTrabalhadoTempoRealProps = {
  inicioIso: string;
  minutosBase: number;
  valorInicial: string;
};

function formatarSegundos(segundos: number) {
  const segundosValidos = Math.max(0, Math.floor(segundos));
  const horas = Math.floor(segundosValidos / 3600);
  const minutos = Math.floor((segundosValidos % 3600) / 60);
  const resto = segundosValidos % 60;

  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(
    2,
    "0",
  )}:${String(resto).padStart(2, "0")}`;
}

function calcularSegundos(inicioIso: string, minutosBase: number) {
  const inicio = new Date(inicioIso);

  if (Number.isNaN(inicio.getTime())) {
    return minutosBase * 60;
  }

  return Math.max(
    0,
    minutosBase * 60 + Math.floor((Date.now() - inicio.getTime()) / 1000),
  );
}

export function TempoTrabalhadoTempoReal({
  inicioIso,
  minutosBase,
  valorInicial,
}: TempoTrabalhadoTempoRealProps) {
  const [valor, setValor] = useState(valorInicial);
  const [horasMinutos, segundos] = valor.split(/:(?=\d{2}$)/);

  useEffect(() => {
    const atualizar = () => {
      setValor(formatarSegundos(calcularSegundos(inicioIso, minutosBase)));
    };

    atualizar();
    const intervalo = window.setInterval(atualizar, 1000);

    return () => window.clearInterval(intervalo);
  }, [inicioIso, minutosBase]);

  return (
    <>
      {horasMinutos}
      {segundos ? (
        <span className="align-baseline text-[0.72em]">:{segundos}</span>
      ) : null}
    </>
  );
}
