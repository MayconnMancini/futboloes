import { FastifyInstance } from "fastify"
import { prisma } from "../lib/prisma"

export async function usuarioRoutes(fastify: FastifyInstance) {


  fastify.get('/usuarios/count', async () => {
    const count = await prisma.usuario.count()

    return { count }
  });

}

