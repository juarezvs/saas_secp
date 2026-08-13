"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { invalidarCacheUsuarioAuthPorId } from "@/modules/auth/infrastructure/repositories/usuario-auth.repository";
import {
  orgaoEstaNoEscopoGestaoUsuarios,
  resolverEscopoGestaoUsuarios,
  usuarioEstaNoEscopoGestaoUsuarios,
} from "../services/escopo-gestao-usuarios.service";
import {
  vincularPerfilUsuarioSchema,
  type VincularPerfilUsuarioFormState,
} from "../schemas/usuario.schema";
import {
  buscarUsuarioPerfil,
  buscarUsuarioPorId,
} from "../../infrastructure/repositories/usuario.repository";

function extrairDados(formData: FormData) {
  return {
    usuarioId: String(formData.get("usuarioId") ?? ""),
    perfilId: String(formData.get("perfilId") ?? ""),
    orgaoId: String(formData.get("orgaoId") ?? ""),
  };
}

export async function vincularPerfilUsuarioAction(
  _estadoAnterior: VincularPerfilUsuarioFormState,
  formData: FormData,
): Promise<VincularPerfilUsuarioFormState> {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "usuarios:gerenciar:global",
    "usuarios:gerenciar:seccional",
  ]);

  const dados = extrairDados(formData);
  const parsed = vincularPerfilUsuarioSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os dados do vínculo.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const [perfil, usuario] = await Promise.all([
    prisma.perfil.findUnique({
      where: { id: parsed.data.perfilId },
      select: { codigo: true, nome: true },
    }),
    buscarUsuarioPorId(parsed.data.usuarioId),
  ]);

  if (!perfil) {
    return {
      sucesso: false,
      mensagem: "Perfil nao encontrado.",
      campos: dados,
    };
  }

  if (!usuario) {
    return {
      sucesso: false,
      mensagem: "Usuario nao encontrado.",
      campos: dados,
    };
  }

  if (perfil.codigo !== "MASTER" && !parsed.data.orgaoId) {
    return {
      sucesso: false,
      mensagem: `Selecione a seccional para o perfil ${perfil.nome}.`,
      campos: dados,
    };
  }

  const escopoGestaoUsuarios = await resolverEscopoGestaoUsuarios(permissao);

  if (
    !escopoGestaoUsuarios.permitirEscopoGlobal &&
    perfil.codigo === "MASTER"
  ) {
    return {
      sucesso: false,
      mensagem: "Apenas o perfil ativo MASTER pode vincular o perfil MASTER.",
      campos: dados,
    };
  }

  if (
    !escopoGestaoUsuarios.permitirEscopoGlobal &&
    parsed.data.orgaoId &&
    !orgaoEstaNoEscopoGestaoUsuarios(parsed.data.orgaoId, escopoGestaoUsuarios)
  ) {
    return {
      sucesso: false,
      mensagem: "Selecione uma seccional permitida para o seu perfil ativo.",
      campos: dados,
    };
  }

  if (!usuarioEstaNoEscopoGestaoUsuarios(usuario, escopoGestaoUsuarios)) {
    return {
      sucesso: false,
      mensagem: "Usuario fora do escopo do seu perfil ativo.",
      campos: dados,
    };
  }

  const orgaoId =
    perfil.codigo === "MASTER" ? null : parsed.data.orgaoId || null;
  const vinculoExistente = await buscarUsuarioPerfil({
    usuarioId: parsed.data.usuarioId,
    perfilId: parsed.data.perfilId,
    orgaoId,
  });

  await prisma.$transaction(async (tx) => {
    if (vinculoExistente) {
      await tx.usuarioPerfil.update({
        where: {
          id: vinculoExistente.id,
        },
        data: {
          ativo: true,
        },
      });
    } else {
      await tx.usuarioPerfil.create({
        data: {
          usuarioId: parsed.data.usuarioId,
          perfilId: parsed.data.perfilId,
          orgaoId,
          ativo: true,
        },
      });
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "UsuarioPerfil",
        entidadeId: parsed.data.usuarioId,
        acao: "USUARIO_PERFIL_VINCULADO",
        dadosDepois: {
          usuarioId: parsed.data.usuarioId,
          perfilId: parsed.data.perfilId,
          orgaoId,
        },
      },
    });
  });

  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${parsed.data.usuarioId}`);
  revalidatePath("/", "layout");
  await invalidarCacheUsuarioAuthPorId(parsed.data.usuarioId);

  return {
    sucesso: true,
    mensagem: "Perfil vinculado ao usuário com sucesso.",
  };
}
