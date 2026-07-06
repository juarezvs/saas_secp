"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraDispositivo = {
  deviceId: string;
  label: string;
};

function mensagemErroCamera(error: unknown, fallback: string) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Não foi possível acessar a câmera. Libere a permissão no navegador e tente novamente.";
  }

  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "Nenhuma câmera foi encontrada neste dispositivo.";
  }

  return error instanceof Error ? error.message : fallback;
}

export function useCameraStream() {
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDispositivo[]>([]);
  const [cameraSelecionadaId, setCameraSelecionadaId] = useState("");

  const parar = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const listarCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setCameras([]);
      return [];
    }

    const dispositivos = await navigator.mediaDevices.enumerateDevices();
    const camerasEncontradas = dispositivos
      .filter((dispositivo) => dispositivo.kind === "videoinput")
      .map((dispositivo, indice) => ({
        deviceId: dispositivo.deviceId,
        label: dispositivo.label || `Câmera ${indice + 1}`,
      }))
      .filter((dispositivo) => dispositivo.deviceId);

    setCameras(camerasEncontradas);
    setCameraSelecionadaId((atual) =>
      atual || camerasEncontradas.length === 0
        ? atual
        : camerasEncontradas[0].deviceId,
    );

    return camerasEncontradas;
  }, []);

  const abrirStream = useCallback(
    async (deviceId?: string) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Este navegador não oferece acesso compatível à câmera.",
        );
      }

      const novoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...(deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: "user" }),
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = novoStream;
      setStream(novoStream);
      void listarCameras();

      return novoStream;
    },
    [listarCameras],
  );

  const iniciar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    parar();

    try {
      return await abrirStream(cameraSelecionadaId || undefined);
    } catch (error) {
      const mensagem = mensagemErroCamera(
        error,
        "Não foi possível acessar a câmera.",
      );
      setErro(mensagem);
      throw error;
    } finally {
      setCarregando(false);
    }
  }, [abrirStream, cameraSelecionadaId, parar]);

  const selecionarCamera = useCallback(
    async (deviceId: string) => {
      setCameraSelecionadaId(deviceId);

      if (!streamRef.current) {
        return;
      }

      setCarregando(true);
      setErro(null);
      parar();

      try {
        await abrirStream(deviceId);
      } catch (error) {
        const mensagem = mensagemErroCamera(
          error,
          "Não foi possível alternar a câmera.",
        );
        setErro(mensagem);
        throw error;
      } finally {
        setCarregando(false);
      }
    },
    [abrirStream, parar],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void listarCameras();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [listarCameras]);

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;

    if (!mediaDevices?.addEventListener) {
      return;
    }

    const atualizar = () => {
      void listarCameras();
    };

    mediaDevices.addEventListener("devicechange", atualizar);
    return () => mediaDevices.removeEventListener("devicechange", atualizar);
  }, [listarCameras]);

  useEffect(() => parar, [parar]);

  return {
    stream,
    carregando,
    erro,
    cameras,
    cameraSelecionadaId,
    iniciar,
    parar,
    selecionarCamera,
  };
}
