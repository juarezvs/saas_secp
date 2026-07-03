"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  DesafioFacial,
  ResultadoDesafioFacial,
} from "../../domain/challenge.types";
import { REGRAS_ENROLLMENT_FACIAL } from "../../domain/biometria-facial.rules";
import type { FaceSnapshot } from "./use-face-detector";

export function useLivenessChallenge(desafios: DesafioFacial[]) {
  const desafiosKey = desafios.map((desafio) => desafio.id).join("|");
  const desafiosKeyRef = useRef(desafiosKey);
  const movimentoIniciadoEmRef = useRef<number | null>(null);
  const framesRef = useRef(0);
  const indiceAtualRef = useRef(0);
  const resultadosRef = useRef<ResultadoDesafioFacial[]>([]);
  const desafioEmConclusaoRef = useRef<string | null>(null);
  const [estado, setEstado] = useState<{
    key: string;
    indiceAtual: number;
    resultados: ResultadoDesafioFacial[];
  }>({
    key: desafiosKey,
    indiceAtual: 0,
    resultados: [],
  });

  useEffect(() => {
    indiceAtualRef.current = estado.indiceAtual;
    movimentoIniciadoEmRef.current = null;
    framesRef.current = 0;
    desafioEmConclusaoRef.current = null;
  }, [estado.indiceAtual]);

  const processar = useCallback(
    (snapshot: FaceSnapshot) => {
      if (desafiosKeyRef.current !== desafiosKey) {
        desafiosKeyRef.current = desafiosKey;
        indiceAtualRef.current = 0;
        resultadosRef.current = [];
        movimentoIniciadoEmRef.current = null;
        framesRef.current = 0;
        desafioEmConclusaoRef.current = null;
        setEstado({
          key: desafiosKey,
          indiceAtual: 0,
          resultados: [],
        });
      }

      const indice = indiceAtualRef.current;
      const desafio = desafios[indice];

      if (
        !desafio ||
        resultadosRef.current.length >= desafios.length ||
        desafioEmConclusaoRef.current === desafio.id
      ) {
        return null;
      }

      const score = avaliarDesafio(desafio.tipo, snapshot);

      if (score < 0.6) {
        movimentoIniciadoEmRef.current = null;
        framesRef.current = 0;
        return null;
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
        return null;
      }

      desafioEmConclusaoRef.current = desafio.id;

      const resultado: ResultadoDesafioFacial = {
        desafioId: desafio.id,
        tipo: desafio.tipo,
        ordem: desafio.ordem,
        aprovado: true,
        duracaoMs,
        score,
        framesAnalisados: framesRef.current,
      };
      const novosResultados = [...resultadosRef.current, resultado];
      const proximoIndice = indice + 1;

      resultadosRef.current = novosResultados;
      indiceAtualRef.current = proximoIndice;
      setEstado({
        key: desafiosKey,
        indiceAtual: proximoIndice,
        resultados: novosResultados,
      });

      return novosResultados.length === desafios.length
        ? novosResultados
        : null;
    },
    [desafios, desafiosKey],
  );

  const reiniciar = useCallback(() => {
    desafiosKeyRef.current = desafiosKey;
    indiceAtualRef.current = 0;
    resultadosRef.current = [];
    setEstado({
      key: desafiosKey,
      indiceAtual: 0,
      resultados: [],
    });
    movimentoIniciadoEmRef.current = null;
    framesRef.current = 0;
    desafioEmConclusaoRef.current = null;
  }, [desafiosKey]);

  const resultadosVisiveis = estado.key === desafiosKey ? estado.resultados : [];
  const indiceVisivel = estado.key === desafiosKey ? estado.indiceAtual : 0;

  return {
    desafioAtual: desafios[indiceVisivel] ?? null,
    indiceAtual: indiceVisivel,
    resultados: resultadosVisiveis,
    concluido:
      desafios.length > 0 && resultadosVisiveis.length === desafios.length,
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
