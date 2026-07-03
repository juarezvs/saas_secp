"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCameraStream() {
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const parar = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const iniciar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    parar();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Este navegador não oferece acesso compatível à câmera.");
      }

      const novoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = novoStream;
      setStream(novoStream);
      return novoStream;
    } catch (error) {
      const mensagem =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Não foi possível acessar a câmera. Libere a permissão no navegador e tente novamente."
          : error instanceof Error
            ? error.message
            : "Não foi possível acessar a câmera.";
      setErro(mensagem);
      throw error;
    } finally {
      setCarregando(false);
    }
  }, [parar]);

  useEffect(() => parar, [parar]);

  return {
    stream,
    carregando,
    erro,
    iniciar,
    parar,
  };
}
