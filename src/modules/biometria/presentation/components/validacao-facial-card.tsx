"use client";

import { useActionState } from "react";
import { Loader2, ScanFace } from "lucide-react";

import { registrarMarcacaoFacialAutorizadaAction } from "@/modules/marcacoes-brutas/application/actions/registrar-marcacao-facial.action";
import { validarFaceMarcacaoAction } from "../../application/actions/validar-face-marcacao.action";
import type { BiometriaFormState } from "../../application/schemas/biometria.schema";
import { CameraCapture } from "./camera-capture";

const estadoInicial: BiometriaFormState = {
  sucesso: false,
  mensagem: null,
};

export function ValidacaoFacialCard({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [estado, formAction, pendente] = useActionState(
    validarFaceMarcacaoAction,
    estadoInicial,
  );

  return (
    <form action={formAction} className={compact ? "space-y-4" : "space-y-6"}>
      {estado.mensagem && (
        <div
          role="status"
          className={`rounded-md border p-4 text-sm ${
            estado.sucesso
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          <p>{estado.mensagem}</p>

          {typeof estado.distancia === "number" && (
            <p className="mt-2 text-xs">
              Distância: {estado.distancia.toFixed(4)} | Similaridade:{" "}
              {estado.similaridade?.toFixed(4)}
            </p>
          )}
        </div>
      )}

      {estado.sucesso && estado.autorizacaoId && estado.autorizacaoToken ? (
        <section className="rounded-md border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          <h2 className="font-bold">Identidade confirmada</h2>
          <p className="mt-2 text-sm leading-6">
            A validação facial foi concluida. Confirme para gravar a marcação
            com data e hora atuais.
          </p>

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
            formAction={registrarMarcacaoFacialAutorizadaAction}
            className="mt-4 rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800"
          >
            Registrar marcação agora
          </button>
        </section>
      ) : (
        <>
          <CameraCapture
            modo="validacao"
            inputName="template"
            compact={compact}
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pendente}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-60"
            >
              {pendente ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ScanFace className="size-4" aria-hidden="true" />
              )}
              Validar face
            </button>
          </div>
        </>
      )}
    </form>
  );
}
