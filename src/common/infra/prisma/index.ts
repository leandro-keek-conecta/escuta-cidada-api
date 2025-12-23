import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.info("Database connected successfully with Prisma");
  } catch (error: unknown) {
    // Tipagem como unknown
    if (error instanceof Error) {
      console.error(`Could not connect to database: ${error.message}`);
    } else {
      console.error("An unknown error occurred.");
    }
  }
}

main();

export default prisma;