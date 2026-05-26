"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { loginSchema } from "../schemas/login.schema";

export type LoginActionState = {
  sucesso: boolean;
  mensagem: string | null;
  campos?: {
    matricula?: string;
  };
};

export async function loginAction(
  _estadoAnterior: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const dados = {
    matricula: String(formData.get("matricula") ?? ""),
    senha: String(formData.get("senha") ?? ""),
  };

  const parsed = loginSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      campos: {
        matricula: dados.matricula,
      },
    };
  }

  try {
    await signIn("credentials", {
      matricula: parsed.data.matricula,
      senha: parsed.data.senha,
      redirectTo: "/dashboard",
    });

    return {
      sucesso: true,
      mensagem: null,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        sucesso: false,
        mensagem: "Matrícula ou senha inválida.",
        campos: {
          matricula: parsed.data.matricula,
        },
      };
    }

    throw error;
  }
}