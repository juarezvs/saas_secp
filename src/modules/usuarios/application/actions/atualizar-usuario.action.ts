"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  usuarioAtualizacaoSchema,
  type UsuarioFormState,
} from "../schemas/usuario.schema";
import {
  buscarUsuarioPorId,
  emailUsuarioExiste,
  matriculaUsuarioExiste,
} from "../../infrastructure/repositories/usuario.repository";

function extrairDadosUsuario(formData: FormData) {
  return {
    matricula: String(formData.get("matricula") ?? "").trim(),
    nome: String(formData.get("nome") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    tipo: String(formData.get("tipo") ?? ""),
    senha: String(formData.get("senha") ?? "").trim(),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
    perfis: formData.getAll("perfis").map(String),
  };
}

export async function atualizarUsuarioAction(
  usuarioId: string,
  _estadoAnterior: UsuarioFormState,
  formData: FormData
): Promise<UsuarioFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "usuarios:gerenciar:global"
  );

  const usuarioAtual = await buscarUsuarioPorId(usuarioId);

  if (!usuarioAtual) {
    return {
      sucesso: false,
      mensagem: "Usuário não encontrado.",
    };
  }

  const dados = extrairDadosUsuario(formData);

  const parsed = usuarioAtualizacaoSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do formulário.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  if (await matriculaUsuarioExiste(parsed.data.matricula, usuarioId)) {
    return {
      sucesso: false,
      mensagem: "Já existe outro usuário com esta matrícula/login.",
      erros: {
        matricula: ["Já existe outro usuário com esta matrícula/login."],
      },
      campos: dados,
    };
  }

  if (
    parsed.data.email &&
    (await emailUsuarioExiste(parsed.data.email, usuarioId))
  ) {
    return {
      sucesso: false,
      mensagem: "Já existe outro usuário com este e-mail.",
      erros: {
        email: ["Já existe outro usuário com este e-mail."],
      },
      campos: dados,
    };
  }

  const senhaHash = parsed.data.senha
    ? await bcrypt.hash(parsed.data.senha, 12)
    : undefined;

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: {
        id: usuarioId,
      },
      data: {
        matricula: parsed.data.matricula,
        nome: parsed.data.nome,
        email: parsed.data.email || null,
        tipo: parsed.data.tipo,
        ativo: parsed.data.ativo,
        ...(senhaHash ? { senhaHash } : {}),
      },
    });

    await tx.usuarioPerfil.deleteMany({
      where: {
        usuarioId,
      },
    });

    if (parsed.data.perfis.length > 0) {
      await tx.usuarioPerfil.createMany({
        data: parsed.data.perfis.map((perfilId) => ({
          usuarioId,
          perfilId,
          ativo: true,
        })),
        skipDuplicates: true,
      });
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Usuario",
        entidadeId: usuarioId,
        acao: "USUARIO_ATUALIZADO",
        dadosAntes: {
          id: usuarioAtual.id,
          matricula: usuarioAtual.matricula,
          nome: usuarioAtual.nome,
          email: usuarioAtual.email,
          tipo: usuarioAtual.tipo,
          ativo: usuarioAtual.ativo,
          perfis: usuarioAtual.perfis.map((item) => item.perfilId),
        },
        dadosDepois: {
          id: usuarioId,
          matricula: parsed.data.matricula,
          nome: parsed.data.nome,
          email: parsed.data.email || null,
          tipo: parsed.data.tipo,
          ativo: parsed.data.ativo,
          perfis: parsed.data.perfis,
          senhaLocalAlterada: Boolean(senhaHash),
        },
      },
    });
  });

  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${usuarioId}`);

  redirect(`/usuarios/${usuarioId}`);
}