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
    where: {
      OR: [{ cpf: cpfNormalizado }, { usuario: { cpf: cpfNormalizado } }],
    },
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

  if (!cpfsNormalizados.length) {
    return new Map();
  }

  const servidores = await prisma.servidor.findMany({
    where: {
      OR: [
        { cpf: { in: cpfsNormalizados } },
        { usuario: { cpf: { in: cpfsNormalizados } } },
      ],
    },
    select: {
      cpf: true,
      orgaoId: true,
      usuario: { select: { cpf: true } },
    },
  });
  const orgaoPorCpf = new Map<string, string | null>();

  for (const servidor of servidores) {
    const cpf =
      normalizarCpfFoto(servidor.cpf) ??
      normalizarCpfFoto(servidor.usuario.cpf);

    if (cpf && !orgaoPorCpf.has(cpf)) {
      orgaoPorCpf.set(cpf, servidor.orgaoId);
    }
  }

  for (const cpf of cpfsNormalizados) {
    if (!orgaoPorCpf.has(cpf)) {
      orgaoPorCpf.set(cpf, null);
    }
  }

  const cpfsPorOrgao = new Map<string, string[]>();
  for (const [cpf, orgaoId] of orgaoPorCpf) {
    const chave = orgaoId ?? "global";
    const lista = cpfsPorOrgao.get(chave) ?? [];
    lista.push(cpf);
    cpfsPorOrgao.set(chave, lista);
  }

  const resultado = new Map<string, string>();

  for (const [orgaoId, cpfsOrgao] of cpfsPorOrgao) {
    const config = await obterConfiguracaoSarhOracle(
      orgaoId === "global" ? null : orgaoId,
    );
    const fotos = await new SarhOracleClient({
      username: config.username,
      password: config.password,
      connectString: config.connectString,
      oracleHome: config.oracleHome,
      siglaLocalidade: config.siglaLocalidade,
    }).buscarFotosServidores(cpfsOrgao);

    for (const [cpf, buffer] of fotos) {
      resultado.set(
        cpf,
        `data:${detectarContentTypeFoto(buffer)};base64,${buffer.toString(
          "base64",
        )}`,
      );
    }
  }

  return resultado;
}
