import { SarhOracleClient } from "@/modules/integracoes/sarh/infrastructure/oracle/sarh-oracle-client";
import { obterConfiguracaoSarhOracle } from "@/modules/integracoes/sarh/application/services/sarh-oracle-config.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

type FotoServidor = {
  buffer: Buffer;
  contentType: string;
};

const fotoServidorCache = new Map<string, Promise<FotoServidor | null>>();

export function normalizarCpfFoto(cpf: string | null | undefined) {
  if (!cpf) return null;

  const normalizado = cpf.replace(/\D/g, "").padStart(11, "0").slice(-11);

  return normalizado.length === 11 ? normalizado : null;
}

export function detectarContentTypeFoto(foto: Buffer) {
  if (
    foto.length >= 3 &&
    foto[0] === 0xff &&
    foto[1] === 0xd8 &&
    foto[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    foto.length >= 8 &&
    foto[0] === 0x89 &&
    foto[1] === 0x50 &&
    foto[2] === 0x4e &&
    foto[3] === 0x47
  ) {
    return "image/png";
  }

  if (foto.length >= 4 && foto.subarray(0, 4).toString("ascii") === "GIF8") {
    return "image/gif";
  }

  if (foto.length >= 12 && foto.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }

  return "application/octet-stream";
}

export async function buscarFotoServidorSarh(
  cpf: string | null | undefined,
): Promise<FotoServidor | null> {
  const cpfNormalizado = normalizarCpfFoto(cpf);

  if (!cpfNormalizado) return null;

  const servidor = await prisma.servidor.findFirst({
    where: { cpf: cpfNormalizado },
    select: { orgaoId: true },
  });
  const orgaoId = servidor?.orgaoId ?? null;
  const cacheKey = `${orgaoId ?? "global"}:${cpfNormalizado}`;
  const existente = fotoServidorCache.get(cacheKey);

  if (existente) {
    return existente;
  }

  const config = await obterConfiguracaoSarhOracle(orgaoId);
  const promessa = new SarhOracleClient({
    username: config.username,
    password: config.password,
    connectString: config.connectString,
    oracleHome: config.oracleHome,
    siglaLocalidade: config.siglaLocalidade,
  })
    .buscarFotoServidor(cpfNormalizado)
    .then((buffer) =>
      buffer
        ? {
            buffer,
            contentType: detectarContentTypeFoto(buffer),
          }
        : null,
    )
    .catch((error) => {
      fotoServidorCache.delete(cacheKey);
      console.warn(
        `Nao foi possivel buscar a foto do servidor no SARH: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    });

  fotoServidorCache.set(cacheKey, promessa);

  return promessa;
}

export async function buscarFotoServidorDataUrl(
  cpf: string | null | undefined,
) {
  const foto = await buscarFotoServidorSarh(cpf);

  if (!foto) return null;

  return `data:${foto.contentType};base64,${foto.buffer.toString("base64")}`;
}

export async function buscarFotosServidoresDataUrl(
  cpfs: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const cpfsNormalizados = Array.from(
    new Set(cpfs.map(normalizarCpfFoto)),
  ).filter((cpf): cpf is string => Boolean(cpf));
  const pares = await Promise.all(
    cpfsNormalizados.map(async (cpf): Promise<[string, string | null]> => [
      cpf,
      await buscarFotoServidorDataUrl(cpf),
    ]),
  );

  return new Map(
    pares.filter((par): par is [string, string] => Boolean(par[1])),
  );
}
