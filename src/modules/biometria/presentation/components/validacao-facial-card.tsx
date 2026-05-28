"use client";

import { useActionState } from "react";
import { Loader2, ScanFace } from "lucide-react";
import { validarFaceMarcacaoAction } from "../../application/actions/validar-face-marcacao.action";
import type { BiometriaFormState } from "../../application/schemas/biometria.schema";
import { CameraCapture } from "./camera-capture";
import { registrarMarcacaoAction } from "@/modules/marcacoes/application/actions/registrar-marcacao.action";

const estadoInicial: BiometriaFormState = {
  sucesso: false,
  mensagem: null,
};

export function ValidacaoFacialCard() {
  const [estado, formAction, pendente] = useActionState(
    validarFaceMarcacaoAction,
    estadoInicial,
  );

  return (
    <form action={formAction} className="space-y-6">
      {estado.mensagem && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            estado.sucesso
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          <p>{estado.mensagem}</p>

          {typeof estado.distancia === "number" && (
            <p className="mt-2 text-xs">
              Distância: {estado.distancia.toFixed(4)} • Similaridade:{" "}
              {estado.similaridade?.toFixed(4)}
            </p>
          )}
        </div>
      )}

      {estado.sucesso && estado.autorizacaoId && estado.autorizacaoToken && (
        <section className="rounded-xl border border-green-200 bg-green-50 p-5 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          <h2 className="text-lg font-bold">Face validada</h2>

          <p className="mt-2 text-sm leading-6">
            Sua autorização biométrica foi gerada e é válida por poucos minutos.
            Clique abaixo para registrar sua marcação.
          </p>

          <form action={registrarMarcacaoAction} className="mt-4">
            <input
              type="hidden"
              name="autorizacaoBiometricaId"
              value={estado.autorizacaoId}
            />

            <input
              type="hidden"
              name="autorizacaoBiometricaToken"
              value={estado.autorizacaoToken}
            />

            <button
              type="submit"
              className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800"
            >
              Registrar marcação agora
            </button>
          </form>
        </section>
      )}

      <CameraCapture modo="validacao" inputName="template" />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-60"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ScanFace className="size-4" />
          )}
          Validar face
        </button>
      </div>
    </form>
  );
}
