import bcryptjs from "bcryptjs";

type BcryptNativo = typeof import("bcrypt");

let bcryptNativoPromise: Promise<BcryptNativo | null> | null = null;

async function carregarBcryptNativo() {
  bcryptNativoPromise ??= import("bcrypt").catch(() => null);
  return bcryptNativoPromise;
}

export async function compararSenhaComHash(senha: string, hash: string) {
  const bcryptNativo = await carregarBcryptNativo();

  if (bcryptNativo) {
    return bcryptNativo.compare(senha, hash);
  }

  return bcryptjs.compare(senha, hash);
}

export async function gerarHashSenha(senha: string, saltOrRounds = 12) {
  const bcryptNativo = await carregarBcryptNativo();

  if (bcryptNativo) {
    return bcryptNativo.hash(senha, saltOrRounds);
  }

  return bcryptjs.hash(senha, saltOrRounds);
}
