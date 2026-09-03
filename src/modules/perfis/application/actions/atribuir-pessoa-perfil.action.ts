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
  perfilId: z.string().uuid("Perfil invalido."),
  usuarioIds: z
    .array(z.string().uuid("Pessoa invalida."))
    .min(1, "Selecione ao menos uma pessoa."),
});

export type AtribuirPessoaPerfilState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: {
    perfilId?: string;
    usuarioId?: string;
    usuarioIds?: string[];
  };
};

function extrairDados(formData: FormData) {
  const usuarioIds = formData
    .getAll("usuarioIds")
    .map((valor) => String(valor))
    .filter(Boolean);
  const usuarioId = String(formData.get("usuarioId") ?? "");

  return {
    perfilId: String(formData.get("perfilId") ?? ""),
    usuarioId,
    usuarioIds: usuarioIds.length ? usuarioIds : usuarioId ? [usuarioId] : [],
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
      mensagem: "Selecione uma ou mais pessoas validas.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const escopo = await resolverEscopoGestaoUsuarios(permissao);

  const [perfil, usuarios] = await Promise.all([
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
    prisma.usuario.findMany({
      where: { id: { in: parsed.data.usuarioIds } },
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
      mensagem: "Perfil nao encontrado ou inativo.",
      campos: dados,
    };
  }

  const usuariosValidos = usuarios.filter(
    (usuario) => usuario.ativo && usuario.servidor?.orgaoId,
  );

  if (usuariosValidos.length !== parsed.data.usuarioIds.length) {
    return {
      sucesso: false,
      mensagem: "Uma ou mais pessoas nao foram encontradas ou estao inativas.",
      campos: dados,
    };
  }

  if (
    perfil.codigo.toUpperCase() === "MASTER" &&
    !escopo.permitirEscopoGlobal
  ) {
    return {
      sucesso: false,
      mensagem: "Apenas o perfil ativo MASTER pode atribuir o perfil MASTER.",
      campos: dados,
    };
  }

  if (
    !escopo.permitirEscopoGlobal &&
    usuariosValidos.some(
      (usuario) =>
        !usuario.servidor?.orgaoId ||
        !orgaoEstaNoEscopoGestaoUsuarios(usuario.servidor.orgaoId, escopo),
    )
  ) {
    return {
      sucesso: false,
      mensagem: "Uma ou mais pessoas estao fora do escopo do seu perfil ativo.",
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

  if (
    perfil.orgaoId &&
    usuariosValidos.some(
      (usuario) => perfil.orgaoId !== usuario.servidor?.orgaoId,
    )
  ) {
    return {
      sucesso: false,
      mensagem: `Este perfil pertence a seccional ${perfil.orgao?.sigla ?? "informada"}. Selecione apenas pessoas dessa seccional.`,
      campos: dados,
    };
  }

  await prisma.$transaction(async (tx) => {
    for (const usuario of usuariosValidos) {
      const orgaoId =
        perfil.codigo.toUpperCase() === "MASTER"
          ? null
          : (perfil.orgaoId ?? usuario.servidor?.orgaoId ?? null);
      const vinculoExistente = await tx.usuarioPerfil.findFirst({
        where: {
          usuarioId: usuario.id,
          perfilId: perfil.id,
          orgaoId,
        },
        select: { id: true },
      });

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
    }
  });

  revalidatePath(`/perfis/${perfil.id}`);
  for (const usuario of usuariosValidos) {
    revalidatePath(`/usuarios/${usuario.id}`);
  }
  revalidatePath("/usuarios");
  revalidatePath("/", "layout");
  await Promise.all(
    usuariosValidos.map((usuario) =>
      invalidarCacheUsuarioAuthPorId(usuario.id),
    ),
  );

  return {
    sucesso: true,
    mensagem: `Perfil atribuido a ${usuariosValidos.length} pessoa(s) com sucesso.`,
  };
}
