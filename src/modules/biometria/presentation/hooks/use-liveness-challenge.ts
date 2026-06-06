"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  DesafioFacial,
  ResultadoDesafioFacial,
} from "../../domain/challenge.types";
import { REGRAS_ENROLLMENT_FACIAL } from "../../domain/biometria-facial.rules";
import type { FaceSnapshot } from "./use-face-detector";

export function useLivenessChallenge(desafios: DesafioFacial[]) {
  const movimentoIniciadoEmRef = useRef<number | null>(null);
  const framesRef = useRef(0);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [resultados, setResultados] = useState<ResultadoDesafioFacial[]>([]);

  useEffect(() => {
    movimentoIniciadoEmRef.current = null;
    framesRef.current = 0;
  }, [indiceAtual]);

  const processar = useCallback(
    (snapshot: FaceSnapshot) => {
      const desafio = desafios[indiceAtual];

      if (!desafio || resultados.length >= desafios.length) {
        return false;
      }

      const score = avaliarDesafio(desafio.tipo, snapshot);

      if (score < 0.6) {
        movimentoIniciadoEmRef.current = null;
        framesRef.current = 0;
        return false;
      }

      movimentoIniciadoEmRef.current ??= Date.now();
      framesRef.current += 1;
      const duracaoMs = Math.max(
        1,
        Date.now() - movimentoIniciadoEmRef.current,
      );
      const requisitos =
        REGRAS_ENROLLMENT_FACIAL.requisitosPorDesafio[desafio.tipo];

      if (
        framesRef.current < requisitos.minFrames ||
        duracaoMs < requisitos.duracaoMinimaMs
      ) {
        return false;
      }

      const resultado: ResultadoDesafioFacial = {
        desafioId: desafio.id,
        tipo: desafio.tipo,
        ordem: desafio.ordem,
        aprovado: true,
        duracaoMs,
        score,
        framesAnalisados: framesRef.current,
      };

      setResultados((atuais) => [...atuais, resultado]);
      setIndiceAtual((atual) => atual + 1);
      return resultados.length + 1 === desafios.length;
    },
    [desafios, indiceAtual, resultados.length],
  );

  const reiniciar = useCallback(() => {
    setIndiceAtual(0);
    setResultados([]);
    movimentoIniciadoEmRef.current = null;
    framesRef.current = 0;
  }, []);

  return {
    desafioAtual: desafios[indiceAtual] ?? null,
    indiceAtual,
    resultados,
    concluido: desafios.length > 0 && resultados.length === desafios.length,
    processar,
    reiniciar,
  };
}

function avaliarDesafio(
  tipo: DesafioFacial["tipo"],
  snapshot: FaceSnapshot,
) {
  if (snapshot.faces !== 1 || !snapshot.embedding) {
    return 0;
  }

  if (tipo === "PISCAR") {
    return snapshot.gestos.some((gesto) => gesto.includes("blink")) ? 0.9 : 0;
  }

  if (tipo === "VIRAR_ESQUERDA") {
    return snapshot.yaw >= 12 ? Math.min(1, snapshot.yaw / 25) : 0;
  }

  if (tipo === "VIRAR_DIREITA") {
    return snapshot.yaw <= -12 ? Math.min(1, Math.abs(snapshot.yaw) / 25) : 0;
  }

  if (tipo === "OLHAR_CIMA") {
    return snapshot.pitch <= -8 ? Math.min(1, Math.abs(snapshot.pitch) / 20) : 0;
  }

  if (tipo === "OLHAR_BAIXO") {
    return snapshot.pitch >= 8 ? Math.min(1, snapshot.pitch / 20) : 0;
  }

  return snapshot.felicidade >= 0.35 ||
    snapshot.gestos.some((gesto) => gesto.includes("smile"))
    ? Math.max(0.7, Math.min(1, snapshot.felicidade * 1.5))
    : 0;
}
