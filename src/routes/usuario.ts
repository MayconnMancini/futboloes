import { FastifyInstance } from "fastify"
import { prisma } from "../lib/prisma"
import { z } from "zod"
import { authenticate } from "../plugins/authenticate";

export async function usuarioRoutes(fastify: FastifyInstance) {


  fastify.get('/usuarios/count', async () => {
    const count = await prisma.usuario.count()

    return { count }
  });

  fastify.post('/updateUserInfo', { onRequest: [authenticate] }, async (request, reply) => {
    try {
      const signupBody = z.object({
        nome: z.string(),
        email: z.string().email(),
        cidade: z.string(),
        estado: z.string(),
        telefone: z.string(),
      })

      const { nome, email, cidade, estado, telefone } = signupBody.parse(request.body)

      let usuario = await prisma.usuario.findFirst({
        where: {
          email: email
        }
      })

      if (!usuario) {
        return reply.status(400).send({
          message: 'Email não cadastrado'
        })
      }

      if (usuario.id != parseInt(request.user.sub) && usuario.isAdmin == false) {
        return reply.status(400).send({
          message: 'Sem permissão para atualizar informações'
        })
      }

      await prisma.usuario.update({
        where: {
          email: email
        },
        data: {
          nome: nome,
          cidade: cidade,
          estado: estado,
          telefone: telefone
        }
      })

      return reply.status(201).send({
        message: "Informações do atualizadas com sucesso"
      })

    } catch (error) {
      return reply.status(500).send({
        message: `Erro interno do servidor -> ${error}`
      });
    }
  })

  fastify.get('/getUserInfo/:email', { onRequest: [authenticate] }, async (request, reply) => {
    try {
      const signupBody = z.object({
        email: z.string().email(),
      })

      const { email } = signupBody.parse(request.params)

      let usuario = await prisma.usuario.findFirst({
        where: {
          email: email
        }
      })

      if (!usuario) {
        return reply.status(400).send({
          message: 'Email não cadastrado'
        })
      }

      if (usuario.id != parseInt(request.user.sub) && request.user.isAdmin === false) {
        return reply.status(400).send({
          message: 'Sem permissão para vizualizar informações'
        })
      }

      return await prisma.usuario.findFirst({
        where: {
          email: email
        },
        select: {
          id: true,
          nome: true,
          email: true,
          cidade: true,
          estado: true,
          telefone: true,
          googleId: true,
          avatarUrl: true,
          isAdmin: true,
          createdAt: true,
        }
      })

    } catch (error) {
      return reply.status(500).send({
        message: `Erro interno do servidor -> ${error}`
      });
    }
  })

}

