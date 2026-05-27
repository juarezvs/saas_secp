import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const matricula = "999001";
  const senha = "123456";

  const senhaHash = await bcrypt.hash(senha, 12);

  await prisma.usuario.update({
    where: {
      matricula,
    },
    data: {
      senhaHash,
      ativo: true,
    },
  });

  console.log(`Senha definida para matrícula ${matricula}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });