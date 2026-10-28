import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";
import { obterRedisCacheClient } from "@/lib/cache/redis-cache";
import { withHttpMetrics } from "@/lib/observability/http";
import {
  DiscoveryError,
  discoveryContext,
  discoveryRequest,
  requireDiscoveryOrganization,
} from "@/modules/descoberta/application/gateway";
import {
  annotateRegistrations,
  registerDiscoveredDevice,
  testDiscoveryDevice,
} from "@/modules/descoberta/application/equipment";
import {
  DISCOVERY_PROTOCOLS,
  type DiscoveryAgent,
  type DiscoveryDetail,
  type DiscoveryDevice,
  type DiscoveryJob,
  type DiscoveryNetwork,
} from "@/modules/descoberta/domain/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uuid = z.string().uuid();
const driver = z.object({
  protocolo: z.enum(DISCOVERY_PROTOCOLS),
  porta: z.number().int().min(1).max(65535),
  usuario: z.string().max(100).optional(),
  senha: z.string().max(200).optional(),
});
const register = driver.extend({
  nome: z.string().trim().min(3).max(160),
  unidadeId: uuid.optional(),
  localizacao: z.string().max(200).optional(),
  aceitarIdentificacaoProvavel: z.boolean().optional(),
});
const command = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("network-create"),
      orgaoId: uuid,
      unidadeId: uuid.optional(),
      name: z.string().min(2).max(100),
      cidr: z.string().max(48),
      methods: z.array(z.string()).min(1).max(7),
      ports: z.array(z.number().int()).min(1).max(8),
      concurrency: z.number().int().min(1).max(24),
      rate: z.number().int().min(1).max(20),
      timeout: z.number().min(0.2).max(5),
      maxHosts: z.number().int().min(1).max(1024),
      windowStart: z.number().int().min(0).max(23).nullable().optional(),
      windowEnd: z.number().int().min(0).max(23).nullable().optional(),
    })
    .strict(),
  z.object({ action: z.literal("network-disable"), id: uuid }).strict(),
  z
    .object({
      action: z.literal("agent-enroll"),
      orgaoId: uuid,
      unidadeId: uuid.optional(),
      name: z.string().min(2).max(100),
      networkIds: z.array(uuid).min(1).max(32),
    })
    .strict(),
  z
    .object({
      action: z.literal("agent-configure"),
      id: uuid,
      orgaoId: uuid,
      unidadeId: uuid.optional(),
      name: z.string().min(2).max(100),
      networkIds: z.array(uuid).min(1).max(32),
    })
    .strict(),
  z
    .object({
      action: z.enum(["agent-approve", "agent-revoke", "agent-rotate"]),
      id: uuid,
    })
    .strict(),
  z
    .object({
      action: z.literal("job-create"),
      orgaoId: uuid,
      unidadeId: uuid.optional(),
      agentId: uuid.optional(),
      networkId: uuid.optional(),
      target: z.string().max(48).optional(),
      idempotencyKey: uuid,
    })
    .strict(),
  z.object({ action: z.literal("job-cancel"), id: uuid }).strict(),
  z.object({ action: z.literal("identify"), id: uuid }).strict(),
  z.object({ action: z.literal("test"), id: uuid, ...driver.shape }).strict(),
  z
    .object({
      action: z.literal("register"),
      ids: z.array(uuid).min(1).max(20),
      ...register.shape,
    })
    .strict(),
]);

function fail(error: unknown) {
  if (error instanceof DiscoveryError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  if (error instanceof z.ZodError)
    return NextResponse.json(
      {
        error: "Verifique os campos informados.",
        fields: error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 422 },
    );
  console.error("[discovery] Operação recusada", {
    errorType: error instanceof Error ? error.name : "unknown",
  });
  return NextResponse.json(
    { error: "Não foi possível concluir a operação de descoberta." },
    { status: 503 },
  );
}

async function get(request: NextRequest) {
  try {
    const context = await discoveryContext();
    const params = request.nextUrl.searchParams;
    const resource = params.get("resource") ?? "snapshot";
    const orgaoId = params.get("orgaoId")
      ? uuid.parse(params.get("orgaoId"))
      : undefined;
    if (orgaoId) await requireDiscoveryOrganization(context, orgaoId);
    const suffix = orgaoId ? `?orgao_id=${orgaoId}` : "";
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(100000)
      .parse(params.get("offset") ?? 0);
    const jobsOffset = z.coerce
      .number()
      .int()
      .min(0)
      .max(100000)
      .parse(params.get("jobsOffset") ?? 0);
    const jobId = params.get("jobId")
      ? uuid.parse(params.get("jobId"))
      : undefined;
    if (resource === "unit-options") {
      if (!orgaoId) return NextResponse.json({ options: [] });
      const q = (params.get("q") ?? "").slice(0, 100);
      const rows = await prismaListagem.unidadeOrganizacional.findMany({
        where: {
          orgaoId,
          OR: [
            { sigla: { contains: q, mode: "insensitive" } },
            { nome: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, sigla: true, nome: true },
        orderBy: { sigla: "asc" },
        take: 40,
      });
      return NextResponse.json({
        options: [
          { value: "", label: "Toda a seccional" },
          ...rows.map((r) => ({
            value: r.id,
            label: `${r.sigla} — ${r.nome}`,
          })),
        ],
      });
    }
    if (resource === "detail") {
      const detail = await discoveryRequest<DiscoveryDetail>(
        context,
        `/api/v1/devices/${uuid.parse(params.get("id"))}`,
      );
      const [annotated] = await annotateRegistrations([detail], context);
      return NextResponse.json({
        ...detail,
        registration: annotated.registration,
      });
    }
    if (resource === "agent")
      return NextResponse.json(
        await discoveryRequest(
          context,
          `/api/v1/agents/${uuid.parse(params.get("id"))}`,
        ),
      );
    if (resource === "audit")
      return NextResponse.json(
        await discoveryRequest(context, `/api/v1/audit?offset=${offset}`),
      );
    if (resource !== "snapshot")
      throw new DiscoveryError("Recurso desconhecido.", 400);
    const query = new URLSearchParams({ offset: String(offset), limit: "50" });
    if (orgaoId) query.set("orgao_id", orgaoId);
    if (jobId) query.set("job_id", jobId);
    const [agents, networks, jobs, devices] = await Promise.all([
      discoveryRequest<{ items: DiscoveryAgent[] }>(
        context,
        "/api/v1/agents" + suffix,
      ),
      discoveryRequest<{ items: DiscoveryNetwork[] }>(
        context,
        "/api/v1/networks" + suffix,
      ),
      discoveryRequest<{ items: DiscoveryJob[]; total: number }>(
        context,
        "/api/v1/jobs" +
          (suffix || "?") +
          (suffix ? "&" : "") +
          `limit=50&offset=${jobsOffset}`,
      ),
      discoveryRequest<{ items: DiscoveryDevice[]; total: number }>(
        context,
        "/api/v1/devices?" + query,
      ),
    ]);
    return NextResponse.json(
      {
        agents: agents.items,
        networks: networks.items,
        jobs: jobs.items,
        jobsTotal: jobs.total,
        units: context.units,
        devices: await annotateRegistrations(devices.items, context),
        devicesTotal: devices.total,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}

async function post(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    const allowed = new Set([
      request.nextUrl.origin,
      ...(process.env.AUTH_URL ? [new URL(process.env.AUTH_URL).origin] : []),
    ]);
    if (!origin || !allowed.has(origin))
      throw new DiscoveryError("Origem da requisição não autorizada.", 403);
    const context = await discoveryContext(true);
    if (Number(request.headers.get("content-length") ?? 0) > 65536)
      throw new DiscoveryError("Requisição muito grande.", 413);
    // Limite efetivo também para requisições sem Content-Length ou com transferência em chunks.
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 65536) {
          await reader.cancel();
          throw new DiscoveryError("Requisição muito grande.", 413);
        }
        chunks.push(value);
      }
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new DiscoveryError("Corpo JSON inválido.", 400);
    }
    const data = command.parse(parsed);
    let result: unknown;
    let orgaoAudit = "";
    if ("orgaoId" in data) {
      await requireDiscoveryOrganization(context, data.orgaoId, data.unidadeId);
      orgaoAudit = data.orgaoId;
    }
    switch (data.action) {
      case "network-create":
        result = await discoveryRequest(context, "/api/v1/networks", "POST", {
          orgao_id: data.orgaoId,
          unidade_id: data.unidadeId ?? null,
          name: data.name,
          cidr: data.cidr,
          methods: data.methods,
          ports: data.ports,
          concurrency: data.concurrency,
          rate: data.rate,
          timeout: data.timeout,
          max_hosts: data.maxHosts,
          window_start_utc: data.windowStart ?? null,
          window_end_utc: data.windowEnd ?? null,
        });
        break;
      case "network-disable":
        result = await discoveryRequest(
          context,
          `/api/v1/networks/${data.id}/disable`,
          "POST",
        );
        break;
      case "agent-enroll":
        result = await discoveryRequest(
          context,
          "/api/v1/agents/enrollments",
          "POST",
          {
            orgao_id: data.orgaoId,
            unidade_id: data.unidadeId ?? null,
            name: data.name,
            network_ids: data.networkIds,
          },
        );
        break;
      case "agent-configure":
        result = await discoveryRequest(
          context,
          `/api/v1/agents/${data.id}/networks`,
          "POST",
          {
            orgao_id: data.orgaoId,
            unidade_id: data.unidadeId ?? null,
            name: data.name,
            network_ids: data.networkIds,
          },
        );
        break;
      case "agent-approve":
      case "agent-revoke":
      case "agent-rotate":
        result = await discoveryRequest(
          context,
          `/api/v1/agents/${data.id}/${data.action.slice(6)}`,
          "POST",
        );
        break;
      case "job-create":
        result = await discoveryRequest(context, "/api/v1/jobs", "POST", {
          orgao_id: data.orgaoId,
          unidade_id: data.unidadeId ?? null,
          network_id: data.networkId ?? null,
          agent_id: data.agentId ?? null,
          target: data.target || null,
          idempotency_key: data.idempotencyKey,
        });
        break;
      case "job-cancel":
        result = await discoveryRequest(
          context,
          `/api/v1/jobs/${data.id}/cancel`,
          "POST",
        );
        break;
      case "identify": {
        const detail = await discoveryRequest<DiscoveryDetail>(
          context,
          `/api/v1/devices/${data.id}`,
        );
        await requireDiscoveryOrganization(
          context,
          detail.orgao_id,
          detail.job.unidade_id,
        );
        result = await discoveryRequest(context, "/api/v1/jobs", "POST", {
          orgao_id: detail.orgao_id,
          unidade_id: detail.job.unidade_id,
          network_id: detail.job.network_id,
          agent_id: detail.job.agent_id,
          target: detail.ip,
          idempotency_key: randomUUID(),
        });
        break;
      }
      case "test":
        result = await testDiscoveryDevice(
          await discoveryRequest<DiscoveryDetail>(
            context,
            `/api/v1/devices/${data.id}`,
          ),
          context,
          data,
        );
        break;
      case "register": {
        const redis = obterRedisCacheClient();
        const token = randomUUID();
        const key = "secp:discovery:registration-lock";
        if ((await redis.set(key, token, "PX", 60000, "NX")) !== "OK")
          throw new DiscoveryError(
            "Outro cadastro assistido está em andamento. Aguarde e consulte os resultados.",
            409,
          );
        let leaseLost = false;
        const renew = setInterval(() => {
          void redis
            .eval(
              "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('pexpire',KEYS[1],60000) end return 0",
              1,
              key,
              token,
            )
            .then((value) => {
              if (Number(value) !== 1) leaseLost = true;
            })
            .catch(() => {
              leaseLost = true;
            });
        }, 10000);
        renew.unref?.();
        try {
          const rows = [];
          for (const id of data.ids) {
            try {
              const detail = await discoveryRequest<DiscoveryDetail>(
                context,
                `/api/v1/devices/${id}`,
              );
              if (leaseLost || (await redis.get(key)) !== token)
                throw new DiscoveryError(
                  "A proteção de concorrência expirou. Consulte os resultados antes de reenviar.",
                  409,
                );
              const saved = await registerDiscoveredDevice(detail, context, {
                ...data,
                nome:
                  data.ids.length > 1
                    ? `${data.nome} — ${detail.ip}`.slice(0, 160)
                    : data.nome,
              });
              rows.push({ observationId: id, ok: true, ...saved });
            } catch (error) {
              rows.push({
                observationId: id,
                ok: false,
                error:
                  error instanceof DiscoveryError
                    ? error.message
                    : "Falha de validação ou persistência; consulte o cadastro antes de reenviar.",
              });
            }
          }
          result = { items: rows };
        } finally {
          clearInterval(renew);
          await redis
            .eval(
              "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) end return 0",
              1,
              key,
              token,
            )
            .catch(() => undefined);
        }
        break;
      }
    }
    await prisma.auditoriaEvento.create({
      data: {
        usuarioId: context.userId,
        entidade: "DescobertaEquipamentos",
        entidadeId: "id" in data ? data.id : orgaoAudit || randomUUID(),
        acao: "DESCOBERTA_" + data.action.replaceAll("-", "_").toUpperCase(),
        dadosDepois: { orgaoId: orgaoAudit || null },
      },
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return fail(error);
  }
}

export const GET = withHttpMetrics("/api/descoberta-equipamentos", get);
export const POST = withHttpMetrics("/api/descoberta-equipamentos", post);
