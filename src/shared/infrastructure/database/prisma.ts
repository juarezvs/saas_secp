import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não foi configurada no arquivo .env.");
}

const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function criarPrismaClient() {
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

function prismaClientEstaAtualizado(client?: PrismaClient): client is PrismaClient {
  if (!client) {
    return false;
  }

  return "notificacaoLeitura" in client && "documentoAutenticacao" in client;
}

export const prisma: PrismaClient =
  prismaClientEstaAtualizado(globalForPrisma.prisma)
    ? globalForPrisma.prisma
    : criarPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
