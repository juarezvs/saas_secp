"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { invalidarCacheUsuarioAuthPorId } from "@/modules/auth/infrastructure/repositories/usuario-auth.repository";
import {
  orgaoEstaNoEscopoGestaoUsuarios,
  resolverEscopoGestaoUsuarios,
} from "@/modules/usuarios/application/services/escopo-gestao-usuarios.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

const atribuirPessoaPerfilSchema = z.object({
  perfilId: z.string().uuid("Perfil inválido."),
  usuarioId: z.string().uuid("Pessoa inválida."),
});

export type AtribuirPessoaPerfilState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: {
    perfilId?: string;
    usuarioId?: string;
  };
};

function extrairDados(formData: FormData) {
  return {
    perfilId: String(formData.get("perfilId") ?? ""),
    usuarioId: String(formData.get("usuarioId") ?? ""),
  };
}

export async function atribuirPessoaPerfilAction(
  _estadoAnterior: AtribuirPessoaPerfilState,
  formData: FormData,
): Promise<AtribuirPessoaPerfilState> {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "perfis:gerenciar:global",
    "perfis:gerenciar:seccional",
  ]);

  const dados = extrairDados(formData);
  const parsed = atribuirPessoaPerfilSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Selecione uma pessoa válida.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const escopo = await resolverEscopoGestaoUsuarios(permissao);

  const [perfil, usuario] = await Promise.all([
    prisma.perfil.findUnique({
      where: { id: parsed.data.perfilId },
      select: {
        id: true,
        codigo: true,
        nome: true,
        ativo: true,
        global: true,
        orgaoId: true,
        orgao: {
          select: {
            sigla: true,
          },
        },
      },
    }),
    prisma.usuario.findUnique({
      where: { id: parsed.data.usuarioId },
      select: {
        id: true,
        nome: true,
        ativo: true,
        servidor: {
          select: {
            orgaoId: true,
            orgao: { select: { sigla: true } },
          },
        },
      },
    }),
  ]);

  if (!perfil?.ativo) {
    return {
      sucesso: false,
      mensagem: "Perfil não encontrado ou inativo.",
      campos: dados,
    };
  }

  if (!usuario?.ativo || !usuario.servidor?.orgaoId) {
    return {
      sucesso: false,
      mensagem: "Pessoa não encontrada ou inativa.",
      campos: dados,
    };
  }

  if (perfil.codigo.toUpperCase() === "MASTER" && !escopo.permitirEscopoGlobal) {
    return {
      sucesso: false,
      mensagem: "Apenas o perfil ativo MASTER pode atribuir o perfil MASTER.",
      campos: dados,
    };
  }

  if (
    !escopo.permitirEscopoGlobal &&
    !orgaoEstaNoEscopoGestaoUsuarios(usuario.servidor.orgaoId, escopo)
  ) {
    return {
      sucesso: false,
      mensagem: "Pessoa fora do escopo do seu perfil ativo.",
      campos: dados,
    };
  }

  if (
    !escopo.permitirEscopoGlobal &&
    !perfil.global &&
    (!perfil.orgaoId ||
      !orgaoEstaNoEscopoGestaoUsuarios(perfil.orgaoId, escopo))
  ) {
    return {
      sucesso: false,
      mensagem: "Perfil fora do escopo do seu perfil ativo.",
      campos: dados,
    };
  }

  if (perfil.orgaoId && perfil.orgaoId !== usuario.servidor.orgaoId) {
    return {
      sucesso: false,
      mensagem: `Este perfil pertence à seccional ${perfil.orgao?.sigla ?? "informada"}. Selecione uma pessoa dessa seccional.`,
      campos: dados,
    };
  }

  const orgaoId =
    perfil.codigo.toUpperCase() === "MASTER"
      ? null
      : (perfil.orgaoId ?? usuario.servidor.orgaoId);

  const vinculoExistente = await prisma.usuarioPerfil.findFirst({
    where: {
      usuarioId: usuario.id,
      perfilId: perfil.id,
      orgaoId,
    },
    select: { id: true, ativo: true },
  });

  await prisma.$transaction(async (tx) => {
    if (vinculoExistente) {
      await tx.usuarioPerfil.update({
        where: { id: vinculoExistente.id },
        data: { ativo: true },
      });
    } else {
      await tx.usuarioPerfil.create({
        data: {
          usuarioId: usuario.id,
          perfilId: perfil.id,
          orgaoId,
          ativo: true,
        },
      });
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "UsuarioPerfil",
        entidadeId: usuario.id,
        acao: "PERFIL_ATRIBUIDO_A_PESSOA",
        dadosDepois: {
          usuarioId: usuario.id,
          perfilId: perfil.id,
          orgaoId,
        },
      },
    });
  });

  revalidatePath(`/perfis/${perfil.id}`);
  revalidatePath(`/usuarios/${usuario.id}`);
  revalidatePath("/usuarios");
  revalidatePath("/", "layout");
  await invalidarCacheUsuarioAuthPorId(usuario.id);

  return {
    sucesso: true,
    mensagem: `Perfil atribuído a ${usuario.nome} com sucesso.`,
  };
}
