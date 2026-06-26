"use client";

import { useEffect, useState } from "react";
import { FUSO_HORARIO_PADRAO } from "@/modules/marcacoes/application/services/data-marcacao.service";

type DashboardServidorRelogioProps = {
  dataExtenso: string;
  horaReferencia: string;
  fusoHorario?: string;
  unidade: string;
};

function formatarHoraAtual(fusoHorario: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: fusoHorario,
  }).format(new Date());
}

export function DashboardServidorRelogio({
  dataExtenso,
  horaReferencia,
  fusoHorario = FUSO_HORARIO_PADRAO,
  unidade,
}: DashboardServidorRelogioProps) {
  const [horaAtual, setHoraAtual] = useState(horaReferencia);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setHoraAtual(formatarHoraAtual(fusoHorario));
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, [fusoHorario]);

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
