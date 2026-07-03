"use client";

import { useEffect, useState } from "react";

type TempoTrabalhadoTempoRealProps = {
  inicioIso: string;
  minutosBase: number;
  valorInicial: string;
};

function formatarMinutos(minutos: number) {
  const minutosValidos = Math.max(0, Math.floor(minutos));
  const horas = Math.floor(minutosValidos / 60);
  const resto = minutosValidos % 60;

  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function calcularMinutos(inicioIso: string, minutosBase: number) {
  const inicio = new Date(inicioIso);

  if (Number.isNaN(inicio.getTime())) {
    return 0;
  }

  return Math.max(
    0,
    minutosBase + Math.floor((Date.now() - inicio.getTime()) / 60000),
  );
}

export function TempoTrabalhadoTempoReal({
  inicioIso,
  minutosBase,
  valorInicial,
}: TempoTrabalhadoTempoRealProps) {
  const [valor, setValor] = useState(valorInicial);

  useEffect(() => {
    const atualizar = () => {
      setValor(formatarMinutos(calcularMinutos(inicioIso, minutosBase)));
    };

    atualizar();
    const intervalo = window.setInterval(atualizar, 1000);

    return () => window.clearInterval(intervalo);
  }, [inicioIso, minutosBase]);

  return <>{valor}</>;
}
