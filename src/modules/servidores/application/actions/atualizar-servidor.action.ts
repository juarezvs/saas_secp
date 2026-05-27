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
  buscarServidorPorId,
  matriculaServidorExiste,
  usuarioMatriculaExiste,
} from "../../infrastructure/repositories/servidor.repository";

function extrairDadosServidor(formData: FormData) {
  return {
    orgaoId: String(formData.get("orgaoId") ?? ""),
    matricula: String(formData.get("matricula") ?? "").trim(),
    nome: String(formData.get("nome") ?? "").trim(),
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    nomeFuncional: String(formData.get("nomeFuncional") ?? "").trim(),
    vinculo: String(formData.get("vinculo") ?? ""),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
  };
}

export async function atualizarServidorAction(
  servidorId: string,
  _estadoAnterior: ServidorFormState,
  formData: FormData,
): Promise<ServidorFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "servidores:gerenciar:global",
  );

  const servidorAtual = await buscarServidorPorId(servidorId);

  if (!servidorAtual) {
    return {
      sucesso: false,
      mensagem: "Servidor não encontrado.",
    };
  }

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

  if (await matriculaServidorExiste(matricula, servidorId)) {
    return {
      sucesso: false,
      mensagem: "Já existe outro servidor com esta matrícula.",
      erros: {
        matricula: ["Já existe outro servidor com esta matrícula."],
      },
      campos: dados,
    };
  }

  if (await usuarioMatriculaExiste(matricula, servidorAtual.usuarioId)) {
    return {
      sucesso: false,
      mensagem: "Já existe outro usuário com esta matrícula.",
      erros: {
        matricula: ["Já existe outro usuário com esta matrícula."],
      },
      campos: dados,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: {
        id: servidorAtual.usuarioId,
      },
      data: {
        matricula,
        nome: parsed.data.nome,
        email: parsed.data.email || null,
        ativo: parsed.data.ativo,
      },
    });

    await tx.servidor.update({
      where: {
        id: servidorId,
      },
      data: {
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
        entidadeId: servidorId,
        acao: "SERVIDOR_ATUALIZADO",
        dadosAntes: {
          servidor: {
            id: servidorAtual.id,
            matricula: servidorAtual.matricula,
            orgaoId: servidorAtual.orgaoId,
            vinculo: servidorAtual.vinculo,
            nomeFuncional: servidorAtual.nomeFuncional,
            ativo: servidorAtual.ativo,
          },
          usuario: {
            id: servidorAtual.usuario.id,
            matricula: servidorAtual.usuario.matricula,
            nome: servidorAtual.usuario.nome,
            email: servidorAtual.usuario.email,
            ativo: servidorAtual.usuario.ativo,
          },
        },
        dadosDepois: {
          servidor: {
            id: servidorId,
            matricula,
            orgaoId: parsed.data.orgaoId,
            vinculo: parsed.data.vinculo,
            nomeFuncional: parsed.data.nomeFuncional || null,
            ativo: parsed.data.ativo,
          },
          usuario: {
            id: servidorAtual.usuarioId,
            matricula,
            nome: parsed.data.nome,
            email: parsed.data.email || null,
            ativo: parsed.data.ativo,
          },
        },
      },
    });
  });

  revalidatePath("/servidores");
  revalidatePath(`/servidores/${servidorId}`);

  redirect(`/servidores/${servidorId}`);
}
