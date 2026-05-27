"use client";

import { useActionState, useEffect, useState } from "react";
import { Clock3, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { registrarMarcacaoAction } from "../../application/actions/registrar-marcacao.action";
import type { RegistrarMarcacaoFormState } from "../../application/schemas/marcacao.schema";

const estadoInicial: RegistrarMarcacaoFormState = {
  sucesso: false,
  mensagem: null,
};

export function RegistrarPontoCard() {
  const [estado, formAction, pendente] = useActionState(
    registrarMarcacaoAction,
    estadoInicial,
  );

  const [agora, setAgora] = useState<Date | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  useEffect(() => {
    setAgora(new Date());

    const interval = setInterval(() => {
      setAgora(new Date());
    }, 1000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(String(position.coords.latitude));
          setLongitude(String(position.coords.longitude));
        },
        () => {
          setLatitude("");
          setLongitude("");
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
        },
      );
    }

    return () => clearInterval(interval);
  }, []);

  return (
    <form
      action={formAction}
      className="rounded-xl border bg-(--card) p-6 text-(--card-foreground) shadow-sm"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-300">
            <Clock3 className="size-4" aria-hidden="true" />
            Registro de ponto
          </div>

          <h2 className="mt-4 text-3xl font-bold tracking-tight">
            {agora
              ? new Intl.DateTimeFormat("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZone: "America/Manaus",
                }).format(agora)
              : "--:--:--"}
          </h2>

          <p className="mt-2 text-sm text-(--muted-foreground)">
            Horário de Manaus — America/Manaus
          </p>
        </div>

        <div className="rounded-xl border bg-(--muted) p-4 text-sm">
          <div className="flex gap-3">
            <ShieldCheck
              className="mt-1 size-5 shrink-0 text-blue-900 dark:text-blue-300"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">Classificação automática</p>
              <p className="mt-1 leading-6 text-(--muted-foreground)">
                O sistema identificará automaticamente se esta marcação é
                entrada, saída para intervalo, retorno ou saída.
              </p>
            </div>
          </div>
        </div>
      </div>

      <input type="hidden" name="latitude" value={latitude} />
      <input type="hidden" name="longitude" value={longitude} />

      <div className="mt-6 space-y-2">
        <label htmlFor="observacao" className="text-sm font-semibold">
          Observação opcional
        </label>

        <textarea
          id="observacao"
          name="observacao"
          rows={3}
          placeholder="Use este campo apenas se houver alguma informação relevante sobre o registro."
          className="w-full rounded-md border bg-(--card) px-3 py-2 text-sm outline-none transition focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
        />
      </div>

      {latitude && longitude && (
        <div className="mt-4 flex items-center gap-2 text-xs text-(--muted-foreground)">
          <MapPin className="size-4" aria-hidden="true" />
          Localização capturada pelo navegador.
        </div>
      )}

      {estado.mensagem && (
        <div
          role="alert"
          className={`mt-5 rounded-lg border p-4 text-sm ${
            estado.sucesso
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          <p className="font-semibold">{estado.mensagem}</p>

          {estado.dataHora && (
            <p className="mt-1">
              Registrado em: <strong>{estado.dataHora}</strong>
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Clock3 className="size-4" aria-hidden="true" />
          )}
          Registrar horário
        </button>
      </div>
    </form>
  );
}
