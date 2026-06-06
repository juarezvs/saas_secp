"use client";

import { useCallback, useState } from "react";

import type {
  ConclusaoEnrollmentFacialInput,
  SessaoEnrollmentFacialPublica,
} from "../../domain/biometria-facial.types";

type ApiError = {
  success: false;
  code: string;
  message: string;
};

export function useFacialEnrollment() {
  const [sessao, setSessao] = useState<SessaoEnrollmentFacialPublica | null>(
    null,
  );
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const iniciar = useCallback(
    async (modo: "cadastro" | "recadastro" = "cadastro") => {
      setCarregando(true);
      setErro(null);

      try {
        const response = await fetch(
          "/api/biometria/facial/enrollment/session",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ consentimento: true, modo }),
          },
        );
        const payload = (await response.json()) as
          | { success: true; data: SessaoEnrollmentFacialPublica }
          | ApiError;

        if (!payload.success) {
          throw new Error(payload.message);
        }

        setSessao(payload.data);
        return payload.data;
      } catch (error) {
        const mensagem =
          error instanceof Error
            ? error.message
            : "Nao foi possivel iniciar o cadastro facial.";
        setErro(mensagem);
        throw error;
      } finally {
        setCarregando(false);
      }
    },
    [],
  );

  const concluir = useCallback(async (input: ConclusaoEnrollmentFacialInput) => {
    setCarregando(true);
    setErro(null);

    try {
      const response = await fetch(
        "/api/biometria/facial/enrollment/complete",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const payload = (await response.json()) as
        | {
            success: true;
            data: {
              biometriaId: string;
              qualidade: string;
              provaDeVida: string;
              recadastro: boolean;
              concluidoEm: string;
            };
          }
        | ApiError;

      if (!payload.success) {
        throw new Error(payload.message);
      }

      return payload.data;
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Nao foi possivel concluir o cadastro facial.";
      setErro(mensagem);
      throw error;
    } finally {
      setCarregando(false);
    }
  }, []);

  return {
    sessao,
    carregando,
    erro,
    iniciar,
    concluir,
  };
}
