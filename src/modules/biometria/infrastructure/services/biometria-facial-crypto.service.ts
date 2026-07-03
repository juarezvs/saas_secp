import crypto from "node:crypto";

type TemplateCriptografado = {
  conteudo: string;
  iv: string;
  tag: string;
  hash: string;
};

function obterChaveCriptografia() {
  const valor = process.env.BIOMETRIA_FACIAL_ENCRYPTION_KEY?.trim();

  if (!valor) {
    throw new Error("BIOMETRIA_FACIAL_ENCRYPTION_KEY não configurada.");
  }

  const candidatas = [
    Buffer.from(valor, "base64"),
    Buffer.from(valor, "hex"),
    Buffer.from(valor, "utf8"),
  ];
  const chave = candidatas.find((item) => item.length === 32);

  if (!chave) {
    throw new Error(
      "BIOMETRIA_FACIAL_ENCRYPTION_KEY deve representar exatamente 32 bytes.",
    );
  }

  return chave;
}

function obterPepper() {
  const pepper = process.env.BIOMETRIA_FACIAL_TEMPLATE_PEPPER?.trim();

  if (!pepper) {
    throw new Error("BIOMETRIA_FACIAL_TEMPLATE_PEPPER não configurado.");
  }

  return pepper;
}

export function hashTemplateFacial(template: number[]) {
  return crypto
    .createHmac("sha256", obterPepper())
    .update(JSON.stringify(template))
    .digest("hex");
}

export function criptografarTemplateFacial(
  template: number[],
): TemplateCriptografado {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", obterChaveCriptografia(), iv);
  const conteudo = Buffer.concat([
    cipher.update(JSON.stringify(template), "utf8"),
    cipher.final(),
  ]);

  return {
    conteudo: conteudo.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    hash: hashTemplateFacial(template),
  };
}

export function descriptografarTemplateFacial(params: {
  conteudo: string;
  iv: string;
  tag: string;
}) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    obterChaveCriptografia(),
    Buffer.from(params.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(params.tag, "base64"));

  const texto = Buffer.concat([
    decipher.update(Buffer.from(params.conteudo, "base64")),
    decipher.final(),
  ]).toString("utf8");
  const template = JSON.parse(texto) as unknown;

  if (
    !Array.isArray(template) ||
    template.length === 0 ||
    template.some((item) => typeof item !== "number" || !Number.isFinite(item))
  ) {
    throw new Error("Template facial criptografado inválido.");
  }

  return template;
}
