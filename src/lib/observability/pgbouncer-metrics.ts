import { Client } from "pg";

import { obterObservabilidade } from "./metrics";

type PoolRow = {
  database?: string;
  user?: string;
  cl_active?: string | number;
  cl_waiting?: string | number;
  sv_active?: string | number;
  sv_idle?: string | number;
  sv_used?: string | number;
  sv_tested?: string | number;
  sv_login?: string | number;
  maxwait?: string | number;
  maxwait_us?: string | number;
};

function pgbouncerUrl() {
  const explicit = process.env.PGBOUNCER_METRICS_URL;
  if (explicit) return explicit;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  try {
    const url = new URL(databaseUrl);
    url.pathname = "/pgbouncer";
    url.search = "";
    return url.toString();
  } catch {
    return null;
  }
}

function asNumber(value: string | number | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function coletarMetricasPgbouncer(timeoutMs = 1000) {
  const observabilidade = obterObservabilidade();
  const url = pgbouncerUrl();

  observabilidade.pgbouncerPoolClients.reset();
  observabilidade.pgbouncerPoolServers.reset();
  observabilidade.pgbouncerPoolWaitSeconds.reset();

  if (!url) {
    observabilidade.pgbouncerHealthy.set(0);
    return;
  }

  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: timeoutMs,
    query_timeout: timeoutMs,
  });

  try {
    await client.connect();
    const result = await client.query<PoolRow>("SHOW POOLS");

    for (const row of result.rows) {
      const database = row.database ?? "unknown";
      const user = row.user ?? "unknown";

      observabilidade.pgbouncerPoolClients.set(
        { database, user, state: "active" },
        asNumber(row.cl_active),
      );
      observabilidade.pgbouncerPoolClients.set(
        { database, user, state: "waiting" },
        asNumber(row.cl_waiting),
      );
      observabilidade.pgbouncerPoolServers.set(
        { database, user, state: "active" },
        asNumber(row.sv_active),
      );
      observabilidade.pgbouncerPoolServers.set(
        { database, user, state: "idle" },
        asNumber(row.sv_idle),
      );
      observabilidade.pgbouncerPoolServers.set(
        { database, user, state: "used" },
        asNumber(row.sv_used),
      );
      observabilidade.pgbouncerPoolServers.set(
        { database, user, state: "tested" },
        asNumber(row.sv_tested),
      );
      observabilidade.pgbouncerPoolServers.set(
        { database, user, state: "login" },
        asNumber(row.sv_login),
      );
      observabilidade.pgbouncerPoolWaitSeconds.set(
        { database, user },
        asNumber(row.maxwait) + asNumber(row.maxwait_us) / 1_000_000,
      );
    }

    observabilidade.pgbouncerHealthy.set(1);
  } catch {
    observabilidade.pgbouncerHealthy.set(0);
  } finally {
    await client.end().catch(() => undefined);
  }
}
