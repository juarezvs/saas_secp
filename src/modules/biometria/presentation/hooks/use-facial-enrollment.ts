"use client";

import { useCallback, useMemo, useState } from "react";

import type {
  ConclusaoEnrollmentFacialInput,
  SessaoEnrollmentFacialPublica,
} from "../../domain/biometria-facial.types";

type ApiError = {
  success: false;
  code: string;
  message: string;
};

type FacialEnrollmentEndpoints = {
  iniciar?: string;
  concluir?: string;
};

type UseFacialEnrollmentParams = {
  endpoints?: FacialEnrollmentEndpoints;
  requestExtra?: Record<string, unknown>;
};

export function useFacialEnrollment(params: UseFacialEnrollmentParams = {}) {
  const endpointIniciar =
    params.endpoints?.iniciar ?? "/api/biometria/facial/enrollment/session";
  const endpointConcluir =
    params.endpoints?.concluir ?? "/api/biometria/facial/enrollment/complete";
  const requestExtra = useMemo(
    () => params.requestExtra ?? {},
    [params.requestExtra],
  );
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
        const response = await fetch(endpointIniciar, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ consentimento: true, modo, ...requestExtra }),
        });
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
            : "Não foi possível iniciar o cadastro facial.";
        setErro(mensagem);
        throw error;
      } finally {
        setCarregando(false);
      }
    },
    [endpointIniciar, requestExtra],
  );

  const concluir = useCallback(
    async (input: ConclusaoEnrollmentFacialInput) => {
      setCarregando(true);
      setErro(null);

      try {
        const response = await fetch(endpointConcluir, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...input, ...requestExtra }),
        });
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
            : "Não foi possível concluir o cadastro facial.";
        setErro(mensagem);
        throw error;
      } finally {
        setCarregando(false);
      }
    },
    [endpointConcluir, requestExtra],
  );

  return {
    sessao,
    carregando,
    erro,
    iniciar,
    concluir,
  };
}
