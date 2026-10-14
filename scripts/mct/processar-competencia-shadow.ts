import { processarCompetenciaShadow } from "@/modules/mct/application/services/processar-competencia-shadow.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

function argumento(nome: string) { const prefixo = `--${nome}=`; return process.argv.find((item) => item.startsWith(prefixo))?.slice(prefixo.length); }

async function main() {
  const matricula = argumento("matricula")?.trim().toUpperCase();
  const competencia = argumento("competencia")?.trim();
  if (!matricula || !competencia) throw new Error("Uso: npm run mct:shadow:competencia -- --matricula=AM200401 --competencia=2026-09 --confirmar");
  if (!process.argv.includes("--confirmar")) throw new Error("Inclua --confirmar para executar. Sem essa opção nada é gravado.");
  if (process.env.NODE_ENV === "production") throw new Error("Este comando é bloqueado quando NODE_ENV=production.");
  process.stdout.write(`${JSON.stringify(await processarCompetenciaShadow({ matricula, competencia }), null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }).finally(() => prisma.$disconnect());
