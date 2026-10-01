"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Sunrise } from "lucide-react";

import { FUSO_HORARIO_PADRAO } from "@/modules/marcacoes/application/services/data-marcacao.service";

type SaudacaoServidorProps = {
  primeiroNome: string;
  fusoHorario?: string | null;
};

function obterHoraLocal(fusoHorario: string) {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: fusoHorario,
  }).formatToParts(new Date());

  return Number(partes.find((parte) => parte.type === "hour")?.value ?? 0);
}

function obterSaudacao(fusoHorario: string) {
  const hora = obterHoraLocal(fusoHorario);

  if (hora >= 5 && hora < 12) {
    return "Bom dia";
  }

  if (hora >= 12 && hora < 18) {
    return "Boa tarde";
  }

  return "Boa noite";
}

function obterPeriodo(fusoHorario: string) {
  const hora = obterHoraLocal(fusoHorario);

  if (hora >= 5 && hora < 12) {
    return "manha";
  }

  if (hora >= 12 && hora < 18) {
    return "tarde";
  }

  return "noite";
}

export function SaudacaoServidor({
  primeiroNome,
  fusoHorario,
}: SaudacaoServidorProps) {
  const fusoHorarioEfetivo = fusoHorario || FUSO_HORARIO_PADRAO;
  const [saudacao, setSaudacao] = useState(() =>
    obterSaudacao(fusoHorarioEfetivo),
  );

  useEffect(() => {
    const atualizar = () => setSaudacao(obterSaudacao(fusoHorarioEfetivo));

    atualizar();
    const intervalo = window.setInterval(atualizar, 30_000);

    return () => window.clearInterval(intervalo);
  }, [fusoHorarioEfetivo]);

  return (
    <>
      {saudacao}, {primeiroNome}
    </>
  );
}

export function SaudacaoServidorIcon({
  fusoHorario,
}: {
  fusoHorario?: string | null;
}) {
  const fusoHorarioEfetivo = fusoHorario || FUSO_HORARIO_PADRAO;
  const [periodo, setPeriodo] = useState(() =>
    obterPeriodo(fusoHorarioEfetivo),
  );

  useEffect(() => {
    const atualizar = () => setPeriodo(obterPeriodo(fusoHorarioEfetivo));

    atualizar();
    const intervalo = window.setInterval(atualizar, 30_000);

    return () => window.clearInterval(intervalo);
  }, [fusoHorarioEfetivo]);

  if (periodo === "manha") {
    return <Sunrise className="size-8" aria-hidden="true" />;
  }

  if (periodo === "noite") {
    return <Moon className="size-8" aria-hidden="true" />;
  }

  return <Sun className="size-8" aria-hidden="true" />;
}
