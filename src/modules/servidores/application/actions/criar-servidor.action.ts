"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  servidorSchema,
  type ServidorFormState,
} from "../schemas/servidor.schema";
import {
  matriculaServidorExiste,
  usuarioMatriculaExiste,
} from "../../infrastructure/repositories/servidor.repository";

function extrairDadosServidor(formData: FormData) {
  return {
    orgaoId: String(formData.get("orgaoId") ?? ""),
    matricula: String(formData.get("matricula") ?? "").trim(),
    nome: String(formData.get("nome") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    nomeFuncional: String(formData.get("nomeFuncional") ?? "").trim(),
    vinculo: String(formData.get("vinculo") ?? ""),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
  };
}

export async function criarServidorAction(
  _estadoAnterior: ServidorFormState,
  formData: FormData
): Promise<ServidorFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "servidores:gerenciar:global"
  );

  const dados = extrairDadosServidor(formData);
  const parsed = servidorSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do formulário.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const matricula = parsed.data.matricula;

  if (await matriculaServidorExiste(matricula)) {
    return {
      sucesso: false,
      mensagem: "Já existe um servidor com esta matrícula.",
      erros: {
        matricula: ["Já existe um servidor com esta matrícula."],
      },
      campos: dados,
    };
  }

  if (await usuarioMatriculaExiste(matricula)) {
    return {
      sucesso: false,
      mensagem:
        "Já existe um usuário com esta matrícula. Verifique se o servidor já foi cadastrado.",
      erros: {
        matricula: ["Já existe um usuário com esta matrícula."],
      },
      campos: dados,
    };
  }

  const servidor = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        matricula,
        nome: parsed.data.nome,
        email: parsed.data.email || null,
        tipo: "SERVIDOR",
        ativo: parsed.data.ativo,
      },
    });

    const novoServidor = await tx.servidor.create({
      data: {
        usuarioId: usuario.id,
        orgaoId: parsed.data.orgaoId,
        matricula,
        nomeFuncional: parsed.data.nomeFuncional || null,
        vinculo: parsed.data.vinculo,
        ativo: parsed.data.ativo,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Servidor",
        entidadeId: novoServidor.id,
        acao: "SERVIDOR_CRIADO",
        dadosDepois: {
          servidor: {
            id: novoServidor.id,
            matricula: novoServidor.matricula,
            orgaoId: novoServidor.orgaoId,
            vinculo: novoServidor.vinculo,
            ativo: novoServidor.ativo,
          },
          usuario: {
            id: usuario.id,
            matricula: usuario.matricula,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo,
            ativo: usuario.ativo,
          },
        },
      },
    });

    return novoServidor;
  });

  revalidatePath("/servidores");
  revalidatePath(`/servidores/${servidor.id}`);

  redirect(`/servidores/${servidor.id}`);
}