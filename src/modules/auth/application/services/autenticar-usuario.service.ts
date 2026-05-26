import bcrypt from "bcryptjs";
import type { UsuarioAutenticado } from "../../domain/entities/usuario-autenticado";
import { buscarUsuarioParaLoginPorMatricula } from "../../infrastructure/repositories/usuario-auth.repository";

type AutenticarUsuarioParams = {
  matricula: string;
  senha: string;
};

export async function autenticarUsuarioPorCredenciais({
  matricula,
  senha,
}: AutenticarUsuarioParams): Promise<UsuarioAutenticado | null> {
  const usuario = await buscarUsuarioParaLoginPorMatricula(matricula);

  if (!usuario || !usuario.senhaHash) {
    return null;
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);

  if (!senhaValida) {
    return null;
  }

  if (usuario.perfis.length === 0) {
    return null;
  }

  return {
    id: usuario.id,
    matricula: usuario.matricula,
    nome: usuario.nome,
    email: usuario.email,
    tipo: usuario.tipo,
    perfis: usuario.perfis,
    perfilAtivo: usuario.perfilAtivo,
  };
}