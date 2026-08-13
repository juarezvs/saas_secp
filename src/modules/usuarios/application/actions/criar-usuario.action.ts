"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import type { EscopoGestaoUsuarios } from "../services/escopo-gestao-usuarios.service";
import {
  orgaoPodeSerVinculadoNoEscopoGestaoUsuarios,
  resolverEscopoGestaoUsuarios,
} from "../services/escopo-gestao-usuarios.service";
import {
  usuarioSchema,
  type UsuarioFormState,
} from "../schemas/usuario.schema";
import {
  emailUsuarioExiste,
  matriculaUsuarioExiste,
} from "../../infrastructure/repositories/usuario.repository";

function extrairDadosUsuario(formData: FormData) {
  const perfis = formData.getAll("perfis").map(String);
  const perfisEscopos = Object.fromEntries(
    perfis.map((perfilId) => [
      perfilId,
      String(formData.get(`perfilOrgao:${perfilId}`) ?? "").trim(),
    ]),
  );

  return {
    matricula: String(formData.get("matricula") ?? "").trim(),
    nome: String(formData.get("nome") ?? "").trim(),
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    tipo: String(formData.get("tipo") ?? ""),
    senha: String(formData.get("senha") ?? "").trim(),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
    perfis,
    perfisEscopos,
  };
}

async function normalizarEscoposPerfis(
  perfis: string[],
  perfisEscopos: Record<string, string>,
  escopoGestaoUsuarios: EscopoGestaoUsuarios,
) {
  const perfisSelecionados = await prisma.perfil.findMany({
    where: { id: { in: perfis } },
    select: { id: true, codigo: true, nome: true },
  });
  const escoposNormalizados = new Map<string, string | null>();

  for (const perfil of perfisSelecionados) {
    if (
      !escopoGestaoUsuarios.permitirEscopoGlobal &&
      perfil.codigo === "MASTER"
    ) {
      return {
        erro: "Apenas o perfil ativo MASTER pode atribuir o perfil MASTER.",
        escopos: escoposNormalizados,
      };
    }

    if (perfil.codigo === "MASTER") {
      escoposNormalizados.set(perfil.id, null);
      continue;
    }

    if (!perfisEscopos[perfil.id]) {
      return {
        erro: `Selecione a seccional para o perfil ${perfil.nome}.`,
        escopos: escoposNormalizados,
      };
    }

    if (
      !orgaoPodeSerVinculadoNoEscopoGestaoUsuarios(
        perfisEscopos[perfil.id],
        escopoGestaoUsuarios,
      )
    ) {
      return {
        erro: `Selecione uma seccional permitida para o perfil ${perfil.nome}.`,
        escopos: escoposNormalizados,
      };
    }

    escoposNormalizados.set(perfil.id, perfisEscopos[perfil.id]);
  }

  return { erro: null, escopos: escoposNormalizados };
}

export async function criarUsuarioAction(
  _estadoAnterior: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "usuarios:gerenciar:global",
  );

  const dados = extrairDadosUsuario(formData);

  const parsed = usuarioSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do formulário.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  if (await matriculaUsuarioExiste(parsed.data.matricula)) {
    return {
      sucesso: false,
      mensagem: "Já existe um usuário com esta matrícula/login.",
      erros: {
        matricula: ["Já existe um usuário com esta matrícula/login."],
      },
      campos: dados,
    };
  }

  if (parsed.data.email && (await emailUsuarioExiste(parsed.data.email))) {
    return {
      sucesso: false,
      mensagem: "Já existe um usuário com este e-mail.",
      erros: {
        email: ["Já existe um usuário com este e-mail."],
      },
      campos: dados,
    };
  }

  const escopoGestaoUsuarios = await resolverEscopoGestaoUsuarios(permissao);
  const escoposPerfis = await normalizarEscoposPerfis(
    parsed.data.perfis,
    dados.perfisEscopos,
    escopoGestaoUsuarios,
  );

  if (escoposPerfis.erro) {
    return {
      sucesso: false,
      mensagem: escoposPerfis.erro,
      campos: dados,
    };
  }

  const senhaHash = parsed.data.senha
    ? await bcrypt.hash(parsed.data.senha, 12)
    : null;

  const usuario = await prisma.$transaction(async (tx) => {
    const novoUsuario = await tx.usuario.create({
      data: {
        matricula: parsed.data.matricula,
        nome: parsed.data.nome,
        email: parsed.data.email || null,
        tipo: parsed.data.tipo,
        senhaHash,
        ativo: parsed.data.ativo,
      },
    });

    if (parsed.data.perfis.length > 0) {
      await tx.usuarioPerfil.createMany({
        data: parsed.data.perfis.map((perfilId) => ({
          usuarioId: novoUsuario.id,
          perfilId,
          orgaoId: escoposPerfis.escopos.get(perfilId) ?? null,
          ativo: true,
        })),
        skipDuplicates: true,
      });
    }

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Usuario",
        entidadeId: novoUsuario.id,
        acao: "USUARIO_CRIADO",
        dadosDepois: {
          id: novoUsuario.id,
          matricula: novoUsuario.matricula,
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          tipo: novoUsuario.tipo,
          ativo: novoUsuario.ativo,
          perfis: parsed.data.perfis,
          senhaLocalDefinida: Boolean(senhaHash),
        },
      },
    });

    return novoUsuario;
  });

  revalidatePath("/usuarios");
  redirect(`/usuarios/${usuario.id}`);
}
