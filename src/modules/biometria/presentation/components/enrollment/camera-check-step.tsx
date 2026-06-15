"use client";

import type { RefObject } from "react";
import { Camera, Loader2 } from "lucide-react";

type CameraCheckStepProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  carregando: boolean;
  erro?: string | null;
  cameraAtiva: boolean;
  onVerificar: () => void;
};

export function CameraCheckStep({
  videoRef,
  carregando,
  erro,
  cameraAtiva,
  onVerificar,
}: CameraCheckStepProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,520px)_1fr]">
      <CameraPreview videoRef={videoRef} />

      <div className="rounded-xl border bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-lg font-bold">Prepare o ambiente</h2>
        <ol className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted-foreground)]">
          <li>1. Fique em local bem iluminado.</li>
          <li>2. Remova mascara, bone ou oculos escuros.</li>
          <li>3. Mantenha apenas uma pessoa diante da câmera.</li>
          <li>4. Posicione o rosto dentro da moldura.</li>
          <li>5. Não utilize foto, vídeo ou outra tela.</li>
        </ol>

        {erro && (
          <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">
            {erro}
          </p>
        )}

        <button
          type="button"
          onClick={onVerificar}
          disabled={carregando || cameraAtiva}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-50"
        >
          {carregando ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Camera className="size-4" aria-hidden="true" />
          )}
          {cameraAtiva ? "Câmera verificada" : "Verificar câmera"}
        </button>
      </div>
    </section>
  );
}

export function CameraPreview({
  videoRef,
  status,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  status?: string;
}) {
  return (
    <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-xl border bg-black shadow-sm">
      <video
        ref={videoRef}
        muted
        playsInline
        className="aspect-[4/3] w-full scale-x-[-1] object-cover"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[70%] w-[48%] rounded-[50%] border-4 border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
      </div>
      {status && (
        <div className="absolute inset-x-3 bottom-3 rounded-md bg-black/75 px-3 py-2 text-center text-sm font-semibold text-white">
          {status}
        </div>
      )}
    </div>
  );
}
