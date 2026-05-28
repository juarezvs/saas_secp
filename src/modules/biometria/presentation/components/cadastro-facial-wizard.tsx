"use client";

import { useActionState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { cadastrarFaceServidorAction } from "../../application/actions/cadastrar-face-servidor.action";
import type { BiometriaFormState } from "../../application/schemas/biometria.schema";
import { CameraCapture } from "./camera-capture";

const estadoInicial: BiometriaFormState = {
  sucesso: false,
  mensagem: null,
};

export function CadastroFacialWizard() {
  const [estado, formAction, pendente] = useActionState(
    cadastrarFaceServidorAction,
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
          {estado.mensagem}
        </div>
      )}

      <section className="rounded-xl border bg-(--card) p-5 text-(--card-foreground) shadow-sm">
        <h2 className="text-lg font-bold">Termo de ciência e recadastro</h2>

        <p className="mt-2 text-sm leading-6 text-(--muted-foreground)">
          A biometria facial será utilizada para reforçar a segurança do
          registro de frequência. O sistema armazenará o template facial
          numérico, não a imagem bruta capturada pela câmera. Caso já exista
          cadastro anterior, o novo envio substituirá o template facial ativo e
          o evento será registrado em auditoria.
        </p>

        <label className="mt-4 flex items-start gap-3 rounded-lg border bg-(--muted) p-4 text-sm">
          <input type="checkbox" required className="mt-1" />
          <span>
            Declaro ciência do uso do template facial para autenticação e
            registro de frequência no SECP.
          </span>
        </label>
      </section>

      <CameraCapture modo="cadastro" inputName="templates" />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-60"
        >
          {pendente ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
          Salvar cadastro facial
        </button>
      </div>
    </form>
  );
}
