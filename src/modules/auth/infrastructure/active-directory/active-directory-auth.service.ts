const AD_AUTH_TIMEOUT_MS = 5000;
const AD_AUTH_URL_PADRAO =
  "http://login.ad.integracao.am.trf1.gov.br/auth/login";

type ActiveDirectoryLoginResponse = {
  username?: unknown;
  token?: unknown;
};

function respostaAutenticada(
  valor: unknown,
  matricula: string,
): valor is ActiveDirectoryLoginResponse {
  if (!valor || typeof valor !== "object") {
    return false;
  }

  const resposta = valor as ActiveDirectoryLoginResponse;

  return (
    typeof resposta.username === "string" &&
    resposta.username.toUpperCase() === matricula.toUpperCase() &&
    typeof resposta.token === "string" &&
    resposta.token.length > 0
  );
}

export async function autenticarNoActiveDirectory(
  matricula: string,
  senha: string,
): Promise<boolean> {
  const url = process.env.AD_AUTH_URL?.trim() || AD_AUTH_URL_PADRAO;

  if (!matricula || !senha) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AD_AUTH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: matricula.toLowerCase(),
        password: senha,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const body: unknown = await response.json();
    return respostaAutenticada(body, matricula);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
