import { PrismaClient } from "@prisma/client";

// cria instancia do prisma
export const prisma = new PrismaClient({
  log: ['query'],
})
