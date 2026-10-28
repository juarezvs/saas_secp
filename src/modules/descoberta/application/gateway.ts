import { randomUUID } from "node:crypto";
import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { obterPermissoesDaSessao } from "@/modules/auth/application/services/permissao.service";
import { signDiscoveryRequest } from "../domain/signature";

export class DiscoveryError extends Error {
  constructor(
    message: string,
    public status = 503,
  ) {
    super(message);
  }
}

export async function discoveryContext(write = false) {
  const permission = await obterPermissoesDaSessao();
  if (!permission.permitido || !permission.usuarioId)
    throw new DiscoveryError("Sessão expirada.", 401);
  const manage = permission.permissoes.some((p) =>
    [
      "integracoes:gerenciar:global",
      "integracoes:gerenciar:seccional",
    ].includes(p),
  );
  const read =
    manage ||
    permission.permissoes.some((p) =>
      [
        "integracoes:consultar:global",
        "integracoes:consultar:seccional",
      ].includes(p),
    );
  if (!read || (write && !manage))
    throw new DiscoveryError(
      "Permissão insuficiente para descoberta de equipamentos.",
      403,
    );
  const scope = await obterEscopoOrgaoDaSessao();
  const orgaos = await prismaListagem.orgao.findMany({
    where: scope.global ? undefined : { id: { in: scope.orgaoIds } },
    select: { id: true, sigla: true, nome: true },
    orderBy: { sigla: "asc" },
  });
  const orgaoIds = orgaos.map((o) => o.id);
  const [units, allUnits] = await Promise.all([
    prismaListagem.unidadeOrganizacional.findMany({
      where: { orgaoId: { in: orgaoIds } },
      select: { id: true, sigla: true, nome: true },
    }),
    prisma.unidadeOrganizacional.findMany({
      where: { orgaoId: { in: orgaoIds } },
      select: { id: true },
    }),
  ]);
  const activeIds = new Set(units.map((unit) => unit.id));
  const excludedUnitIds = allUnits
    .filter((unit) => !activeIds.has(unit.id))
    .map((unit) => unit.id);
  return {
    userId: permission.usuarioId,
    orgaoIds,
    orgaos,
    manage,
    units,
    excludedUnitIds,
  };
}
export type DiscoveryContext = Awaited<ReturnType<typeof discoveryContext>>;

export async function requireDiscoveryOrganization(
  context: DiscoveryContext,
  orgaoId: string,
  unidadeId?: string | null,
) {
  if (!context.orgaoIds.includes(orgaoId))
    throw new DiscoveryError("Seccional inativa ou fora do escopo.", 404);
  if (
    unidadeId &&
    !(await prismaListagem.unidadeOrganizacional.findFirst({
      where: { id: unidadeId, orgaoId },
      select: { id: true },
    }))
  )
    throw new DiscoveryError("Unidade inativa ou fora do escopo.", 404);
}

export async function discoveryRequest<T>(
  context: DiscoveryContext,
  path: string,
  method = "GET",
  payload?: unknown,
): Promise<T> {
  const endpoint = process.env.DISCOVERY_SERVICE_URL;
  const secret = process.env.DISCOVERY_GATEWAY_SECRET;
  if (!endpoint || !secret || secret.length < 32)
    throw new DiscoveryError(
      "Serviço de descoberta não configurado. O restante do SECP continua disponível.",
    );
  const url = new URL(endpoint);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        process.env.DISCOVERY_ENVIRONMENT === "development")
    )
  )
    throw new DiscoveryError(
      "Configuração segura do serviço de descoberta inválida.",
    );
  if (!path.startsWith("/api/v1/") || path.includes(".."))
    throw new DiscoveryError("Operação interna inválida.", 400);
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomUUID();
  const claims = Buffer.from(
    JSON.stringify({
      user_id: context.userId,
      orgao_ids: context.orgaoIds,
      excluded_unit_ids: context.excludedUnitIds,
      write: context.manage,
    }),
  ).toString("base64url");
  try {
    const response = await fetch(new URL(path, url), {
      method,
      body: method === "GET" ? undefined : body || "{}",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      headers: {
        "Content-Type": "application/json",
        "X-Discovery-Timestamp": timestamp,
        "X-Discovery-Nonce": nonce,
        "X-Discovery-Claims": claims,
        "X-Discovery-Signature": signDiscoveryRequest(
          secret,
          method,
          path,
          timestamp,
          nonce,
          claims,
          method === "GET" ? "" : body || "{}",
        ),
      },
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        detail?: unknown;
      };
      throw new DiscoveryError(
        typeof data.detail === "string"
          ? data.detail
          : "O serviço recusou a operação.",
        response.status,
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DiscoveryError) throw error;
    throw new DiscoveryError(
      "Serviço de descoberta indisponível. Tente novamente; as demais funções do SECP permanecem disponíveis.",
    );
  }
}
