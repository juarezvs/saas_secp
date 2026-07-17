import bcrypt from "bcryptjs";
import type { UsuarioAutenticado } from "../../domain/entities/usuario-autenticado";
import { autenticarNoActiveDirectory } from "../../infrastructure/active-directory/active-directory-auth.service";
import { buscarUsuarioParaLoginPorMatricula } from "../../infrastructure/repositories/usuario-auth.repository";

type AutenticarUsuarioParams = {
  matricula: string;
  senha: string;
};

export async function autenticarUsuarioPorCredenciais({
  matricula,
  senha,
}: AutenticarUsuarioParams): Promise<UsuarioAutenticado | null> {
  const matriculaNormalizada = matricula.trim().toUpperCase();
  const usuario =
    await buscarUsuarioParaLoginPorMatricula(matriculaNormalizada);

  if (!usuario || usuario.perfis.length === 0) {
    return null;
  }

  const senhaLocalPrimeiro =
    process.env.AUTH_LOCAL_PASSWORD_FIRST === "true" &&
    Boolean(usuario.senhaHash) &&
    (await bcrypt.compare(senha, usuario.senhaHash ?? ""));

  if (senhaLocalPrimeiro) {
    return {
      id: usuario.id,
      matricula: usuario.matricula,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
      preferenciasAcessibilidade: usuario.preferenciasAcessibilidade,
      perfis: usuario.perfis,
      perfilAtivo: usuario.perfilAtivo,
    };
  }

  const senhaAdValida = await autenticarNoActiveDirectory(
    usuario.matricula,
    senha,
    usuario.orgaoId,
  );
  const senhaLocalValida =
    !senhaAdValida &&
    Boolean(usuario.senhaHash) &&
    (await bcrypt.compare(senha, usuario.senhaHash ?? ""));

  if (!senhaAdValida && !senhaLocalValida) {
    return null;
  }

  return {
    id: usuario.id,
    matricula: usuario.matricula,
    nome: usuario.nome,
    email: usuario.email,
    tipo: usuario.tipo,
    preferenciasAcessibilidade: usuario.preferenciasAcessibilidade,
    perfis: usuario.perfis,
    perfilAtivo: usuario.perfilAtivo,
  };
}
