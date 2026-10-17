import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";

// Exclusivo para banco descartável. Não aceita a URL normal do aplicativo.
const connectionString = process.env.HORAS_EXTRAS_TEST_DATABASE_URL;
if (!connectionString) throw new Error("Defina HORAS_EXTRAS_TEST_DATABASE_URL para banco PostgreSQL descartavel.");
const url = new URL(connectionString);
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !/^\/secp_he_test_[a-z0-9_]+$/.test(url.pathname)) {
  throw new Error("Permitido apenas banco local com nome secp_he_test_*. Nenhum reset sera executado.");
}
const client = new pg.Client({ connectionString });
const tempParent = await realpath(tmpdir());
const directory = await mkdtemp(path.join(tempParent, "secp-he-schema-"));
let connected = false;
let transaction = false;
try {
  const baseline = execFileSync("git", ["show", "4b7a79b:prisma/schema.prisma"], { encoding: "utf8" });
  const schemaPath = path.join(directory, "baseline.prisma");
  await writeFile(schemaPath, baseline);
  const oldSql = execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-empty", "--to-schema", schemaPath, "--script"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  await client.connect();
  connected = true;
  const existing = await client.query("SELECT count(*)::int AS total FROM pg_tables WHERE schemaname='public'");
  if (existing.rows[0].total !== 0) throw new Error("Banco de teste deve estar vazio. Dados existentes nao serao apagados.");
  await client.query("BEGIN");
  transaction = true;
  await client.query(oldSql);
  await client.query(await readFile("tests/integration/horas-extras/historico.sql", "utf8"));
  await client.query(await readFile("prisma/migrations/20261017190000_horas_extras_campanhas_orcamento/migration.sql", "utf8"));
  await client.query(await readFile("prisma/migrations/20261017220000_horas_extras_fluxo_campanha/migration.sql", "utf8"));
  await client.query("COMMIT");
  transaction = false;
  process.stdout.write("Schema anterior, historico ficticio e migration aditiva aplicados em banco descartavel.\n");
} catch (error) {
  if (transaction) await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  if (connected) await client.end().catch(() => undefined);
  const resolvedDirectory = await realpath(directory);
  if (path.dirname(resolvedDirectory) !== tempParent || !path.basename(resolvedDirectory).startsWith("secp-he-schema-")) {
    throw new Error("Diretorio temporario fora do destino esperado; limpeza recusada.");
  }
  await rm(resolvedDirectory, { recursive: true, force: true });
}
