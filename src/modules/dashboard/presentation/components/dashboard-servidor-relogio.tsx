"use client";

import { useEffect, useState } from "react";

const TIME_ZONE_MANAUS = "America/Manaus";

type DashboardServidorRelogioProps = {
  dataExtenso: string;
  horaReferencia: string;
  unidade: string;
};

function formatarHoraAtual() {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: TIME_ZONE_MANAUS,
  }).format(new Date());
}

export function DashboardServidorRelogio({
  dataExtenso,
  horaReferencia,
  unidade,
}: DashboardServidorRelogioProps) {
  const [horaAtual, setHoraAtual] = useState(horaReferencia);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setHoraAtual(formatarHoraAtual());
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, []);

  return (
    <p className="mt-2 text-sm leading-6 text-muted-foreground">
      {dataExtenso}
      {" \u2022 "}
      <time dateTime={horaAtual}>{horaAtual}</time>
      {" \u2022 "}
      {unidade}
    </p>
  );
}
