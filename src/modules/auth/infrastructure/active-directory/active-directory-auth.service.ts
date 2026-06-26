import { createClient, type Client } from "ldapjs";

import { obterConfiguracaoLdapActiveDirectory } from "@/modules/integracoes/application/services/ldap-active-directory-config.service";

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

function escaparFiltroLdap(valor: string) {
  return valor.replace(/[\\*()\0]/g, (caractere) => {
    const mapa: Record<string, string> = {
      "\\": "\\5c",
      "*": "\\2a",
      "(": "\\28",
      ")": "\\29",
      "\0": "\\00",
    };

    return mapa[caractere] ?? caractere;
  });
}

function montarIdentificadorUsuario(params: {
  matricula: string;
  dominio: string;
  userDnPattern: string;
}) {
  const matricula = params.matricula.trim();

  if (params.userDnPattern) {
    return params.userDnPattern.replaceAll("{{matricula}}", matricula);
  }

  if (!params.dominio) {
    return matricula;
  }

  if (params.dominio.includes(".")) {
    return `${matricula}@${params.dominio}`;
  }

  return `${params.dominio}\\${matricula}`;
}

function bindAsync(client: Client, dn: string, senha: string) {
  return new Promise<void>((resolve, reject) => {
    client.bind(dn, senha, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function unbindAsync(client: Client) {
  return new Promise<void>((resolve) => {
    client.unbind(() => resolve());
  });
}

function buscarDnUsuario(params: {
  client: Client;
  baseDn: string;
  searchFilter: string;
  matricula: string;
}) {
  const filtro = (params.searchFilter || "(sAMAccountName={{matricula}})")
    .replaceAll("{{matricula}}", escaparFiltroLdap(params.matricula))
    .replaceAll("{{matriculaLower}}", escaparFiltroLdap(params.matricula.toLowerCase()))
    .replaceAll("{{matriculaUpper}}", escaparFiltroLdap(params.matricula.toUpperCase()));

  return new Promise<string | null>((resolve, reject) => {
    let dn: string | null = null;

    params.client.search(
      params.baseDn,
      {
        scope: "sub",
        filter: filtro,
        sizeLimit: 1,
        attributes: ["dn"],
      },
      (error, response) => {
        if (error) {
          reject(error);
          return;
        }

        response.on("searchEntry", (entry) => {
          dn = entry.pojo.objectName;
        });
        response.on("error", reject);
        response.on("end", () => resolve(dn));
      },
    );
  });
}

async function autenticarViaApiHttp(params: {
  matricula: string;
  senha: string;
  url: string;
  timeoutMs: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs);

  try {
    const response = await fetch(params.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: params.matricula.toLowerCase(),
        password: params.senha,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const body: unknown = await response.json();
    return respostaAutenticada(body, params.matricula);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function autenticarViaLdapBind(params: {
  matricula: string;
  senha: string;
  ldapUrl: string;
  baseDn: string;
  dominio: string;
  bindDn: string;
  bindPassword: string;
  userDnPattern: string;
  searchFilter: string;
  timeoutMs: number;
}) {
  if (!params.ldapUrl) {
    return false;
  }

  const client = createClient({
    url: params.ldapUrl,
    timeout: params.timeoutMs,
    connectTimeout: params.timeoutMs,
  });

  try {
    let userDn = montarIdentificadorUsuario({
      matricula: params.matricula,
      dominio: params.dominio,
      userDnPattern: params.userDnPattern,
    });

    if (params.bindDn && params.baseDn) {
      await bindAsync(client, params.bindDn, params.bindPassword);
      const dnEncontrado = await buscarDnUsuario({
        client,
        baseDn: params.baseDn,
        searchFilter: params.searchFilter,
        matricula: params.matricula,
      });

      if (!dnEncontrado) {
        return false;
      }

      await unbindAsync(client);
      userDn = dnEncontrado;
    }

    const authClient = createClient({
      url: params.ldapUrl,
      timeout: params.timeoutMs,
      connectTimeout: params.timeoutMs,
    });

    try {
      await bindAsync(authClient, userDn, params.senha);
      return true;
    } finally {
      await unbindAsync(authClient);
    }
  } catch {
    return false;
  } finally {
    await unbindAsync(client);
  }
}

export async function autenticarNoActiveDirectory(
  matricula: string,
  senha: string,
  orgaoId?: string | null,
): Promise<boolean> {
  if (!matricula || !senha) {
    return false;
  }

  const configuracao = await obterConfiguracaoLdapActiveDirectory(orgaoId);

  if (!configuracao.ativo) {
    return false;
  }

  if (configuracao.modoAutenticacao === "LDAP_BIND") {
    return autenticarViaLdapBind({
      matricula,
      senha,
      ldapUrl: configuracao.ldapUrl,
      baseDn: configuracao.baseDn,
      dominio: configuracao.dominio,
      bindDn: configuracao.bindDn,
      bindPassword: configuracao.bindPassword,
      userDnPattern: configuracao.userDnPattern,
      searchFilter: configuracao.searchFilter,
      timeoutMs: configuracao.timeoutMs,
    });
  }

  return autenticarViaApiHttp({
    matricula,
    senha,
    url: configuracao.authUrl,
    timeoutMs: configuracao.timeoutMs,
  });
}
