import crypto from "node:crypto";

const ALGORITMO = "aes-256-gcm";

function obterMaterialChave() {
  return (
    process.env.SECP_CRYPTO_KEY ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    ""
  );
}

function obterChave() {
  const material = obterMaterialChave();

  if (!material) {
    throw new Error(
      "Configure SECP_CRYPTO_KEY ou AUTH_SECRET para criptografar segredos do Teams.",
    );
  }

  if (/^[a-f0-9]{64}$/i.test(material)) {
    return Buffer.from(material, "hex");
  }

  return crypto.createHash("sha256").update(material).digest();
}

export function criptografarTeamsSecret(valor: string) {
  if (!valor) {
    return "";
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMO, obterChave(), iv);
  const criptografado = Buffer.concat([
    cipher.update(valor, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    criptografado.toString("base64url"),
  ].join(".");
}

export function descriptografarTeamsSecret(valor: string | null | undefined) {
  if (!valor) {
    return "";
  }

  const [versao, ivBase64, tagBase64, textoBase64] = valor.split(".");

  if (versao !== "v1" || !ivBase64 || !tagBase64 || !textoBase64) {
    throw new Error("Secret do Teams possui formato criptografado inválido.");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITMO,
    obterChave(),
    Buffer.from(ivBase64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagBase64, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(textoBase64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
